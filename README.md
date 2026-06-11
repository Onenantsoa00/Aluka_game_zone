# Aluka Game Zone

Application de gestion multi-salles de jeux (admin, boss, jeton) basee sur:
- Backend: Node.js + Express + PostgreSQL
- Frontend: Vue.js + Quasar

## 1) Preparation base de donnees

1. Executer le schema:
   - `database/schema.sql`
2. Configurer le backend:
   - copier `backend/.env.example` vers `backend/.env`
3. Inserer les donnees de base:
   - `cd backend`
   - `npm run seed`

Compte admin par defaut:
- username: `admin`
- mot de passe: `admin123`

## 2) Lancer le backend

```bash
cd backend
npm install
npm run dev
```

API disponible sur `http://localhost:3000/api`.

## 3) Lancer le frontend

```bash
cd frontend/aluka-game-zone
npm install
npm run dev
```

Avant lancement, copier `.env.example` vers `.env`.

## Fonctionnalites MVP implementees

- Authentification JWT + gestion des roles (`admin`, `boss`, `jeton`)
- Gestion des comptes (creation et activation/desactivation)
- Tableau de bord (solde jour/mois/annee + usage des salles/postes/jeux)
- Gestion des sessions de jeu:
  - demarrage
  - pause/reprise
  - arret normal
  - arret avec coupure d'electricite et calcul du montant a rendre
- Gestion materiels + mouvements de stock
- Gestion tournois (elimination directe) et participants
- Gestion abonnements boss (activation/blocage manuel par admin)

## Architecture Backend (MVC)

- `backend/src/models`: acces base de donnees (SQL)
- `backend/src/controllers`: logique metier HTTP
- `backend/src/routes`: declaration des endpoints + middlewares
- `backend/src/middleware`: auth, roles, gestion des erreurs
# Aluka_game_zone
