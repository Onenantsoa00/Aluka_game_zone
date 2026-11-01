# Aluka Game Zone

Application de gestion multi-salles de jeux (admin, boss, jeton).

- Backend : Node.js + Express + PostgreSQL
- Frontend : Vue.js + Quasar
- Temps réel : socket.io

## 1) Préparation de la base de données

1. Exécuter le schéma sur une base neuve :
   - `database/schema.sql`
2. Ou appliquer les migrations sur une base existante :
   ```bash
   cd backend
   npm run migrate
   ```
   Le script `backend/scripts/migrate.js` suit les fichiers déjà appliqués dans
   `schema_migrations`. Les migrations sont dans `database/migrations/`.
3. Configurer le backend :
   - copier `backend/.env.example` vers `backend/.env`
4. Insérer les données de base :
   ```bash
   cd backend
   npm run seed
   ```

> Les migrations `001_hardening.sql`, `002_fraction_precision.sql`,
> `003_pause_integrity.sql`, `004_saas_tenant.sql` et `005_tarifs_par_boss.sql`
> ont déjà été appliquées à la base de développement : contraintes d'unicité,
> colonnes d'audit/vérification, tables réservations/file d'attente, correction
> des modèles de paiement, dédoublonnage des noms de postes, correction des
> pauses historiques, SaaS multi-tenant (abonnements, demandes Mobile Money,
> relances, tableau de tournoi) et unicité des tarifs par propriétaire.

## 2) Lancer le backend

```bash
cd backend
npm install
npm run dev
```

API sur `http://localhost:3000/api`, healthcheck sur `http://localhost:3000/api/health`.
Le serveur écoute aussi socket.io sur le même port.

## 3) Lancer le frontend

```bash
cd frontend/aluka-game-zone
npm install
npm run dev
```

Copier `.env.example` vers `.env` avant lancement (`VITE_API_URL`).

---

# Authentification existante

## Rôles

| Rôle    | Description                                                            |
| ------- | ---------------------------------------------------------------------- |
| `admin` | Accès global : comptes, abonnements, audit, caisse, toutes les salles  |
| `boss`  | Gestion de ses salles et de ses opérateurs (`jeton`), caisse et paie   |
| `jeton` | Opérateur de salle : sessions, réservations, file d'attente, matériels |

Les rôles sont stockés dans la table `roles` et référencés par
`utilisateurs.role_id`. Le rôle est renvoyé par l'API et utilisé par le routeur
front (`meta.roles`), la sidebar et les gardes serveur.

## Comptes créés par `npm run seed`

| Identifiant | Mot de passe | Rôle  |
| ----------- | ------------ | ----- |
| `admin`     | `admin123`   | admin |
| `boss1`     | `boss123`    | boss  |
| `jeton1`    | `jeton123`   | jeton |

> **Sécurité** : ces comptes de démonstration doivent être supprimés ou leurs
> mots de passe changés avant toute mise en production. Le formulaire de
> connexion n'est plus pré-rempli et n'affiche plus de mot de passe (F5).

## Mécanisme de jeton

- Connexion : `POST /api/auth/login` → JWT signé (`JWT_SECRET`), durée **8 h**
  par défaut (`JWT_EXPIRES_IN`), contenant `id`, `username`, `role` et
  `ver` (version de jeton).
- Chaque requête protégée vérifie le JWT **et** l'état en base :
  compte actif et `token_version` identique. Un jeton reste donc valide après
  une déconnexion d'un autre poste, mais il est révoqué par :
  - `POST /api/auth/logout` (incrémente `token_version`) ;
  - la désactivation/suppression d'un compte ;
  - un changement de rôle ou de mot de passe.
- `POST /api/auth/refresh` renouvelle un jeton encore valide. Le client
  (`src/services/api.js`) le fait automatiquement sur un 401, puis rejoue la
  requête ; en cas d'échec, le store est vidé et l'utilisateur est renvoyé sur
  `#/login` via l'événement `agz:unauthorized` (F2).
- Le jeton est encore conservé dans `localStorage` (risque XSS résiduel) : la
  durée courte, le refresh et la révocation limitent l'exposition, mais une
  migration vers un cookie `httpOnly` reste recommandée.

## Matrice des accès

| Endpoint                                                            | admin | boss                    | jeton     |
| ------------------------------------------------------------------- | ----- | ----------------------- | --------- |
| `GET /dashboard`                                                    | oui   | oui                     | oui       |
| `GET /sessions`, `/sessions/count`, `/sessions/a-verifier`          | oui   | oui                     | oui       |
| `POST /sessions/*` (start/pause/resume/stop/prolongation/paiements) | oui   | oui                     | oui       |
| `PATCH /sessions/:id/verifier`                                      | oui   | oui                     | non       |
| `GET /comptes`                                                      | tous  | son compte + ses jetons | **403**   |
| `POST/PUT/DELETE /comptes`                                          | oui   | jetons qu'il a créés    | non       |
| `GET /paiements/*` et `/paiements/remunerations`                    | oui   | oui                     | **403**   |
| `GET /salles`, `/postes`, `/jeux`, `/consoles`                      | oui   | oui                     | oui       |
| `POST/PUT/DELETE /salles`, `/postes`, `/jeux`, tarifs               | oui   | oui (ses salles)        | non       |
| `GET/POST/PATCH /abonnements`                                       | oui   | non                     | non       |
| `GET /audit`                                                        | oui   | non                     | non       |
| `GET /rapports/z`, `/rapports/z.csv`                                | oui   | oui                     | non       |
| `/reservations`, `/file-attente`                                    | oui   | oui                     | oui       |
| `/materiels`, `/tournois` (écritures)                               | oui   | oui                     | matériels |

Toutes les routes front portent désormais un `meta.roles` ; une route non
autorisée redirige vers le tableau de bord, et les entrées de menu sont filtrées
par rôle.

---

# Modifications et améliorations livrées

## Bugs corrigés

| Réf     | Correction                                                                                                                                                                                                                                                                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **O1**  | Démarrage de session dans une transaction avec verrou `FOR UPDATE` sur le poste + index unique partiel `sessions_jeux_active_poste_uniq` (une seule session `en_cours`/`pause` par poste). Un second démarrage renvoie **409**.                                                                                                                           |
| **O2**  | `POST /sessions/:id/stop` verrouille la session et refuse tout statut autre que `en_cours`/`pause` : plus de double encaissement ni de poste libéré par erreur.                                                                                                                                                                                           |
| **O3**  | Les recettes du dashboard sont calculées depuis `transactions` : `encaissements − remboursements`. L'encaissement est enregistré au démarrage, le remboursement à l'arrêt. Toutes les connexions PostgreSQL sont réglées sur `Indian/Antananarivo` (`APP_TIMEZONE`) : la journée de caisse n'est plus décalée par l'UTC.                                  |
| **O4**  | `GET /comptes` : admin = tous, boss = son compte + ses jetons, jeton = 403. `requireRoles` sur les écritures et sur les sessions, `meta.roles` sur **toutes** les routes front.                                                                                                                                                                           |
| **O5**  | Pause refusée si la session n'est pas `en_cours`, reprise refusée hors pause. Le temps affiché est calculé serveur en déduisant les pauses (y compris la pause ouverte) : il ne court plus pendant une pause et les durées fantaisistes (3333 h) disparaissent.                                                                                           |
| **O6**  | Job de maintenance : à chaque démarrage puis toutes les 5 minutes, les sessions actives antérieures à la dernière heure de fermeture sont clôturées, les pauses refermées, les postes libérés et les sessions marquées **à vérifier**. Écran dédié dans Sessions + bannière dashboard. Les deux sessions fantômes de juin ont été clôturées et signalées. |
| **O7**  | Types de modèles alignés (`fraction`, `pourcentage`, `fixe_journalier`, `pourcentage_seuil`) avec contrainte SQL, validation API, seuils réellement appliqués au calcul des rémunérations, 1/3 stocké `0.3333` (`DECIMAL(12,4)`) et non 33 %.                                                                                                             |
| **O8**  | `PUT` et `DELETE` ajoutés pour salles, postes, jeux, tarifications, comptes, modèles de paiement. Suppressions logiques (sauf tarifs/modèles), refus si session active ou données référencées.                                                                                                                                                            |
| **O9**  | Pagination serveur des sessions (`limit`/`offset`, max 200, en-tête `X-Total-Count`), compteur `/sessions/count`, listes secondaires bornées (`LIMIT`) et index ajoutés.                                                                                                                                                                                  |
| **O10** | JWT 8 h, refresh transparent, révocation serveur par `token_version` (logout, désactivation, reset de mot de passe). Stockage `localStorage` conservé mais risque résiduel documenté.                                                                                                                                                                     |
| **O11** | Dédoublonnage des postes existants (`FAT #2`, `FAT #3`, `slim #2`) puis index unique `(salle_id, lower(nom_poste))` sur les postes actifs. L'API renvoie 409 sur un doublon.                                                                                                                                                                              |
| **O12** | « Postes les plus utilisés » et « Jeux populaires » utilisent `HAVING COUNT(...) > 0`.                                                                                                                                                                                                                                                                    |
| **O13** | socket.io réellement branché : serveur authentifié par JWT, événements `session:changed`, `postes:changed`, `sessions:refresh` ; le front se reconnecte avec `socket.io-client`.                                                                                                                                                                          |
| **O14** | Dépendance socket.io utilisée, migrations SQL versionnées (`npm run migrate`), journal d'audit et healthcheck enrichi. Les tests automatisés et la CI restent à faire (voir « Reste à faire »).                                                                                                                                                           |

Les bugs **F1–F10** (Notify/Dialog, redirection 401, erreurs réseau, `PORT`,
login pré-rempli, statut de poste réactif, rafraîchissement abonnements,
sélecteur de postes, bouton « Nouvelle session », libellés français) étaient
déjà corrigés dans l'arbre de travail ; ils sont conservés et couverts par les
nouveaux écrans.

## P0 — avant mise en production

1. Unicité de session par poste (transaction + index partiel) — **fait**
2. Arrêt refusé hors `en_cours`/`pause` — **fait**
3. Recettes depuis transactions + fuseau `Indian/Antananarivo` — **fait**
4. Rôles sur les routes API et `meta.roles` front — **fait** (avec cloisonnement
   du boss au lieu d'un 403 global sur `GET /comptes`)
5. Clôture automatique à l'heure de fermeture + écran « sessions à vérifier » — **fait**

## P1 — valeur métier

6. Édition/suppression (salles, postes, jeux, tarifs, comptes, modèles) et
   journal d'audit (`/api/audit`, page admin) — **fait**
7. Rapport de caisse Z imprimable (`/caisse`), export CSV protégé par JWT,
   ticket texte (`/api/rapports/z/ticket`) — **fait**
8. Temps réel socket.io : occupation des postes, rafraîchissement des sessions,
   alerte locale quand le temps payé est dépassé — **fait**
9. File d'attente des joueurs + réservations de postes avec contrôle de
   chevauchement (`/reservations`, page « File d'attente ») — **fait**
10. Paiement partiel (`POST /sessions/:id/paiements`) et prolongation en un clic
    (`POST /sessions/:id/prolongation`) — **fait**

## Vérifications effectuées

- `npm run migrate` : migrations appliquées sans erreur sur la base existante.
- Scénarios API réels (admin, boss, jeton) :
  double démarrage → 409, double pause/reprise → 409, double arrêt → 409,
  paiement négatif → 400, nom de poste dupliqué → 409, tarif dupliqué → 409.
- Pause antidatée de 40 min : temps affiché `40 → 40` après 2,5 s (gel confirmé).
- Recette du jour = `encaissements − remboursements` (90 Ar pour la session
  remboursée de 210 Ar), rapport Z et CSV cohérents.
- `jeton1` : `GET /comptes` et `/paiements/*` → 403, sessions → 200.
- Logout et suppression de compte : l'ancien jeton est refusé (401).
- Socket.io : connexion authentifiée et réception de `session:changed`.
- Frontend : `eslint` sans erreur et `npm run build` réussi.
- Données de test créées pendant les vérifications nettoyées.

## Configuration backend

Voir `backend/.env.example` :

| Variable                       | Défaut                | Rôle                                           |
| ------------------------------ | --------------------- | ---------------------------------------------- |
| `PORT`                         | `3000`                | Port HTTP (une valeur vide retombe sur 3000)   |
| `JWT_SECRET`                   | —                     | Secret de signature (à changer impérativement) |
| `JWT_EXPIRES_IN`               | `8h`                  | Durée du jeton                                 |
| `APP_TIMEZONE`                 | `Indian/Antananarivo` | Fuseau métier (connexions PostgreSQL)          |
| `CLOSING_HOUR`                 | `23`                  | Heure de clôture automatique                   |
| `MAINTENANCE_INTERVAL_MINUTES` | `5`                   | Fréquence du job de clôture                    |
| `CORS_ORIGIN`                  | `*`                   | Origines autorisées (REST + socket.io)         |

## Architecture backend (MVC)

- `backend/src/models` : accès base de données (SQL)
- `backend/src/controllers` : logique métier HTTP
- `backend/src/routes` : endpoints + middlewares
- `backend/src/middleware` : authentification, rôles
- `backend/src/services` : tarification/remboursement, rémunération, maintenance
- `backend/src/realtime.js` : socket.io
- `backend/src/utils` : erreurs HTTP, audit, formatage

## Abonnement SaaS (P2.11)

Le logiciel est vendu **30 000 Ar / mois** par salle, avec **7 jours d'essai
offert à la création du compte boss**. Le paiement est **manuel**, aucun
prélèvement automatique n'est effectué par l'application.

1. Le boss envoie 30 000 Ar par Mobile Money sur l'un des deux numéros
   (0389145273 — Orange Money, 0375441549 — MVola/Orange Money), au nom de
   `RANAIVO Andry Ny Avo Onenantsoa`.
2. Il déclare la référence de transaction dans **Mon abonnement**
   (`POST /api/mon-abonnement/demandes`).
3. L'administrateur vérifie l'encaissement puis active 30 jours depuis
   **Abonnements SaaS** (`POST /api/abonnements/demandes/:id/valider`) ou
   manuellement (`POST /api/abonnements`). La nouvelle période s'ajoute à la
   suite de la précédente, sans trou ni chevauchement.

- `GET /api/mon-abonnement` : état (essai / actif / expiré), historique,
  demandes et notifications. Toujours accessible, même expiré, pour pouvoir
  payer.
- `GET /api/abonnements` : vue plateforme (boss, échéances, demandes, revenus).
- Middleware `requireSubscription` : hors `admin`, toute route métier renvoie
  **402 `ABONNEMENT_EXPIRE`** dès que l'échéance est dépassée ; le frontend
  redirige alors vers l'espace de paiement.
- Relances automatiques in-app à J-7, J-3, J-1 et à l'expiration
  (`relances_abonnement`, idempotentes).
- Isolation multi-tenant (`backend/src/utils/tenant.js`) : chaque lecture métier
  filtre sur `boss_id`, les ressources d'autrui renvoient 404.

## Tournois (P2.12)

Tous les tournois sont en **élimination directe**. Après la clôture des
inscriptions, le tableau est généré à la puissance de 2 supérieure (les exempts
sont qualifiés automatiquement), les scores se saisissent match par match et le
vainqueur remonte au tour suivant jusqu'au champion affiché.

## PWA et hors-ligne (P2.13)

`npm run dev:pwa` / `npm run build:pwa`. Le service worker precache l'app shell
et met en cache les `GET /api/*` (NetworkFirst, 4 s, 24 h). Les mutations ne sont
jamais interceptées : aucune opération de caisse n'est rejouée hors ligne.

## Réactivité de l'interface

- Les pages sont **préchargées** après la première navigation (`router/index.js`,
  `requestIdleCallback`) : cliquer un menu ne télécharge plus son module.
- Les rafraîchissements déclenchés par socket ou par une action sont
  **silencieux** (`refresh({ silent: true })`) : plus d'overlay de chargement
  sur le tableau à chaque pause/arrêt.
- Le tableau de bord n'a plus de tick à 1 s : le temps joué est calculé par le
  serveur, un rafraîchissement toutes les 30 s suffit (0 tâche longue au repos).
- Transition de page réduite à 160 ms, sans déplacement vertical.
- `requireSubscription` met en cache l'état d'abonnement **30 s** par boss et
  l'invalide dès une validation/activation : une requête SQL en moins par appel
  (et une de moins par écran, qui en enchaine plusieurs).
- La page de démonstration `/ui-kit` (« Design system » dans le menu) a été
  retirée : elle n'apportait rien en production et ses animations tournaient en
  permanence. Le design system reste décrit dans `DESIGN.md` et dans
  `src/components/ui/`.

## Reste à faire (non livré dans cette passe)

- **P3.15** tests Vitest/Playwright, CI GitHub Actions et sauvegardes
  automatisées. Les migrations versionnées sont, elles, livrées.
- Migration du JWT de `localStorage` vers un cookie `httpOnly`.
- Inscription publique self-service d'un boss (aujourd'hui le compte est créé par
  l'administrateur, l'essai de 7 jours démarre à la création).
