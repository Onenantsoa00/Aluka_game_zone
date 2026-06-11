import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { findUserForLogin, findUserProfileById } from '../models/authModel.js'

export async function login(req, res) {
  const { username, motDePasse } = req.body
  const user = await findUserForLogin(username)
  if (!user || !user.actif) return res.status(401).json({ message: 'Identifiants invalides' })

  const ok = await bcrypt.compare(motDePasse, user.mot_de_passe)
  if (!ok) return res.status(401).json({ message: 'Identifiants invalides' })

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, env.jwtSecret, {
    expiresIn: '12h',
  })
  return res.json({
    token,
    user: { id: user.id, nom: user.nom, username: user.username, role: user.role },
  })
}

export async function me(req, res) {
  const user = await findUserProfileById(req.user.id)
  return res.json(user)
}
