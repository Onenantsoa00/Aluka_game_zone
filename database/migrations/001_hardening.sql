-- Migration 001 — durcissement (bugs O1, O6, O7, O11, O14 et P1)
-- Idempotente : peut être rejouée sans casser la base.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Colonnes manquantes
-- ---------------------------------------------------------------------------
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jeux ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE sessions_jeux ADD COLUMN IF NOT EXISTS a_verifier BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sessions_jeux ADD COLUMN IF NOT EXISTS verifie_par INTEGER REFERENCES utilisateurs(id);
ALTER TABLE sessions_jeux ADD COLUMN IF NOT EXISTS verifie_at TIMESTAMP;

-- ---------------------------------------------------------------------------
-- 2. Dédoublonnage des noms de postes (O11) avant la contrainte d'unicité
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         nom_poste,
         ROW_NUMBER() OVER (PARTITION BY salle_id, lower(nom_poste) ORDER BY id) AS rn
  FROM postes
  WHERE actif = TRUE
)
UPDATE postes p
SET nom_poste = p.nom_poste || ' #' || r.rn
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

-- ---------------------------------------------------------------------------
-- 3. Une seule session active par poste (O1) : on clôture les doublons en les
--    marquant « à vérifier » plutôt qu'en supprimant des données.
-- ---------------------------------------------------------------------------
WITH actives AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY poste_id ORDER BY id) AS rn
  FROM sessions_jeux
  WHERE statut IN ('en_cours', 'pause')
)
UPDATE sessions_jeux sj
SET statut = 'terminee',
    heure_fin = COALESCE(sj.heure_fin, CURRENT_TIMESTAMP),
    a_verifier = TRUE
FROM actives a
WHERE a.id = sj.id AND a.rn > 1;

-- Les pauses encore ouvertes d'une session terminée sont refermées.
UPDATE pauses_sessions pa
SET fin_pause = CURRENT_TIMESTAMP,
    duree_pause = ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pa.debut_pause)) / 60)
WHERE pa.fin_pause IS NULL
  AND EXISTS (
    SELECT 1 FROM sessions_jeux sj
    WHERE sj.id = pa.session_id AND sj.statut NOT IN ('en_cours', 'pause')
  );

-- Les durées de pause historiques arrondies à 0 sont recalculées.
UPDATE pauses_sessions
SET duree_pause = ROUND(EXTRACT(EPOCH FROM (fin_pause - debut_pause)) / 60)
WHERE fin_pause IS NOT NULL
  AND duree_pause = 0
  AND EXTRACT(EPOCH FROM (fin_pause - debut_pause)) >= 30;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_jeux_active_poste_uniq
  ON sessions_jeux (poste_id)
  WHERE statut IN ('en_cours', 'pause');

CREATE UNIQUE INDEX IF NOT EXISTS postes_nom_par_salle_uniq
  ON postes (salle_id, lower(nom_poste))
  WHERE actif = TRUE;

-- ---------------------------------------------------------------------------
-- 4. Contraintes métier (O7, O2)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE sessions_jeux ADD CONSTRAINT sessions_jeux_statut_check
    CHECK (statut IN ('en_cours', 'pause', 'terminee', 'annulee'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
    CHECK (type_transaction IN ('encaissement', 'remboursement'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Doublons de tarifs (meme console + meme duree) : on desactive les plus recents.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY console_id, duree_minutes ORDER BY id) AS rn
  FROM tarifications
  WHERE actif = TRUE
)
UPDATE tarifications t
SET actif = FALSE
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS tarifications_console_duree_uniq
  ON tarifications (console_id, duree_minutes)
  WHERE actif = TRUE;

-- ---------------------------------------------------------------------------
-- 5. Modèles de paiement : alignement des libellés sur le front (O7)
-- ---------------------------------------------------------------------------
UPDATE modeles_paiement_jeton SET type_modele = 'fixe_journalier'
WHERE type_modele IN ('fixe', 'prime');

UPDATE modeles_paiement_jeton SET type_modele = 'pourcentage_seuil'
WHERE type_modele = 'pourcentage' AND seuil IS NOT NULL;

-- « 33 % » n'est pas 1/3 : on corrige le modèle historique.
UPDATE modeles_paiement_jeton
SET type_modele = 'fraction',
    valeur = ROUND(1.0 / 3, 4),
    nom_modele = 'Tiers recette'
WHERE type_modele = 'pourcentage' AND seuil IS NULL AND valeur = 33.00;

DO $$
BEGIN
  ALTER TABLE modeles_paiement_jeton ADD CONSTRAINT modeles_paiement_type_check
    CHECK (type_modele IN ('fraction', 'pourcentage', 'fixe_journalier', 'pourcentage_seuil'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE modeles_paiement_jeton ADD CONSTRAINT modeles_paiement_valeur_check
    CHECK (valeur >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Journal d'audit (P1.6)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_audit (
    id BIGSERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    action VARCHAR(50) NOT NULL,
    entite VARCHAR(50) NOT NULL,
    entite_id INTEGER,
    details JSONB,
    ip VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS journal_audit_created_idx ON journal_audit (created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. File d'attente + réservations (P1.9)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS file_attente (
    id SERIAL PRIMARY KEY,
    salle_id INTEGER REFERENCES salles(id),
    poste_id INTEGER REFERENCES postes(id),
    nom_joueur VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    jeu_id INTEGER REFERENCES jeux(id),
    statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
    note TEXT,
    cree_par INTEGER REFERENCES utilisateurs(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT file_attente_statut_check
      CHECK (statut IN ('en_attente', 'appele', 'installe', 'annule'))
);

CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    poste_id INTEGER NOT NULL REFERENCES postes(id),
    nom_joueur VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    debut TIMESTAMP NOT NULL,
    fin TIMESTAMP,
    statut VARCHAR(20) NOT NULL DEFAULT 'reservee',
    montant DECIMAL(10, 2) DEFAULT 0,
    note TEXT,
    cree_par INTEGER REFERENCES utilisateurs(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reservations_statut_check
      CHECK (statut IN ('reservee', 'honoree', 'annulee', 'expiree'))
);

CREATE INDEX IF NOT EXISTS reservations_debut_idx ON reservations (debut);
CREATE INDEX IF NOT EXISTS file_attente_statut_idx ON file_attente (statut, created_at);

-- ---------------------------------------------------------------------------
-- 8. Index de performance (O9)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS sessions_jeux_created_idx ON sessions_jeux (created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_jeux_poste_idx ON sessions_jeux (poste_id);
CREATE INDEX IF NOT EXISTS sessions_jeux_statut_idx ON sessions_jeux (statut);
CREATE INDEX IF NOT EXISTS pauses_sessions_session_idx ON pauses_sessions (session_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions (date_transaction DESC);
CREATE INDEX IF NOT EXISTS transactions_session_idx ON transactions (session_id);

COMMIT;
