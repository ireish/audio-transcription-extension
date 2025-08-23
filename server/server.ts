import express from 'express'
import http from 'http'
import { config } from './config'
import { logger } from './utils/logger'
import { routes } from './routes'
import { setupWebSocket } from './websocket-handler'

const app = express()

// Allow CORS from all origins for health/upload endpoints
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.use(routes)

const server = http.createServer(app)

setupWebSocket(server)

server.listen(config.port, () => {
  logger.info(`Server listening on ${config.host}`)
  logger.info(`WebSocket server available at ${config.wsHost}/stream`)
})


