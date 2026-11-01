<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Jeux & Tarifications"
      subtitle="Catalogue des jeux et grille de prix par console (ex. PS3 — 10 min → 400 Ar)."
    >
      <template #actions>
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="bootstrap" />
      </template>
    </UiPageHeader>

    <div class="ui-grid ui-grid--split">
      <div class="stack">
        <UiCard title="Nouveau jeu" hint="Un jeu se rattache aux sessions saisies par les opérateurs.">
          <div class="row q-col-gutter-sm items-end">
            <div class="col-12 col-sm-5">
              <q-input v-model="jeuForm.nom" label="Nom du jeu" outlined dense />
            </div>
            <div class="col-12 col-sm-4">
              <q-input v-model="jeuForm.genre" label="Genre" outlined dense />
            </div>
            <div class="col-12 col-sm-3">
              <UiButton
                icon="add"
                label="Ajouter"
                :loading="savingJeu"
                class="full-width"
                @click="addJeu"
              />
            </div>
          </div>
        </UiCard>

        <UiTable
          :rows="jeux"
          :columns="jeuColumns"
          row-key="id"
          :loading="loading"
          empty-icon="gamepad"
          empty-title="Catalogue vide"
          empty-text="Ajoutez un premier jeu pour l'associer aux sessions."
        >
          <template #body-cell-nom="props">
            <q-td>
              <div class="row-tight">
                <q-icon name="sports_esports" size="16px" style="color: var(--brand)" />
                {{ props.row.nom }}
              </div>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td>
              <div class="row-tight" style="justify-content: center">
                <UiButton variant="icon" icon="edit" tooltip="Modifier le jeu" @click="openJeuEdit(props.row)" />
                <UiButton variant="icon" icon="delete" tooltip="Supprimer le jeu" @click="removeJeu(props.row)" />
              </div>
            </q-td>
          </template>
        </UiTable>
      </div>

      <div class="stack">
        <UiCard title="Nouvelle tarification" hint="Prix appliqué par tranche de durée, par console.">
          <div class="row q-col-gutter-sm items-end">
            <div class="col-12 col-sm-4">
              <q-select
                v-model="tarifForm.consoleId"
                :options="consoleOptions"
                label="Console"
                outlined
                dense
                emit-value
                map-options
                @update:model-value="loadTarifs"
              />
            </div>
            <div class="col-6 col-sm-3">
              <q-input
                v-model.number="tarifForm.dureeMinutes"
                type="number"
                label="Durée"
                suffix="min"
                outlined
                dense
              />
            </div>
            <div class="col-6 col-sm-3">
              <q-input
                v-model.number="tarifForm.prix"
                type="number"
                label="Prix"
                suffix="Ar"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-sm-2">
              <UiButton
                icon="check"
                label="OK"
                :loading="savingTarif"
                class="full-width"
                @click="addTarif"
              />
            </div>
          </div>
        </UiCard>

        <UiTable
          :rows="tarifs"
          :columns="tarifColumns"
          row-key="id"
          :loading="loading"
          empty-icon="sell"
          empty-title="Aucun tarif"
          empty-text="Choisissez une console et ajoutez une première tranche de prix."
        >
          <template #body-cell-prix="props">
            <q-td>
              <span class="num" style="color: var(--brand); font-weight: 600">
                {{ formatAriary(props.row.prix) }}
              </span>
            </q-td>
          </template>
          <template #body-cell-origine="props">
            <q-td>
              <UiBadge
                :tone="props.row.boss_id ? 'ok' : 'neutral'"
                :label="props.row.boss_id ? 'Ma grille' : 'Modèle plateforme'"
              />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td>
              <div
                v-if="isAdmin || props.row.boss_id"
                class="row-tight"
                style="justify-content: center"
              >
                <UiButton variant="icon" icon="edit" tooltip="Modifier le tarif" @click="openTarifEdit(props.row)" />
                <UiButton variant="icon" icon="delete" tooltip="Supprimer le tarif" @click="removeTarif(props.row)" />
              </div>
              <span v-else class="cell-sub">Lecture seule — ajoutez votre propre tarif</span>
            </q-td>
          </template>
        </UiTable>
      </div>
    </div>

    <UiModal v-model="showJeuModal" title="Modifier le jeu">
      <div class="stack" style="--stack-gap: 12px">
        <q-input v-model="jeuEdit.nom" label="Nom" outlined dense />
        <q-input v-model="jeuEdit.genre" label="Genre" outlined dense />
        <q-toggle v-model="jeuEdit.actif" label="Jeu actif" />
      </div>
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showJeuModal = false" />
        <UiButton label="Enregistrer" :loading="savingJeu" @click="saveJeu" />
      </template>
    </UiModal>

    <UiModal v-model="showTarifModal" title="Modifier la tarification">
      <div class="stack" style="--stack-gap: 12px">
        <q-input v-model.number="tarifEdit.dureeMinutes" type="number" label="Durée" suffix="min" outlined dense />
        <q-input v-model.number="tarifEdit.prix" type="number" label="Prix" suffix="Ar" outlined dense />
      </div>
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showTarifModal = false" />
        <UiButton label="Enregistrer" :loading="savingTarif" @click="saveTarif" />
      </template>
    </UiModal>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { api } from 'src/services/api'
import { formatAriary } from 'src/utils/mappers'
import { UiBadge, UiButton, UiCard, UiModal, UiPageHeader, UiTable } from 'src/components/ui'
import { useAuthStore } from 'src/stores/auth-store'

const auth = useAuthStore()
const isAdmin = computed(() => auth.role === 'admin')
const jeux = ref([])
const consoles = ref([])
const tarifs = ref([])
const loading = ref(false)
const savingJeu = ref(false)
const savingTarif = ref(false)
const jeuForm = ref({ nom: '', genre: '' })
const tarifForm = ref({ consoleId: null, dureeMinutes: 10, prix: 400 })
const showJeuModal = ref(false)
const showTarifModal = ref(false)
const jeuEdit = ref({ id: null, nom: '', genre: '', actif: true })
const tarifEdit = ref({ id: null, dureeMinutes: 10, prix: 0 })

const consoleOptions = computed(() => consoles.value.map((c) => ({ label: c.nom, value: c.id })))

const jeuColumns = [
  { name: 'nom', label: 'Jeu', field: 'nom', align: 'left' },
  { name: 'genre', label: 'Genre', field: 'genre', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const tarifColumns = [
  { name: 'duree_minutes', label: 'Durée', field: 'duree_minutes', align: 'left' },
  { name: 'prix', label: 'Prix', field: 'prix', align: 'left' },
  { name: 'origine', label: 'Origine', field: 'boss_id', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

async function loadTarifs() {
  if (!tarifForm.value.consoleId) {
    tarifs.value = []
    return
  }
  try {
    const res = await api.get(`/jeux/tarifications/${tarifForm.value.consoleId}`)
    tarifs.value = Array.isArray(res) ? res : []
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

/** `silent` : rechargement apres une action, sans overlay de chargement. */
async function bootstrap({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const [j, c] = await Promise.all([api.get('/jeux'), api.get('/consoles')])
    jeux.value = Array.isArray(j) ? j : []
    consoles.value = Array.isArray(c) ? c : []
    if (consoles.value.length && !tarifForm.value.consoleId) {
      tarifForm.value.consoleId = consoles.value[0].id
    }
    await loadTarifs()
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    if (!silent) loading.value = false
  }
}

async function addJeu() {
  if (!jeuForm.value.nom.trim()) {
    Notify.create({ type: 'warning', message: 'Le nom du jeu est requis' })
    return
  }
  savingJeu.value = true
  try {
    await api.post('/jeux', jeuForm.value)
    jeuForm.value = { nom: '', genre: '' }
    const j = await api.get('/jeux')
    jeux.value = Array.isArray(j) ? j : []
    Notify.create({ type: 'positive', message: 'Jeu ajouté' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    savingJeu.value = false
  }
}

async function addTarif() {
  savingTarif.value = true
  try {
    await api.post('/jeux/tarifications', tarifForm.value)
    await loadTarifs()
    Notify.create({ type: 'positive', message: 'Tarification ajoutée' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    savingTarif.value = false
  }
}

function openJeuEdit(jeu) {
  jeuEdit.value = { id: jeu.id, nom: jeu.nom, genre: jeu.genre || '', actif: jeu.actif !== false }
  showJeuModal.value = true
}

async function saveJeu() {
  savingJeu.value = true
  try {
    await api.put(`/jeux/${jeuEdit.value.id}`, {
      nom: jeuEdit.value.nom,
      genre: jeuEdit.value.genre,
      actif: jeuEdit.value.actif,
    })
    showJeuModal.value = false
    await bootstrap({ silent: true })
    Notify.create({ type: 'positive', message: 'Jeu mis à jour' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    savingJeu.value = false
  }
}

function removeJeu(jeu) {
  Dialog.create({
    title: 'Supprimer le jeu',
    message: `Désactiver « ${jeu.nom} » ? L'historique des sessions est conservé.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/jeux/${jeu.id}`)
      await bootstrap({ silent: true })
      Notify.create({ type: 'warning', message: 'Jeu désactivé' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

function openTarifEdit(tarif) {
  tarifEdit.value = {
    id: tarif.id,
    dureeMinutes: tarif.duree_minutes,
    prix: Number(tarif.prix),
  }
  showTarifModal.value = true
}

async function saveTarif() {
  savingTarif.value = true
  try {
    await api.put(`/jeux/tarifications/${tarifEdit.value.id}`, {
      dureeMinutes: tarifEdit.value.dureeMinutes,
      prix: tarifEdit.value.prix,
    })
    showTarifModal.value = false
    await loadTarifs()
    Notify.create({ type: 'positive', message: 'Tarif mis à jour' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    savingTarif.value = false
  }
}

function removeTarif(tarif) {
  Dialog.create({
    title: 'Supprimer le tarif',
    message: `Supprimer le tarif ${tarif.duree_minutes} min — ${formatAriary(tarif.prix)} ?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/jeux/tarifications/${tarif.id}`)
      await loadTarifs()
      Notify.create({ type: 'warning', message: 'Tarif supprimé' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

onMounted(bootstrap)
</script>

<style scoped>
.cell-sub {
  font-size: 11px;
  color: var(--text-3);
  white-space: nowrap;
}
</style>
