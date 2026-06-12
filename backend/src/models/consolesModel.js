import { query } from '../config/db.js'

export async function listConsoles() {
  const { rows } = await query('SELECT * FROM consoles ORDER BY id ASC')
  return rows
}

export async function createConsole({ nom, marque, description }) {
  const { rows } = await query(
    'INSERT INTO consoles (nom, marque, description) VALUES ($1,$2,$3) RETURNING *',
    [nom, marque || null, description || null],
  )
  return rows[0]
}
