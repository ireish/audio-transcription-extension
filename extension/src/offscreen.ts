// Offscreen document: captures tab audio, runs AudioWorklet to downsample to
// 16 kHz mono PCM, transports frames via WS or chunked POST. Controlled via
// chrome.runtime messages from the side panel.

let audioContext: AudioContext | null = null
let ws: WebSocket | null = null
let transportMode: 'ws' | 'http' = 'ws'
let pendingBuffers: Float32Array[] = []
let httpFlushTimer: number | null = null
let workletNode: AudioWorkletNode | null = null
let mediaStream: MediaStream | null = null
let mediaSource: MediaStreamAudioSourceNode | null = null

async function ensureContext() {
  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: 48000 })
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
}

async function setupWorklet() {
  if (!audioContext) throw new Error('AudioContext not ready')
  try {
    await audioContext.audioWorklet.addModule('/pcm16k-processor.js')
  } catch {
    // fallback path if assets served differently
    await audioContext.audioWorklet.addModule('/pcm16k-processor.js')
  }
  workletNode = new AudioWorkletNode(audioContext, 'pcm16k-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1,
  })
  workletNode.port.onmessage = (ev: MessageEvent) => {
    const { type, payload } = ev.data || {}
    if (type === 'pcm') {
      onPcmFrame(payload as Float32Array)
    }
  }
}

function openWs(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    try {
      const socket = new WebSocket(url)
      socket.binaryType = 'arraybuffer'
      const timeout = setTimeout(() => {
        try { socket.close() } catch {}
        reject(new Error('WS timeout'))
      }, 8000)
      socket.onopen = () => { clearTimeout(timeout as any); resolve(socket) }
      socket.onerror = () => { clearTimeout(timeout as any); reject(new Error('WS error')) }
    } catch (e) {
      reject(e)
    }
  })
}

function floatTo16BitPCM(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

async function onPcmFrame(frame: Float32Array) {
  if (transportMode === 'ws' && ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(floatTo16BitPCM(frame))
      return
    } catch {}
  }
  // fallback to http batching
  pendingBuffers.push(frame)
  scheduleHttpFlush()
}

function scheduleHttpFlush() {
  if (httpFlushTimer != null) return
  httpFlushTimer = self.setTimeout(async () => {
    try {
      const frames = pendingBuffers.splice(0, pendingBuffers.length)
      if (frames.length === 0) return
      // concatenate into one buffer
      const total = frames.reduce((acc, f) => acc + f.length, 0)
      const merged = new Float32Array(total)
      let offset = 0
      for (const f of frames) { merged.set(f, offset); offset += f.length }
      const body = floatTo16BitPCM(merged)
      await fetch(currentBackend.httpUrl, { method: 'POST', body })
    } catch (e) {
      // swallow
    } finally {
      if (httpFlushTimer) { clearTimeout(httpFlushTimer); httpFlushTimer = null }
    }
  }, 1000)
}

let currentBackend = { wsUrl: '', httpUrl: '' }

// MODIFIED: This function now accepts the streamId from the service worker
async function startCaptureAndStream(backend: { wsUrl: string, httpUrl: string }, streamId: string) {
  stopAll();
  
  currentBackend = backend
  await ensureContext()
  await setupWorklet()

  // Attempt WS first
  try {
    ws = await openWs(backend.wsUrl)
    transportMode = 'ws'
  } catch {
    transportMode = 'http'
  }

  // MODIFIED: Use getUserMedia with the streamId to get the MediaStream
  if (!streamId) {
    throw new Error('No stream ID received from service worker.')
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    } as any, // Use 'as any' to satisfy TypeScript for this specific structure
    video: false,
  })
  mediaSource = audioContext!.createMediaStreamSource(mediaStream)
  mediaSource.connect(workletNode!)
  // To send audio back to speakers
  mediaSource.connect(audioContext!.destination);
}

function stopAll() {
  try { workletNode?.disconnect() } catch {}
  workletNode = null
  try { mediaSource?.disconnect() } catch {}
  mediaSource = null
  try { mediaStream?.getTracks().forEach(t => t.stop()) } catch {}
  mediaStream = null
  try { ws?.close() } catch {}
  ws = null
  pendingBuffers = []
  if (httpFlushTimer) { clearTimeout(httpFlushTimer); httpFlushTimer = null }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'offscreen') {
    return;
  }
  switch (message.type) {
    case 'START':
      startCaptureAndStream(message.backend, message.streamId).catch((e) => {
          // 🛠️ IMPROVE THIS ERROR LOG 🛠️
          // This will now print the specific error name and message.
          if (e instanceof DOMException) {
            console.error(`Offscreen start failed: ${e.name} - ${e.message}`);
          } else {
            console.error('Offscreen start failed', e);
          }
        }
      );
      break;
    case 'STOP':
      stopAll();
      break;
  }
});

// Send a message to the service worker to confirm that the offscreen document is ready.
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' });

export {}