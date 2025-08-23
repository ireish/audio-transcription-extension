import express from 'express'
import http from 'http'
import { config } from './config'
import { logger } from './utils/logger'
import { routes } from './routes'
import { setupWebSocket } from './websocket-handler'

const app = express()

app.use(routes)

const server = http.createServer(app)

setupWebSocket(server)

server.listen(config.port, () => {
  logger.info(`Server listening on ${config.host}`)
  logger.info(`WebSocket server available at ${config.wsHost}/stream`)
})


