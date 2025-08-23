import { WebSocketServer, WebSocket, RawData } from 'ws'
import { SpeechService } from './speech-service'
import { logger } from './utils/logger'
import http from 'http'

export function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/stream' })

  wss.on('connection', (socket: WebSocket) => {
    logger.info('[WS] client connected')
    const speechService = new SpeechService(data => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data))
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
          logger.info({ msg }, '[WS] json')
        } catch {
          logger.info(`[WS] text: ${data.toString()}`)
        }
      }
    })
    socket.on('close', () => {
      logger.info('[WS] client disconnected')
      speechService.stop()
    })
    socket.on('error', (e: Error) => {
      logger.error(e, '[WS] error')
      speechService.stop()
    })
  })
}
