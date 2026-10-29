import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, query } from '../src/config/db.js'

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../database/migrations',
)

async function run() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()
  const { rows } = await query('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((row) => row.name))

  for (const file of files) {
    if (applied.has(file)) {
      // eslint-disable-next-line no-console
      console.log(`= deja applique : ${file}`)
      continue
    }
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
    // eslint-disable-next-line no-console
    console.log(`> application : ${file}`)
    try {
      await query(sql)
      await query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Echec de la migration ${file}`, error)
      process.exitCode = 1
      return
    }
  }
}

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
