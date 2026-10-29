-- Migration 002 — precision des fractions (O7)
BEGIN;

ALTER TABLE modeles_paiement_jeton
  ALTER COLUMN valeur TYPE DECIMAL(12, 4);

-- 0.33 etait un arrondi de 1/3 stocke en DECIMAL(10,2) : on restaure la part exacte.
UPDATE modeles_paiement_jeton
SET valeur = ROUND(1.0 / 3, 4)
WHERE type_modele = 'fraction' AND ROUND(valeur, 2) = 0.33;

COMMIT;
