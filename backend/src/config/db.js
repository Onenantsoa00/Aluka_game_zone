import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

export const pool = new Pool(env.db)

pool.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.error('Erreur inattendue du pool PostgreSQL', error)
})

export async function query(text, params = []) {
  return pool.query(text, params)
}

/**
 * Execute une fonction dans une transaction. `fn` recoit un client pg ; toute
 * exception provoque un ROLLBACK. Indispensable pour demarrer/arreter une
 * session sans etat intermediaire (O1/O2).
 */
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      // eslint-disable-next-line no-console
      console.error('Echec du rollback', rollbackError)
    }
    throw error
  } finally {
    client.release()
  }
}
