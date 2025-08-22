// NOTE: Before running, ensure you have authenticated with Google Cloud CLI and
// set up your project. For example, by running:
// `gcloud auth application-default login`
// and setting your project with:
// `gcloud config set project YOUR_PROJECT_ID`
// The Google Cloud client libraries use these credentials to authenticate.

import { v1p1beta1 as speech } from '@google-cloud/speech';
import chalk from 'chalk';

const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US';
const streamingLimit = 290000; // ms - ~5 minutes

export class SpeechToTextService {
  private client: speech.SpeechClient;

  private config = {
    encoding,
    sampleRateHertz,
    languageCode,
  };

  private request = {
    config: this.config,
    interimResults: true,
  };

  private recognizeStream: any = null; // Type: ClientDuplexStream<StreamingRecognizeRequest>
  private restartCounter = 0;
  private audioInput: Buffer[] = [];
  private lastAudioInput: Buffer[] = [];
  private resultEndTime = 0;
  private isFinalEndTime = 0;
  private finalRequestEndTime = 0;
  private newStream = true;
  private bridgingOffset = 0;
  private lastTranscriptWasFinal = false;
  private streamTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.client = new speech.SpeechClient();
  }

  public startStreaming() {
    this.audioInput = [];
    this.recognizeStream = this.client
      .streamingRecognize(this.request)
      .on('error', (err: any) => {
        if (err.code === 11) {
          // Restart stream in case of deadline exceeded
          this.restartStream();
        } else {
          console.error('API request error ' + err);
        }
      })
      .on('data', this.speechCallback.bind(this));

    this.streamTimeout = setTimeout(() => this.restartStream(), streamingLimit);
  }

  public sendAudio(chunk: Buffer) {
    if (this.newStream && this.lastAudioInput.length !== 0) {
      const chunkTime = streamingLimit / this.lastAudioInput.length;
      if (chunkTime !== 0) {
        if (this.bridgingOffset < 0) {
          this.bridgingOffset = 0;
        }
        if (this.bridgingOffset > this.finalRequestEndTime) {
          this.bridgingOffset = this.finalRequestEndTime;
        }
        const chunksFromMS = Math.floor(
          (this.finalRequestEndTime - this.bridgingOffset) / chunkTime
        );
        this.bridgingOffset = Math.floor(
          (this.lastAudioInput.length - chunksFromMS) * chunkTime
        );

        for (let i = chunksFromMS; i < this.lastAudioInput.length; i++) {
          this.recognizeStream.write(this.lastAudioInput[i]);
        }
      }
      this.newStream = false;
    }

    this.audioInput.push(chunk);

    if (this.recognizeStream) {
      this.recognizeStream.write(chunk);
    }
  }

  public stopStreaming() {
    if (this.streamTimeout) {
        clearTimeout(this.streamTimeout);
        this.streamTimeout = null;
    }
    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream = null;
    }
  }

  private speechCallback(stream: any) {
    if (!stream.results[0]) {
      return;
    }
    this.resultEndTime =
      stream.results[0].resultEndTime.seconds * 1000 +
      Math.round(stream.results[0].resultEndTime.nanos / 1000000);

    const correctedTime =
      this.resultEndTime - this.bridgingOffset + streamingLimit * this.restartCounter;

    let stdoutText = '';
    if (stream.results[0] && stream.results[0].alternatives[0]) {
      stdoutText = `${correctedTime}ms: ${stream.results[0].alternatives[0].transcript}`;
    }

    if (stream.results[0].isFinal) {
      console.log(chalk.green(stdoutText));
      this.isFinalEndTime = this.resultEndTime;
      this.lastTranscriptWasFinal = true;
    } else {
      // console.log(chalk.red(stdoutText)); // Omit interim results for cleaner logs
      this.lastTranscriptWasFinal = false;
    }
  }

  private restartStream() {
    this.stopStreaming();

    if (this.resultEndTime > 0) {
      this.finalRequestEndTime = this.isFinalEndTime;
    }
    this.resultEndTime = 0;

    this.lastAudioInput = this.audioInput;
    this.restartCounter++;

    if (!this.lastTranscriptWasFinal) {
      process.stdout.write('\n');
    }
    process.stdout.write(
      chalk.yellow(
        `${streamingLimit * this.restartCounter}ms: RESTARTING REQUEST\n`
      )
    );

    this.newStream = true;

    this.startStreaming();
  }
}
