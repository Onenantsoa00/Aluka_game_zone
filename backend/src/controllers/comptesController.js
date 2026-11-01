import bcrypt from 'bcrypt'
import {
  createCompte,
  deactivateCompte,
  findCompteById,
  findRoleByName,
  listComptes,
  updateCompte,
  updateCompteActif,
} from '../models/comptesModel.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { httpError, translateDbError } from '../utils/errors.js'
import { createTrialForBoss } from '../services/abonnement.js'

const VALID_ROLES = ['admin', 'boss', 'jeton']

/** Cloisonnement (O4) : le boss ne voit que son compte et ses jetons. */
export async function getComptes(req, res) {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200))
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const rows = await listComptes({
    ownerId: req.user.role === 'boss' ? req.user.id : null,
    limit,
    offset,
  })
  return res.json(rows)
}

function assertRoleCreatable(req, role) {
  if (!VALID_ROLES.includes(role)) throw httpError(400, 'Role invalide')
  if (req.user.role === 'boss' && role !== 'jeton') {
    throw httpError(403, 'Un boss ne peut creer que des comptes jeton')
  }
}

function assertCanManage(req, compte) {
  if (!compte) throw httpError(404, 'Compte introuvable')
  if (
    req.user.role === 'boss' &&
    compte.cree_par !== req.user.id &&
    compte.id !== req.user.id
  ) {
    throw httpError(403, 'Ce compte ne vous appartient pas')
  }
}

export async function postCompte(req, res) {
  const { nom, username, motDePasse, telephone, role, creePar } = req.body || {}
  if (!nom?.trim() || !username?.trim()) throw httpError(400, 'Nom et identifiant requis')
  if (!motDePasse || String(motDePasse).length < 6) {
    throw httpError(400, 'Mot de passe requis (6 caracteres minimum)')
  }
  assertRoleCreatable(req, role)

  const roleRow = await findRoleByName(role)
  if (!roleRow) throw httpError(400, 'Role invalide')

  const hash = await bcrypt.hash(motDePasse, 10)
  let created
  try {
    created = await createCompte({
      nom: nom.trim(),
      username: username.trim(),
      hash,
      telephone,
      roleId: roleRow.id,
      creePar: req.user.role === 'boss' ? req.user.id : creePar || req.user.id,
    })
  } catch (error) {
    throw translateDbError(error)
  }

  // Chaque nouveau boss demarre son essai gratuit de 7 jours (P2.11).
  if (role === 'boss') await createTrialForBoss(created.id)

  await logAudit({
    userId: req.user.id,
    action: 'compte.create',
    entite: 'utilisateur',
    entiteId: created.id,
    details: { username: created.username, role },
    ip: clientIp(req),
  })
  return res.status(201).json(created)
}

export async function putCompte(req, res) {
  const compte = await findCompteById(req.params.id)
  assertCanManage(req, compte)

  const { nom, telephone, role, motDePasse } = req.body || {}
  let roleId = null
  if (role) {
    assertRoleCreatable(req, role)
    const roleRow = await findRoleByName(role)
    if (!roleRow) throw httpError(400, 'Role invalide')
    roleId = roleRow.id
  }
  if (telephone !== undefined && telephone !== null && String(telephone).length > 20) {
    throw httpError(400, 'Telephone trop long')
  }
  if (motDePasse !== undefined && motDePasse !== null && motDePasse !== '') {
    if (String(motDePasse).length < 6) {
      throw httpError(400, 'Mot de passe trop court (6 caracteres minimum)')
    }
  }

  const hash = motDePasse ? await bcrypt.hash(motDePasse, 10) : null
  let updated
  try {
    updated = await updateCompte({ id: compte.id, nom, telephone, roleId, hash })
  } catch (error) {
    throw translateDbError(error)
  }

  await logAudit({
    userId: req.user.id,
    action: 'compte.update',
    entite: 'utilisateur',
    entiteId: compte.id,
    details: { role: role || compte.role, passwordReset: Boolean(hash) },
    ip: clientIp(req),
  })
  return res.json(updated)
}

export async function patchCompteActif(req, res) {
  const compte = await findCompteById(req.params.id)
  if (!compte) throw httpError(404, 'Compte introuvable')
  if (req.user.role === 'boss' && (compte.cree_par !== req.user.id || compte.role !== 'jeton')) {
    throw httpError(403, 'Ce compte ne vous appartient pas')
  }
  if (compte.id === req.user.id && req.body.actif === false) {
    throw httpError(400, 'Impossible de desactiver son propre compte')
  }
  const row = await updateCompteActif(req.params.id, Boolean(req.body.actif))
  await logAudit({
    userId: req.user.id,
    action: req.body.actif ? 'compte.unblock' : 'compte.block',
    entite: 'utilisateur',
    entiteId: compte.id,
    ip: clientIp(req),
  })
  return res.json(row)
}

export async function deleteCompte(req, res) {
  const compte = await findCompteById(req.params.id)
  assertCanManage(req, compte)
  if (compte.id === req.user.id) throw httpError(400, 'Impossible de supprimer son propre compte')

  const row = await deactivateCompte(compte.id)
  await logAudit({
    userId: req.user.id,
    action: 'compte.delete',
    entite: 'utilisateur',
    entiteId: compte.id,
    details: { username: compte.username },
    ip: clientIp(req),
  })
  return res.json(row)
}
