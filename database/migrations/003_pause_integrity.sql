-- Migration 003 — integrite des pauses historiques (O5)
-- L'ancien code pouvait arreter une session sans refermer sa pause ; le temps
-- de pause etait alors compte jusqu'a la date de la correction. On borne
-- chaque pause a l'heure de fin reelle de la session.
BEGIN;

UPDATE pauses_sessions pa
SET fin_pause = sj.heure_fin,
    duree_pause = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (sj.heure_fin - pa.debut_pause)) / 60))
FROM sessions_jeux sj
WHERE pa.session_id = sj.id
  AND sj.heure_fin IS NOT NULL
  AND (pa.fin_pause IS NULL OR pa.fin_pause > sj.heure_fin);

-- Recalcule la duree reelle des sessions terminees a partir des pauses corrigees.
UPDATE sessions_jeux sj
SET duree_reelle = GREATEST(
  0,
  ROUND(EXTRACT(EPOCH FROM (sj.heure_fin - sj.heure_debut)) / 60)::int
    - COALESCE((SELECT SUM(pa.duree_pause)::int FROM pauses_sessions pa WHERE pa.session_id = sj.id), 0)
)
WHERE sj.statut = 'terminee' AND sj.heure_fin IS NOT NULL;

COMMIT;
