import { listAudit } from '../models/auditModel.js'

export async function getAudit(req, res) {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100))
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const rows = await listAudit({ limit, offset, action: req.query.action || null })
  return res.json(rows)
}
