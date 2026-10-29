# ALUKA GAME ZONE — Design system « Pro Premium »

Référence unique pour toute nouvelle interface du frontend (`frontend/aluka-game-zone`).
Les composants vivent dans `src/components/ui/`, les tokens dans `src/css/app.scss`.

---

## 1. Intention

Interface de **pilotage d'exploitation** : dense en information, calme visuellement, lisible à
3 mètres par un opérateur debout derrière un comptoir. Le « premium » vient de la hiérarchie,
de la précision des chiffres et des micro-mouvements — pas des dégradés arc-en-ciel.

Trois règles directrices :

1. **Le chiffre d'abord.** Chaque écran répond à « combien, combien de postes, qu'est-ce qui
   bloque ? » avant de proposer une action.
2. **Une seule action primaire par écran.** Le cyan est réservé à l'action principale et aux
   données vivantes ; tout le reste est neutre.
3. **Zéro couleur codée en dur.** Toute couleur, ombre, rayon ou durée vient d'un token.

---

## 2. Tokens (CSS variables sur `:root`)

| Famille      | Tokens                                                                     | Usage                                    |
| ------------ | -------------------------------------------------------------------------- | ---------------------------------------- |
| Fonds        | `--ink-950` `--ink-900` `--ink-850` `--ink-800` `--ink-750`                 | fond d'app, shell, sidebar                |
| Surfaces     | `--surface-1` `--surface-2` `--surface-3` `--surface-glass` `--surface-hover` | cartes, menus, états survolés           |
| Texte        | `--text-1` `--text-2` `--text-3`                                           | titres / corps / métadonnées              |
| Marque       | `--brand` `--brand-strong` `--brand-2` `--brand-soft` `--brand-gradient`   | action primaire, séries de données        |
| États        | `--ok` `--warn` `--danger` `--info` (+ variantes `--*-soft`)               | badges, alertes, montants négatifs        |
| Lignes       | `--line` `--line-soft` `--line-strong`                                     | bordures, séparateurs                     |
| Rayons       | `--r-xs` `--r-sm` `--r-md` `--r-lg` `--r-xl` `--r-pill`                    | 8 / 10 / 14 / 18 / 24 / 999               |
| Ombres       | `--sh-1` `--sh-2` `--sh-glow` `--ring`                                     | élévation, focus visible                  |
| Typo         | `--font-body` (Inter) `--font-display` (Sora)                              | texte / titres et chiffres clés           |
| Layout       | `--sidebar-w` `--topbar-h` `--page-pad`                                    | coque                                     |

Le thème clair est un **override de tokens** (`body.theme-light`), jamais une duplication de
règles. Toute nouvelle règle visuelle doit donc fonctionner dans les deux thèmes.

---

## 3. Typographie

- Titres d'écran : Sora 700, `clamp(20px, 2.1vw, 26px)`, letter-spacing `-0.025em`.
- Titres de carte : Sora 600, 14 px.
- Corps : Inter 14 px ; secondaire 13 px (`--text-2`) ; métadonnées 11–12 px (`--text-3`).
- Libellés de section : 11 px, majuscules, letter-spacing `0.12em` (classe `.eyebrow`).
- **Tous les montants et compteurs** utilisent `.num` (`font-variant-numeric: tabular-nums`)
  pour éviter que les chiffres « sautent » quand ils changent.
- Jamais plus de 72 caractères par ligne de description.

---

## 4. Banque de composants

Import unique : `import { UiCard, UiPageHeader } from 'src/components/ui'`.

| Composant      | Props principales                                                                 | Quand l'utiliser                                  |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------------------------- |
| `UiPageHeader` | `title` `subtitle` `eyebrow` + slot `actions`                                     | En-tête de chaque page (animation d'entrée incluse) |
| `UiCard`       | `title` `hint` `hover` `flush` + slots `header` `actions`                         | Tout regroupement de contenu                      |
| `UiStatCard`   | `label` `value` `icon` `tone` `hint` `delta` `money` `suffix` `delay`             | KPI en haut de page, compteur animé               |
| `UiTable`      | `rows` `columns` `row-key` `loading` `pagination` `empty-*` + slots `body-cell-*` | Toute liste tabulaire                             |
| `UiButton`     | `label` `icon` `variant` (`primary`/`ghost`/`subtle`/`danger`/`icon`) `loading` `tooltip` `to` | Toute action                        |
| `UiBadge`      | `tone` (`ok`/`warn`/`danger`/`info`/`brand`/`neutral`) `label`                    | Statuts, rôles, compteurs                         |
| `UiModal`      | `v-model` `title` `subtitle` `persistent` `width` + slot `actions`                | Formulaires et confirmations riches               |
| `UiEmptyState` | `icon` `title` `text` + slot action                                               | Liste vide : toujours expliquer la suite          |
| `UiSkeleton`   | `width` `height` `radius` `circle`                                                | Chargement (jamais de layout qui saute)           |
| `UiBars`       | `data` `label-key` `value-key` `limit`                                            | Petites séries par catégorie                      |
| `UiCountUp`    | `value` `money` `suffix` `decimals` `duration`                                    | Chiffres animés                                   |

### Recette d'une page

```vue
<q-page class="app-page">
  <UiPageHeader title="…" subtitle="…">
    <template #actions><UiButton … /></template>
  </UiPageHeader>

  <section class="ui-grid ui-grid--stats">… UiStatCard ×3-4 …</section>

  <UiCard title="…" hint="…">formulaire</UiCard>

  <UiTable :rows="rows" :columns="columns" :loading="loading" empty-title="…">
    <template #body-cell-statut="props">
      <q-td><UiBadge :tone="…" :label="…" /></q-td>
    </template>
  </UiTable>
</q-page>
```

### Espacement

`4 · 8 · 12 · 16 · 20 · 24 · 32` uniquement. `16 px` entre cartes (`--stack-gap` par défaut),
`20-22 px` entre sections, `var(--page-pad)` en bord de page.

---

## 5. Mouvement (motion-v / « framer-motion » pour Vue)

| Intention                | Réglage                                                       |
| ------------------------ | ------------------------------------------------------------- |
| Entrée de page           | `opacity 0→1`, `y 10→0`, `0.3 s`, ease `[0.32, 0.72, 0, 1]`    |
| Entrée de carte          | idem, `y 12→14`, delay `0.03 × index` (max 5 éléments)         |
| Compteurs                | `0.95 s`, easeOutCubic, jamais de rebond                       |
| Barres de graphique      | hauteur `0→N`, `0.6 s`, delay `0.06 × index`                   |
| Survol                   | soulèvement de 2–3 px maximum, 0.2 s                           |

Règles :

- Jamais d'animation sur une **modale qui s'ouvre** au-delà de 0.2 s (perçu comme lent).
- Jamais d'animation bloquante : l'utilisateur doit pouvoir cliquer pendant l'animation.
- `prefers-reduced-motion` est respecté globalement (CSS) et dans `UiCountUp`.
- Ne pas animer une valeur monétaire en boucle : un seul comptage à l'apparition.

---

## 6. Accessibilité

- Contraste minimum 4.5:1 : `--text-1` sur `--surface-1` = 13:1, `--text-3` = 4.6:1
  (réservé aux métadonnées ≥ 11 px, jamais à une info critique).
- Toute action icône-seule porte un `aria-label` (fait par `UiButton` via `tooltip`).
- `UiTable` conserve des en-têtes `<th>` sémantiques ; ne pas remplacer par des `div`.
- Focus visible : `--ring` (1 px marque + halo 4 px). Ne jamais `outline: none` sans alternative.
- Un statut n'est jamais signalé **par la couleur seule** : `UiBadge` affiche toujours un texte.

---

## 7. À faire / à éviter

**À faire**

- Utiliser `UiStatCard` pour les KPI, `UiBadge` pour les statuts, `UiTable` pour les listes.
- Garder les formulaires dans une `UiCard` avec un `hint` qui explique la conséquence.
- Afficher un état vide actionnable (`UiEmptyState` + bouton).
- Afficher les montants via `formatAriary()` et les nombres dans `.num`.

**À éviter**

- Couleurs hexadécimales dans un composant ou un `<style scoped>`.
- Deux boutons primaires côte à côte.
- Tableaux sans état vide ni indicateur de chargement.
- Textes de plus de 2 lignes dans une carte de stat.
- `transform` sur un ancêtre de `position: fixed` (casse les dialogues).
