import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import {
  findUserForLogin,
  findUserProfileById,
  incrementTokenVersion,
} from '../models/authModel.js'
import { clientIp, logAudit } from '../utils/audit.js'
import { getEtatAbonnement } from '../services/abonnement.js'

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, ver: user.token_version },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )
}

function tenantOf(user) {
  if (user.role === 'admin') return null
  return user.role === 'boss' ? user.id : (user.cree_par ?? -1)
}

async function abonnementOf(user) {
  if (user.role === 'admin') return null
  return getEtatAbonnement(tenantOf(user))
}

export async function login(req, res) {
  const { username, motDePasse } = req.body || {}
  if (!username || !motDePasse) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis' })
  }

  const user = await findUserForLogin(username)
  if (!user || !user.actif) return res.status(401).json({ message: 'Identifiants invalides' })

  const ok = await bcrypt.compare(motDePasse, user.mot_de_passe)
  if (!ok) return res.status(401).json({ message: 'Identifiants invalides' })

  await logAudit({
    userId: user.id,
    action: 'login',
    entite: 'utilisateur',
    entiteId: user.id,
    ip: clientIp(req),
  })

  return res.json({
    token: signToken(user),
    expiresIn: env.jwtExpiresIn,
    user: { id: user.id, nom: user.nom, username: user.username, role: user.role },
    abonnement: await abonnementOf(user),
  })
}

/** Renouvelle un jeton encore valide sans redemander le mot de passe. */
export async function refresh(req, res) {
  const user = await findUserProfileById(req.user.id)
  if (!user || !user.actif) return res.status(401).json({ message: 'Compte desactive' })
  return res.json({
    token: signToken(user),
    expiresIn: env.jwtExpiresIn,
    user: { id: user.id, nom: user.nom, username: user.username, role: user.role },
    abonnement: await abonnementOf(user),
  })
}

export async function me(req, res) {
  const user = await findUserProfileById(req.user.id)
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
  const { token_version: _tokenVersion, cree_par: _creePar, ...profile } = user
  return res.json({
    ...profile,
    abonnement: await abonnementOf(user),
  })
}

/** Revoque tous les jetons du compte (deconnexion). */
export async function logout(req, res) {
  await incrementTokenVersion(req.user.id)
  await logAudit({
    userId: req.user.id,
    action: 'logout',
    entite: 'utilisateur',
    entiteId: req.user.id,
    ip: clientIp(req),
  })
  return res.json({ ok: true })
}
