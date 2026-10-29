import dotenv from 'dotenv'

dotenv.config()

function intFromEnv(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  // Number('') vaut 0 : un PORT vide dans .env faisait écouter le serveur sur un port aléatoire
  port: intFromEnv(process.env.PORT, 3000),
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  // Jeton plus court + revocation serveur (voir token_version) : limite la fenetre XSS.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // Toutes les dates metier (journee de caisse, recettes, cloture) sont exprimees
  // dans le fuseau des salles, pas dans celui du serveur.
  timezone: process.env.APP_TIMEZONE || 'Indian/Antananarivo',
  // Heure de fermeture (0-23). Les sessions encore actives sont cloturees
  // automatiquement a cette heure et marquees « a verifier ».
  closingHour: Math.min(23, Math.max(0, intFromEnv(process.env.CLOSING_HOUR, 23))),
  // Frequence du job de maintenance (minutes).
  maintenanceIntervalMinutes: Math.max(1, intFromEnv(process.env.MAINTENANCE_INTERVAL_MINUTES, 5)),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  db: {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gamecenter_db',
    password: process.env.DB_PASSWORD || '',
    port: intFromEnv(process.env.DB_PORT, 5432),
    options: `-c timezone=${process.env.APP_TIMEZONE || 'Indian/Antananarivo'}`,
  },
}
