export function computeAmountByTarif(elapsedMinutes, tarifMinutes, tarifPrix) {
  if (elapsedMinutes <= 0 || tarifMinutes <= 0) return 0
  return (elapsedMinutes / tarifMinutes) * tarifPrix
}

export function computeRemboursement(totalMinutesPaid, elapsedMinutes, tarifMinutes, tarifPrix) {
  const paid = computeAmountByTarif(totalMinutesPaid, tarifMinutes, tarifPrix)
  const consumed = computeAmountByTarif(elapsedMinutes, tarifMinutes, tarifPrix)
  return Math.max(0, paid - consumed)
}
