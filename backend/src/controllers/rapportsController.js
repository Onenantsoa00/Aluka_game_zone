import { getRapportZ } from '../models/rapportsModel.js'
import { formatAriary } from '../utils/format.js'
import { logAudit } from '../utils/audit.js'
import { httpError } from '../utils/errors.js'

function resolveDate(value) {
  const date = value || new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpError(400, 'Date invalide (AAAA-MM-JJ)')
  return date
}

export async function getZ(req, res) {
  const date = resolveDate(req.query.date)
  const rapport = await getRapportZ(date)
  return res.json({
    ...rapport,
    generePar: req.user.username,
    genereeLe: new Date().toISOString(),
  })
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function toCsv(rapport) {
  const lines = []
  const push = (...cells) => lines.push(cells.map(csvEscape).join(';'))

  push('Rapport de caisse (Z)', rapport.date)
  push('Genere le', new Date().toISOString())
  push()
  push('Recapitulatif')
  push('Encaissements', rapport.encaissements)
  push('Remboursements', rapport.remboursements)
  push('Net', rapport.net)
  push('Operations', rapport.operations)
  push('Sessions cloturees', rapport.sessionsCloturees)
  push('Minutes jouees', rapport.minutesJouees)
  push('Sessions a verifier', rapport.sessionsAVerifier)
  push()
  push('Par caissier', 'Encaisse', 'Rembourse', 'Net', 'Operations')
  for (const row of rapport.parCaissier) {
    push(row.caissier, row.encaisse, row.rembourse, row.net, row.operations)
  }
  push()
  push('Par salle', 'Net')
  for (const row of rapport.parSalle) {
    push(row.salle, row.net)
  }
  return lines.join('\n')
}

export async function getZCsv(req, res) {
  const date = resolveDate(req.query.date)
  const rapport = await getRapportZ(date)
  await logAudit({
    userId: req.user.id,
    action: 'rapport.z.export',
    entite: 'rapport',
    details: { date },
  })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="caisse-${date}.csv"`)
  // BOM pour qu'Excel ouvre correctement les accents.
  return res.send(`\uFEFF${toCsv(rapport)}`)
}

export async function getZTicket(req, res) {
  const date = resolveDate(req.query.date)
  const rapport = await getRapportZ(date)
  const lignes = [
    '================================',
    '   ALUKA GAME ZONE - CAISSE Z',
    `   ${date}`,
    '================================',
    `Encaissements : ${formatAriary(rapport.encaissements)}`,
    `Remboursements: ${formatAriary(rapport.remboursements)}`,
    `NET           : ${formatAriary(rapport.net)}`,
    `Operations    : ${rapport.operations}`,
    `Sessions      : ${rapport.sessionsCloturees}`,
    `Minutes jouees: ${rapport.minutesJouees}`,
    `A verifier    : ${rapport.sessionsAVerifier}`,
    '--------------------------------',
    'Par caissier',
    ...rapport.parCaissier.map(
      (row) => `${row.caissier}: ${formatAriary(row.net)} (${row.operations} op.)`,
    ),
    '--------------------------------',
    `Edite par ${req.user.username}`,
  ]
  return res.json({ ticket: lignes.join('\n'), ...rapport })
}
