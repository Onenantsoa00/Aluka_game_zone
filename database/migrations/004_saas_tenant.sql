-- Migration 004 — SaaS multi-tenant, abonnements et tournois complets
-- Idempotente : peut etre rejouee sans casser la base.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Abonnements : tracabilite des paiements et periode d'essai
-- ---------------------------------------------------------------------------
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS reference_paiement VARCHAR(80);
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS moyen_paiement VARCHAR(30) DEFAULT 'mobile_money';
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manuel';
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS valide_par INTEGER REFERENCES utilisateurs(id);
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS valide_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS demandes_abonnement (
    id SERIAL PRIMARY KEY,
    boss_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    montant DECIMAL(10,2) NOT NULL DEFAULT 30000,
    reference VARCHAR(80) NOT NULL,
    moyen_paiement VARCHAR(30) NOT NULL DEFAULT 'mobile_money',
    telephone_payeur VARCHAR(20),
    date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
    statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
    note TEXT,
    traite_par INTEGER REFERENCES utilisateurs(id),
    traite_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT demandes_abonnement_statut_check
      CHECK (statut IN ('en_attente', 'validee', 'refusee'))
);

-- Une reference mobile money ne peut servir qu'une fois (hors refus).
CREATE UNIQUE INDEX IF NOT EXISTS demandes_abonnement_reference_uniq
  ON demandes_abonnement (lower(reference)) WHERE statut <> 'refusee';
CREATE INDEX IF NOT EXISTS demandes_abonnement_boss_idx
  ON demandes_abonnement (boss_id, created_at DESC);
CREATE INDEX IF NOT EXISTS demandes_abonnement_statut_idx
  ON demandes_abonnement (statut, created_at);

ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS demande_id INTEGER
  REFERENCES demandes_abonnement(id);

CREATE TABLE IF NOT EXISTS relances_abonnement (
    id SERIAL PRIMARY KEY,
    boss_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    abonnement_id INTEGER REFERENCES abonnements(id),
    type VARCHAR(20) NOT NULL,
    message TEXT,
    lu BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT relances_abonnement_type_check
      CHECK (type IN ('j7', 'j3', 'j1', 'expire', 'active')),
    UNIQUE (boss_id, abonnement_id, type)
);

CREATE INDEX IF NOT EXISTS relances_abonnement_boss_idx
  ON relances_abonnement (boss_id, lu, created_at DESC);

CREATE INDEX IF NOT EXISTS abonnements_boss_fin_idx
  ON abonnements (boss_id, date_fin DESC);

-- Les comptes existants sans abonnement demarrent leur essai gratuit de 7 jours.
INSERT INTO abonnements (boss_id, date_debut, date_fin, montant, actif, source, commentaire)
SELECT u.id, CURRENT_DATE, CURRENT_DATE + 6, 0, TRUE, 'essai', 'Essai gratuit de 7 jours'
FROM utilisateurs u
JOIN roles r ON r.id = u.role_id AND r.nom = 'boss'
WHERE NOT EXISTS (SELECT 1 FROM abonnements a WHERE a.boss_id = u.id);

-- Un operateur doit etre rattache a un boss : les anciens comptes jeton
-- orphelins sont rattaches au premier boss pour rester utilisables.
UPDATE utilisateurs u
SET cree_par = (
  SELECT b.id FROM utilisateurs b
  JOIN roles r ON r.id = b.role_id AND r.nom = 'boss'
  ORDER BY b.id LIMIT 1
)
WHERE u.cree_par IS NULL
  AND EXISTS (SELECT 1 FROM roles r JOIN utilisateurs x ON x.role_id = r.id WHERE x.id = u.id AND r.nom = 'jeton');

-- ---------------------------------------------------------------------------
-- 2. Multi-tenant : les modeles de paiement appartiennent a un boss
--    (boss_id NULL = modele global fourni par la plateforme).
-- ---------------------------------------------------------------------------
ALTER TABLE modeles_paiement_jeton ADD COLUMN IF NOT EXISTS boss_id INTEGER
  REFERENCES utilisateurs(id);
CREATE INDEX IF NOT EXISTS modeles_paiement_boss_idx
  ON modeles_paiement_jeton (boss_id);

-- Les tarifs sont propres a chaque boss (boss_id NULL = tarif plateforme
-- utilise comme modele de reference en lecture seule).
ALTER TABLE tarifications ADD COLUMN IF NOT EXISTS boss_id INTEGER
  REFERENCES utilisateurs(id);
CREATE INDEX IF NOT EXISTS tarifications_boss_idx ON tarifications (boss_id);

-- Les tarifs historiques deviennent les modeles plateforme : chaque boss
-- peut creer ses propres tarifs sans modifier ceux des autres.
UPDATE tarifications SET boss_id = NULL WHERE boss_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS salles_boss_idx ON salles (boss_id);
CREATE INDEX IF NOT EXISTS tournois_salle_idx ON tournois (salle_id);

-- ---------------------------------------------------------------------------
-- 3. Tournois : deroulement complet en elimination directe
-- ---------------------------------------------------------------------------
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS statut VARCHAR(20) NOT NULL DEFAULT 'inscriptions';
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS taille_tableau INTEGER;
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS champion_id INTEGER;
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;

DO $$
BEGIN
  ALTER TABLE tournois ADD CONSTRAINT tournois_statut_check
    CHECK (statut IN ('inscriptions', 'en_cours', 'termine', 'annule'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tournois DROP CONSTRAINT IF EXISTS tournois_champion_id_fkey;
ALTER TABLE tournois
  ADD CONSTRAINT tournois_champion_id_fkey
  FOREIGN KEY (champion_id) REFERENCES participants_tournoi(id) ON DELETE SET NULL;

ALTER TABLE participants_tournoi ADD COLUMN IF NOT EXISTS seed INTEGER;

CREATE TABLE IF NOT EXISTS matchs_tournoi (
    id SERIAL PRIMARY KEY,
    tournoi_id INTEGER NOT NULL REFERENCES tournois(id) ON DELETE CASCADE,
    tour INTEGER NOT NULL,
    position INTEGER NOT NULL,
    participant1_id INTEGER REFERENCES participants_tournoi(id) ON DELETE SET NULL,
    participant2_id INTEGER REFERENCES participants_tournoi(id) ON DELETE SET NULL,
    score1 INTEGER,
    score2 INTEGER,
    gagnant_id INTEGER REFERENCES participants_tournoi(id) ON DELETE SET NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'a_venir',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT matchs_tournoi_statut_check
      CHECK (statut IN ('a_venir', 'en_cours', 'termine', 'bye')),
    CONSTRAINT matchs_tournoi_unique_slot UNIQUE (tournoi_id, tour, position)
);

CREATE INDEX IF NOT EXISTS matchs_tournoi_tournoi_idx
  ON matchs_tournoi (tournoi_id, tour, position);

-- ---------------------------------------------------------------------------
-- 4. Index de lecture multi-tenant
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS postes_salle_idx ON postes (salle_id);
CREATE INDEX IF NOT EXISTS materiels_salle_idx ON materiels (salle_id);
CREATE INDEX IF NOT EXISTS reservations_poste_idx ON reservations (poste_id);
CREATE INDEX IF NOT EXISTS sessions_jeton_idx ON sessions_jeux (jeton_id);

COMMIT;
