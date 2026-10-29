-- Base schema for Aluka Game Zone
CREATE DATABASE gamecenter_db;
\c gamecenter_db;

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);
CREATE TABLE utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    telephone VARCHAR(20),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    actif BOOLEAN DEFAULT TRUE,
    token_version INTEGER NOT NULL DEFAULT 0,
    cree_par INTEGER REFERENCES utilisateurs(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE abonnements (
    id SERIAL PRIMARY KEY,
    boss_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    actif BOOLEAN DEFAULT TRUE,
    commentaire TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE salles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    adresse TEXT,
    boss_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE consoles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    marque VARCHAR(50),
    description TEXT
);
CREATE TABLE postes (
    id SERIAL PRIMARY KEY,
    salle_id INTEGER NOT NULL REFERENCES salles(id),
    console_id INTEGER NOT NULL REFERENCES consoles(id),
    nom_poste VARCHAR(50),
    numero_poste VARCHAR(20),
    statut VARCHAR(20) DEFAULT 'libre',
    disponible BOOLEAN DEFAULT TRUE,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Un nom de poste est unique dans une salle (insensible a la casse).
CREATE UNIQUE INDEX postes_nom_par_salle_uniq ON postes (salle_id, lower(nom_poste)) WHERE actif = TRUE;
CREATE TABLE jeux (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    genre VARCHAR(50),
    description TEXT,
    actif BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE console_jeux (
    id SERIAL PRIMARY KEY,
    console_id INTEGER NOT NULL REFERENCES consoles(id) ON DELETE CASCADE,
    jeu_id INTEGER NOT NULL REFERENCES jeux(id) ON DELETE CASCADE
);
CREATE TABLE tarifications (
    id SERIAL PRIMARY KEY,
    console_id INTEGER NOT NULL REFERENCES consoles(id),
    duree_minutes INTEGER NOT NULL,
    prix DECIMAL(10,2) NOT NULL,
    actif BOOLEAN DEFAULT TRUE
);
CREATE UNIQUE INDEX tarifications_console_duree_uniq
  ON tarifications (console_id, duree_minutes) WHERE actif = TRUE;
CREATE TABLE sessions_jeux (
    id SERIAL PRIMARY KEY,
    poste_id INTEGER NOT NULL REFERENCES postes(id),
    jeu_id INTEGER REFERENCES jeux(id),
    jeton_id INTEGER REFERENCES utilisateurs(id),
    heure_debut TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    heure_fin TIMESTAMP,
    duree_reelle INTEGER DEFAULT 0,
    montant_total DECIMAL(10,2) DEFAULT 0,
    montant_a_rendre DECIMAL(10,2) DEFAULT 0,
    statut VARCHAR(20) DEFAULT 'en_cours',
    coupure_electricite BOOLEAN DEFAULT FALSE,
    a_verifier BOOLEAN NOT NULL DEFAULT FALSE,
    verifie_par INTEGER REFERENCES utilisateurs(id),
    verifie_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sessions_jeux_statut_check
      CHECK (statut IN ('en_cours', 'pause', 'terminee', 'annulee'))
);
-- Une seule session active (en cours ou en pause) par poste.
CREATE UNIQUE INDEX sessions_jeux_active_poste_uniq
  ON sessions_jeux (poste_id) WHERE statut IN ('en_cours', 'pause');
CREATE INDEX sessions_jeux_created_idx ON sessions_jeux (created_at DESC);
CREATE TABLE pauses_sessions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions_jeux(id) ON DELETE CASCADE,
    debut_pause TIMESTAMP NOT NULL,
    fin_pause TIMESTAMP,
    duree_pause INTEGER DEFAULT 0
);
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions_jeux(id),
    montant DECIMAL(10,2) NOT NULL,
    type_transaction VARCHAR(30) NOT NULL,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    date_transaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transactions_type_check
      CHECK (type_transaction IN ('encaissement', 'remboursement'))
);
CREATE INDEX transactions_date_idx ON transactions (date_transaction DESC);
CREATE TABLE materiels (
    id SERIAL PRIMARY KEY,
    salle_id INTEGER NOT NULL REFERENCES salles(id),
    nom VARCHAR(100) NOT NULL,
    categorie VARCHAR(50),
    quantite INTEGER DEFAULT 0,
    stock_minimum INTEGER DEFAULT 0,
    etat VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE mouvements_stock (
    id SERIAL PRIMARY KEY,
    materiel_id INTEGER NOT NULL REFERENCES materiels(id),
    type_mouvement VARCHAR(20) NOT NULL,
    quantite INTEGER NOT NULL,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    date_mouvement TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE tournois (
    id SERIAL PRIMARY KEY,
    salle_id INTEGER NOT NULL REFERENCES salles(id),
    jeu_id INTEGER REFERENCES jeux(id),
    nom VARCHAR(100) NOT NULL,
    mise DECIMAL(10,2) DEFAULT 0,
    recompense TEXT,
    type_tournoi VARCHAR(50),
    date_tournoi TIMESTAMP
);
CREATE TABLE participants_tournoi (
    id SERIAL PRIMARY KEY,
    tournoi_id INTEGER NOT NULL REFERENCES tournois(id) ON DELETE CASCADE,
    nom_joueur VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    score INTEGER DEFAULT 0,
    elimine BOOLEAN DEFAULT FALSE
);
CREATE TABLE modeles_paiement_jeton (
    id SERIAL PRIMARY KEY,
    nom_modele VARCHAR(100),
    type_modele VARCHAR(50),
    valeur DECIMAL(12,4),
    seuil DECIMAL(10,2),
    description TEXT,
    CONSTRAINT modeles_paiement_type_check
      CHECK (type_modele IN ('fraction', 'pourcentage', 'fixe_journalier', 'pourcentage_seuil')),
    CONSTRAINT modeles_paiement_valeur_check CHECK (valeur >= 0)
);
CREATE TABLE journal_audit (
    id BIGSERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id),
    action VARCHAR(50) NOT NULL,
    entite VARCHAR(50) NOT NULL,
    entite_id INTEGER,
    details JSONB,
    ip VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX journal_audit_created_idx ON journal_audit (created_at DESC);
CREATE TABLE file_attente (
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
CREATE TABLE reservations (
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
CREATE TABLE affectation_paiement_jeton (
    id SERIAL PRIMARY KEY,
    jeton_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    modele_id INTEGER NOT NULL REFERENCES modeles_paiement_jeton(id),
    date_debut DATE DEFAULT CURRENT_DATE,
    actif BOOLEAN DEFAULT TRUE
);
