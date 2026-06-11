import bcrypt from 'bcrypt'
import {
  createCompte,
  findRoleByName,
  listComptes,
  updateCompteActif,
} from '../models/comptesModel.js'

export async function getComptes(req, res) {
  const rows = await listComptes()
  return res.json(rows)
}

export async function postCompte(req, res) {
  const { nom, username, motDePasse, telephone, role, creePar } = req.body
  const roleRow = await findRoleByName(role)
  if (!roleRow) return res.status(400).json({ message: 'Role invalide' })
  if (req.user.role === 'boss' && role !== 'jeton') {
    return res.status(403).json({ message: 'Un boss ne peut creer que des comptes jeton' })
  }

  const hash = await bcrypt.hash(motDePasse, 10)
  const created = await createCompte({
    nom,
    username,
    hash,
    telephone,
    roleId: roleRow.id,
    creePar: creePar || req.user.id,
  })
  return res.status(201).json(created)
}

export async function patchCompteActif(req, res) {
  const row = await updateCompteActif(req.params.id, req.body.actif)
  return res.json(row)
}
