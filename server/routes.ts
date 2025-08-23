import express, { Router, Request, Response } from 'express'
import { logger } from './utils/logger'

const router = Router()

// Health endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// Raw PCM or containerized audio upload via POST body
router.post(
  '/upload',
  express.raw({ type: '*/*', limit: '25mb' }),
  (req: Request, res: Response) => {
    try {
      const buf = req.body as Buffer
      if (!buf || buf.length === 0) {
        return res.status(400).json({ error: 'empty body' })
      }
      // TODO: forward to STT or write to disk
      logger.info(`[UPLOAD] Received ${buf.length} bytes`)
      res.json({ ok: true, bytes: buf.length })
    } catch (e) {
      logger.error(e, 'Upload error')
      res.status(500).json({ error: 'upload failed' })
    }
  }
)

export { router as routes }
