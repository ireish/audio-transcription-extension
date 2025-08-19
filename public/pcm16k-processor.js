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

    // Simple decimation with linear interpolation to 16k
    const out = []
    for (let i = 0; i < channel.length; i++) {
      const pos = this.phase + i
      const targetIndex = pos / this.resampleRatio
      const idx = Math.floor(targetIndex)
      const frac = targetIndex - idx
      const a = channel[idx] ?? channel[channel.length - 1]
      const b = channel[idx + 1] ?? a
      out.push(a + (b - a) * frac)
    }
    this.phase += channel.length

    // Downsample by taking every resampleRatio-th sample to approximate 16k
    const stride = Math.max(1, Math.floor(this.resampleRatio))
    const down = new Float32Array(Math.ceil(out.length / stride))
    for (let i = 0, j = 0; i < out.length; i += stride, j++) {
      down[j] = out[i]
    }

    this.port.postMessage({ type: 'pcm', payload: down }, [down.buffer])
    return true
  }
}

registerProcessor('pcm16k-processor', PCM16kProcessor)


