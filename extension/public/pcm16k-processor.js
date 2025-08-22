// @ts-nocheck

// Speech recognition and AI models optimized to work with a 16kHz sample rate.
// Downsampling the audio to 16kHz makes it compatible with these systems and reduces the data rate

// AudioWorkletProcessor runs in a separate thread from the main JS thread,
// ensuring that the audio processing & downsampling does not cause the main thread to freeze.

class PCM16kProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = []
    this.resampleRatio = sampleRate / 16000
    this.phase = 0
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) return true
    const channel = input[0]
    if (!channel) return true

    // Downsample by averaging groups of samples.
    // This is a simple and effective way to resample.
    const out = new Float32Array(Math.ceil(channel.length / this.resampleRatio))

    for (let i = 0, j = 0; i < channel.length; j++) {
      let sum = 0
      let count = 0
      for (let k = 0; k < this.resampleRatio && i < channel.length; k++, i++) {
        sum += channel[i]
        count++
      }
      out[j] = sum / count
    }

    this.port.postMessage({ type: 'pcm', payload: out }, [out.buffer])
    return true
  }
}

registerProcessor('pcm16k-processor', PCM16kProcessor)


