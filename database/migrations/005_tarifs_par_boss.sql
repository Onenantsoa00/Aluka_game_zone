-- Migration 005 — unicite des tarifs par boss (P2.11)
-- Le tarif plateforme (boss_id NULL) et le tarif d'un boss peuvent partager
-- la meme duree pour une console : l'index doit inclure le proprietaire.
BEGIN;

DROP INDEX IF EXISTS tarifications_console_duree_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS tarifications_console_duree_boss_uniq
  ON tarifications (console_id, duree_minutes, COALESCE(boss_id, 0))
  WHERE actif = TRUE;

COMMIT;
