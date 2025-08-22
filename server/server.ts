import 'dotenv/config'
import express, { Request, Response } from 'express'
import http from 'http'
import { WebSocketServer, WebSocket, RawData } from 'ws'
import { SpeechService } from './speech-service'

const PORT = Number(process.env.PORT) || 3001

const app = express()

// Health endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// Raw PCM or containerized audio upload via POST body
app.post('/upload', express.raw({ type: '*/*', limit: '25mb' }), (req: Request, res: Response) => {
  try {
    const buf = req.body as Buffer
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

wss.on('connection', (socket: WebSocket) => {
  console.log('[WS] client connected')
  const speechService = new SpeechService((data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  })
  speechService.start()

  socket.on('message', (data: RawData, isBinary: boolean) => {
    if (isBinary) {
      // Binary frames: raw PCM16LE frames from offscreen
      speechService.handleAudio(data as Buffer)
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
  socket.on('close', () => {
    console.log('[WS] client disconnected')
    speechService.stop()
  })
  socket.on('error', (e: Error) => {
    console.error('[WS] error', e)
    speechService.stop()
  })
})

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
  console.log(`WebSocket server available at ws://localhost:${PORT}/stream`)
})


