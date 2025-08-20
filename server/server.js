const express = require('express')
const http = require('http')
const { WebSocketServer } = require('ws')

const PORT = process.env.PORT || 3001

const app = express()

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Raw PCM or containerized audio upload via POST body
app.post('/upload', express.raw({ type: '*/*', limit: '25mb' }), (req, res) => {
  try {
    const buf = req.body
    if (!buf || buf.length === 0) {
      return res.status(400).json({ error: 'empty body' })
    }
    // TODO: forward to STT or write to disk
    console.log(`[UPLOAD] Received ${buf.length} bytes`)
    res.json({ ok: true, bytes: buf.length })
  } catch (e) {
    console.error('Upload error', e)
    res.status(500).json({ error: 'upload failed' })
  }
})

const server = http.createServer(app)

// WebSocket server for streaming audio frames
const wss = new WebSocketServer({ server, path: '/stream' })

wss.on('connection', (socket) => {
  console.log('[WS] client connected')
  socket.on('message', (data, isBinary) => {
    if (isBinary) {
      // Binary frames: raw PCM16LE frames from offscreen
      console.log(`[WS] binary frame: ${data.length} bytes`)
      // TODO: feed into STT engine
    } else {
      // JSON control frames
      try {
        const msg = JSON.parse(data.toString())
        console.log('[WS] json', msg)
      } catch {
        console.log('[WS] text', data.toString())
      }
    }
  })
  socket.on('close', () => console.log('[WS] client disconnected'))
  socket.on('error', (e) => console.error('[WS] error', e))
})

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})


