import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT) || 3001,
  host: `http://localhost:${Number(process.env.PORT) || 3001}`,
  wsHost: `ws://localhost:${Number(process.env.PORT) || 3001}`
}
