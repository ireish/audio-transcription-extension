import { v1p1beta1 as speech } from '@google-cloud/speech'

const encoding: 'LINEAR16' = 'LINEAR16'
const sampleRateHertz = 16000
const languageCode = 'en-US'
// The streamingRecognize method has a limit of 5 minutes of audio.
// We will restart the stream just before that.
const streamingLimit = 290000 // ms ~ 4.8 minutes

export class SpeechService {
  private client: speech.SpeechClient
  private recognizeStream: any = null // TODO: Type it properly later
  private restartCounter = 0
  private audioInput: Buffer[] = []
  private lastAudioInput: Buffer[] = []
  private resultEndTime = 0
  private isFinalEndTime = 0
  private finalRequestEndTime = 0
  private newStream = true
  private bridgingOffset = 0
  private lastTranscriptWasFinal = false
  private restartTimer: NodeJS.Timeout | null = null

  constructor () {
    this.client = new speech.SpeechClient()
    this.startStream = this.startStream.bind(this)
    this.speechCallback = this.speechCallback.bind(this)
    this.restartStream = this.restartStream.bind(this)
  }

  start () {
    console.log('Starting speech recognition stream...')
    this.startStream()
  }

  stop () {
    console.log('Stopping speech recognition stream.')
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    if (this.recognizeStream) {
      this.recognizeStream.end()
      this.recognizeStream.removeAllListeners()
      this.recognizeStream = null
    }
  }

  private startStream () {
    this.audioInput = []
    const request = {
      config: {
        encoding,
        sampleRateHertz,
        languageCode
      },
      interimResults: true
    }

    this.recognizeStream = this.client
      .streamingRecognize(request)
      .on('error', (err: any) => {
        if (err.code === 11) { // DEADLINE_EXCEEDED
          console.log('Streaming deadline exceeded. Restarting stream.')
          this.restartStream()
        } else {
          console.error('API request error', err)
          this.restartStream()
        }
      })
      .on('data', this.speechCallback)

    this.restartTimer = setTimeout(this.restartStream, streamingLimit)
  }

  private speechCallback (stream: any) {
    if (!stream.results[0]) {
      return
    }

    this.resultEndTime =
      stream.results[0].resultEndTime.seconds * 1000 +
      Math.round(stream.results[0].resultEndTime.nanos / 1000000)

    const correctedTime =
      this.resultEndTime - this.bridgingOffset + streamingLimit * this.restartCounter

    const transcript = stream.results[0].alternatives[0]
      ? stream.results[0].alternatives[0].transcript
      : ''

    if (stream.results[0].isFinal) {
      console.log(`[${correctedTime}ms] Final: ${transcript}`)
      this.isFinalEndTime = this.resultEndTime
      this.lastTranscriptWasFinal = true
    } else {
      process.stdout.write(`\r[${correctedTime}ms] Interim: ${transcript}`)
      this.lastTranscriptWasFinal = false
    }
  }

  private restartStream () {
    this.stop() // Clean up existing stream

    if (this.resultEndTime > 0) {
      this.finalRequestEndTime = this.isFinalEndTime
    }
    this.resultEndTime = 0

    this.lastAudioInput = this.audioInput
    this.restartCounter++

    if (!this.lastTranscriptWasFinal) {
      process.stdout.write('\n')
    }
    console.log(`\nRestarting stream request #${this.restartCounter}`)

    this.newStream = true

    this.startStream()
  }

  handleAudio (chunk: Buffer) {
    if (this.newStream && this.lastAudioInput.length !== 0) {
      const chunkTime = streamingLimit / this.lastAudioInput.length
      if (chunkTime !== 0) {
        if (this.bridgingOffset < 0) {
          this.bridgingOffset = 0
        }
        if (this.bridgingOffset > this.finalRequestEndTime) {
          this.bridgingOffset = this.finalRequestEndTime
        }
        const chunksFromMS = Math.floor(
          (this.finalRequestEndTime - this.bridgingOffset) / chunkTime
        )
        this.bridgingOffset = Math.floor(
          (this.lastAudioInput.length - chunksFromMS) * chunkTime
        )

        for (let i = chunksFromMS; i < this.lastAudioInput.length; i++) {
          if (this.recognizeStream) {
            try {
              this.recognizeStream.write(this.lastAudioInput[i])
            } catch (e) {
              console.error('Error writing to stream:', e)
            }
          }
        }
      }
      this.newStream = false
    }

    this.audioInput.push(chunk)

    if (this.recognizeStream) {
      try {
        this.recognizeStream.write(chunk)
      } catch (e) {
        console.error('Error writing to stream:', e)
      }
    }
  }
}
