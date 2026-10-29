export function formatAriary(amount) {
  const value = Number(amount) || 0
  return `${value.toLocaleString('fr-FR')} Ar`
}
