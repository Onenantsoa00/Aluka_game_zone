import http from 'node:http'
import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { pool, query } from './config/db.js'
import { initRealtime } from './realtime.js'
import { startMaintenance, stopMaintenance } from './services/maintenance.js'
import { requireAuth } from './middleware/auth.js'
import { requireSubscription } from './middleware/subscription.js'
import { translateDbError } from './utils/errors.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import comptesRoutes from './routes/comptes.js'
import sallesRoutes from './routes/salles.js'
import postesRoutes from './routes/postes.js'
import jeuxRoutes from './routes/jeux.js'
import sessionsRoutes from './routes/sessions.js'
import materielsRoutes from './routes/materiels.js'
import tournoisRoutes from './routes/tournois.js'
import abonnementsRoutes from './routes/abonnements.js'
import consolesRoutes from './routes/consoles.js'
import paiementsRoutes from './routes/paiements.js'
import rapportsRoutes from './routes/rapports.js'
import auditRoutes from './routes/audit.js'
import reservationsRoutes from './routes/reservations.js'
import fileAttenteRoutes from './routes/file-attente.js'
import monAbonnementRoutes from './routes/mon-abonnement.js'

const app = express()

app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((v) => v.trim()),
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1')
    return res.json({
      ok: true,
      uptime: Math.round(process.uptime()),
      timezone: env.timezone,
      closingHour: env.closingHour,
      now: new Date().toISOString(),
    })
  } catch {
    return res.status(503).json({ ok: false, database: 'unreachable' })
  }
})

app.use('/api/auth', authRoutes)

app.use('/api', requireAuth)

// Facturation : accessible meme si l'abonnement est expire (sinon impossible
// de regulariser). Toutes les autres routes metier sont bloquees en 402.
app.use('/api/mon-abonnement', monAbonnementRoutes)
app.use('/api/abonnements', abonnementsRoutes)

app.use('/api/dashboard', requireSubscription, dashboardRoutes)
app.use('/api/comptes', requireSubscription, comptesRoutes)
app.use('/api/salles', requireSubscription, sallesRoutes)
app.use('/api/postes', requireSubscription, postesRoutes)
app.use('/api/jeux', requireSubscription, jeuxRoutes)
app.use('/api/sessions', requireSubscription, sessionsRoutes)
app.use('/api/materiels', requireSubscription, materielsRoutes)
app.use('/api/tournois', requireSubscription, tournoisRoutes)
app.use('/api/consoles', requireSubscription, consolesRoutes)
app.use('/api/paiements', requireSubscription, paiementsRoutes)
app.use('/api/rapports', requireSubscription, rapportsRoutes)
app.use('/api/audit', requireSubscription, auditRoutes)
app.use('/api/reservations', requireSubscription, reservationsRoutes)
app.use('/api/file-attente', requireSubscription, fileAttenteRoutes)

app.use('/api', (_req, res) => res.status(404).json({ message: 'Route introuvable' }))

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Corps de requete JSON invalide' })
  }
  const normalized = translateDbError(error)
  const statusCode = normalized.statusCode || 500
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('Erreur serveur', error)
  }
  res.status(statusCode).json({
    message:
      statusCode >= 500 && !normalized.statusCode
        ? 'Erreur serveur'
        : normalized.message || 'Erreur serveur',
  })
})

const server = http.createServer(app)
initRealtime(server)

async function start() {
  try {
    await query('SELECT 1')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Echec demarrage serveur', error)
    if (error && error.code === '28P01') {
      // eslint-disable-next-line no-console
      console.error('Authentification échouée pour la base de données.')
      // eslint-disable-next-line no-console
      console.error(
        "Vérifiez `DB_USER` et `DB_PASSWORD` dans backend/.env et que l'utilisateur existe.",
      )
    }
    process.exit(1)
  }

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend pret sur http://localhost:${env.port} (${env.timezone})`)
    startMaintenance()
  })
}

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`${signal} recu : arret du serveur`)
  stopMaintenance()
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  // Filet de securite si des connexions restent ouvertes.
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Echec demarrage serveur', error)
  process.exit(1)
})

export default app
