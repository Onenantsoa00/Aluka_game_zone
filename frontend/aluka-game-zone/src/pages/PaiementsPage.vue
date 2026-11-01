<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Paiements jeton"
      subtitle="Modèles de rémunération des opérateurs : fraction, pourcentage, salaire fixe ou % après seuil."
    >
      <template #actions>
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="refresh" />
      </template>
    </UiPageHeader>

    <div class="ui-grid ui-grid--split">
      <div class="stack">
        <UiCard title="Nouveau modèle" hint="Une fraction s'exprime entre 0 et 1 (1/3 = 0.3333).">
          <div class="row q-col-gutter-sm items-end">
            <div class="col-12 col-sm-4">
              <q-input v-model="modeleForm.nomModele" label="Nom du modèle" outlined dense />
            </div>
            <div class="col-12 col-sm-4">
              <q-select
                v-model="modeleForm.typeModele"
                :options="typeOptions"
                label="Type"
                outlined
                dense
                emit-value
                map-options
              />
            </div>
            <div class="col-6 col-sm-2">
              <q-input v-model.number="modeleForm.valeur" type="number" label="Valeur" outlined dense />
            </div>
            <div class="col-6 col-sm-2">
              <q-input
                v-if="modeleForm.typeModele === 'pourcentage_seuil'"
                v-model.number="modeleForm.seuil"
                type="number"
                label="Seuil (Ar)"
                outlined
                dense
              />
            </div>
            <div class="col-12" style="font-size: 12px; color: var(--text-3)">
              {{ modeleHint }}
            </div>
            <div class="col-12">
              <UiButton
                icon="add"
                label="Créer le modèle"
                :loading="savingModele"
                @click="addModele"
              />
            </div>
          </div>
        </UiCard>

        <UiTable
          :rows="modeles"
          :columns="modeleColumns"
          row-key="id"
          :loading="loading"
          empty-icon="tune"
          empty-title="Aucun modèle"
          empty-text="Créez un modèle de rémunération pour l'affecter à un opérateur."
        >
          <template #body-cell-type_modele="props">
            <q-td>
              <UiBadge tone="neutral" :label="typeLabel(props.row.type_modele)" />
            </q-td>
          </template>
          <template #body-cell-description="props">
            <q-td>{{ describeModele(props.row) }}</q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td>
              <div class="row-tight" style="justify-content: center">
                <UiButton variant="icon" icon="edit" tooltip="Modifier" @click="openEdit(props.row)" />
                <UiButton variant="icon" icon="delete" tooltip="Supprimer" @click="removeModele(props.row)" />
              </div>
            </q-td>
          </template>
        </UiTable>
      </div>

      <div class="stack">
        <UiCard title="Affecter à un opérateur" hint="L'affectation prend effet immédiatement.">
          <div class="row q-col-gutter-sm items-end">
            <div class="col-12 col-sm-5">
              <q-select
                v-model="affectForm.jetonId"
                :options="jetonOptions"
                label="Jeton"
                outlined
                dense
                emit-value
                map-options
              />
            </div>
            <div class="col-12 col-sm-4">
              <q-select
                v-model="affectForm.modeleId"
                :options="modeleOptions"
                label="Modèle"
                outlined
                dense
                emit-value
                map-options
              />
            </div>
            <div class="col-12 col-sm-3">
              <UiButton
                icon="link"
                label="Affecter"
                :loading="savingAffect"
                class="full-width"
                @click="addAffectation"
              />
            </div>
          </div>
        </UiCard>

        <UiTable
          :rows="affectations"
          :columns="affectColumns"
          row-key="id"
          :loading="loading"
          empty-icon="link_off"
          empty-title="Aucune affectation"
          empty-text="Affectez un modèle à un opérateur pour calculer sa rémunération."
        >
          <template #body-cell-regle="props">
            <q-td>{{ describeModele(props.row) }}</q-td>
          </template>
        </UiTable>
      </div>
    </div>

    <UiCard
      title="Rémunérations calculées"
      hint="Recette nette (encaissements − remboursements) par opérateur, règle et seuil appliqués."
      class="q-mt-lg"
    >
      <div class="row q-col-gutter-sm items-end q-mb-md">
        <div class="col-6 col-sm-3">
          <q-input v-model="periode.dateDebut" type="date" label="Du" outlined stack-label dense />
        </div>
        <div class="col-6 col-sm-3">
          <q-input v-model="periode.dateFin" type="date" label="Au" outlined stack-label dense />
        </div>
        <div class="col-12 col-sm-3">
          <UiButton icon="calculate" label="Calculer" :loading="loadingPaie" @click="loadRemunerations" />
        </div>
        <div class="col-12 col-sm-3 text-right">
          <span class="num" style="color: var(--brand); font-weight: 600">
            Total : {{ formatAriary(remunerations.total) }}
          </span>
        </div>
      </div>

      <UiTable
        :rows="remunerations.lignes"
        :columns="paieColumns"
        row-key="jetonId"
        :loading="loadingPaie"
        empty-icon="payments"
        empty-title="Aucune rémunération"
        empty-text="Aucune recette sur la période pour les opérateurs."
      >
        <template #body-cell-recette="props">
          <q-td><span class="num">{{ formatAriary(props.row.recette) }}</span></q-td>
        </template>
        <template #body-cell-montant="props">
          <q-td><span class="num">{{ formatAriary(props.row.montant) }}</span></q-td>
        </template>
        <template #body-cell-regle="props">
          <q-td>{{ regimeLabel(props.row) }}</q-td>
        </template>
      </UiTable>
    </UiCard>

    <UiModal v-model="showModal" title="Modifier le modèle">
      <div class="stack" style="--stack-gap: 12px">
        <q-input v-model="edit.nomModele" label="Nom du modèle" outlined dense />
        <q-select
          v-model="edit.typeModele"
          :options="typeOptions"
          label="Type"
          outlined
          dense
          emit-value
          map-options
        />
        <q-input v-model.number="edit.valeur" type="number" label="Valeur" outlined dense />
        <q-input
          v-if="edit.typeModele === 'pourcentage_seuil'"
          v-model.number="edit.seuil"
          type="number"
          label="Seuil (Ar)"
          outlined
          dense
        />
      </div>
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showModal = false" />
        <UiButton label="Enregistrer" :loading="savingModele" @click="saveEdit" />
      </template>
    </UiModal>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { api } from 'src/services/api'
import { TYPE_MODELE_OPTIONS, describeModele, formatAriary } from 'src/utils/mappers'
import { UiBadge, UiButton, UiCard, UiModal, UiPageHeader, UiTable } from 'src/components/ui'

const today = new Date().toISOString().slice(0, 10)
const modeles = ref([])
const affectations = ref([])
const comptes = ref([])
const loading = ref(false)
const loadingPaie = ref(false)
const savingModele = ref(false)
const savingAffect = ref(false)
const showModal = ref(false)
const modeleForm = ref({ nomModele: '', typeModele: 'pourcentage', valeur: 20, seuil: 50000 })
const edit = ref({ id: null, nomModele: '', typeModele: 'pourcentage', valeur: 0, seuil: null })
const affectForm = ref({ jetonId: null, modeleId: null })
const periode = ref({ dateDebut: today, dateFin: today })
const remunerations = ref({ total: 0, lignes: [] })

const typeOptions = TYPE_MODELE_OPTIONS

const modeleHint = computed(() => {
  switch (modeleForm.value.typeModele) {
    case 'fraction':
      return 'Fraction : 0.3333 = 1/3 de la recette.'
    case 'pourcentage':
      return 'Pourcentage de la recette (0 à 100).'
    case 'fixe_journalier':
      return 'Montant fixe versé par jour travaillé.'
    case 'pourcentage_seuil':
      return 'Pourcentage appliqué seulement au-delà du seuil de recette.'
    default:
      return ''
  }
})

const jetonOptions = computed(() =>
  comptes.value.filter((c) => c.role === 'jeton').map((c) => ({ label: c.nom, value: c.id })),
)
const modeleOptions = computed(() =>
  modeles.value.map((m) => ({ label: m.nom_modele, value: m.id })),
)

const modeleColumns = [
  { name: 'nom_modele', label: 'Modèle', field: 'nom_modele', align: 'left' },
  { name: 'type_modele', label: 'Type', field: 'type_modele', align: 'left' },
  { name: 'description', label: 'Règle', field: 'description', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const affectColumns = [
  { name: 'jeton_nom', label: 'Opérateur', field: 'jeton_nom', align: 'left' },
  { name: 'nom_modele', label: 'Modèle', field: 'nom_modele', align: 'left' },
  { name: 'regle', label: 'Règle', field: 'regle', align: 'left' },
  { name: 'date_debut', label: 'Depuis', field: 'date_debut', align: 'left' },
]

const paieColumns = [
  { name: 'jetonNom', label: 'Opérateur', field: 'jetonNom', align: 'left' },
  { name: 'recette', label: 'Recette nette', field: 'recette', align: 'right' },
  { name: 'regle', label: 'Règle appliquée', field: 'regle', align: 'left' },
  { name: 'montant', label: 'Rémunération', field: 'montant', align: 'right' },
]

function typeLabel(type) {
  return typeOptions.find((o) => o.value === type)?.label || type
}

/** La remuneration renvoie typeModele/valeur/seuil (camelCase). */
function regimeLabel(row) {
  if (!row.modeleNom) return 'Aucun modèle affecté'
  return describeModele({
    type_modele: row.typeModele,
    valeur: row.valeur,
    seuil: row.seuil,
  })
}

function validateModele(modele) {
  if (!modele.nomModele?.trim()) return 'Le nom du modèle est requis'
  const valeur = Number(modele.valeur)
  if (!Number.isFinite(valeur) || valeur < 0) return 'Valeur invalide'
  if (modele.typeModele === 'fraction' && valeur > 1) return 'Une fraction doit être entre 0 et 1'
  if (['pourcentage', 'pourcentage_seuil'].includes(modele.typeModele) && valeur > 100) {
    return 'Un pourcentage doit être entre 0 et 100'
  }
  if (modele.typeModele === 'pourcentage_seuil' && !(Number(modele.seuil) > 0)) {
    return 'Un seuil positif est requis'
  }
  return null
}

/** `silent` : rechargement apres une action, sans overlay de chargement. */
async function refresh({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const [m, a, c] = await Promise.all([
      api.get('/paiements/modeles'),
      api.get('/paiements/affectations'),
      api.get('/comptes'),
    ])
    modeles.value = Array.isArray(m) ? m : []
    affectations.value = Array.isArray(a) ? a : []
    comptes.value = Array.isArray(c) ? c : []
    await loadRemunerations()
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    if (!silent) loading.value = false
  }
}

async function loadRemunerations() {
  loadingPaie.value = true
  try {
    const res = await api.get(
      `/paiements/remunerations?dateDebut=${periode.value.dateDebut}&dateFin=${periode.value.dateFin}`,
    )
    remunerations.value = { total: Number(res?.total) || 0, lignes: res?.lignes || [] }
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    loadingPaie.value = false
  }
}

async function addModele() {
  const error = validateModele(modeleForm.value)
  if (error) {
    Notify.create({ type: 'warning', message: error })
    return
  }
  savingModele.value = true
  try {
    await api.post('/paiements/modeles', modeleForm.value)
    modeleForm.value = { nomModele: '', typeModele: 'pourcentage', valeur: 20, seuil: 50000 }
    await refresh({ silent: true })
    Notify.create({ type: 'positive', message: 'Modèle créé' })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message })
  } finally {
    savingModele.value = false
  }
}

function openEdit(modele) {
  edit.value = {
    id: modele.id,
    nomModele: modele.nom_modele,
    typeModele: modele.type_modele,
    valeur: Number(modele.valeur),
    seuil: modele.seuil == null ? null : Number(modele.seuil),
  }
  showModal.value = true
}

async function saveEdit() {
  const error = validateModele(edit.value)
  if (error) {
    Notify.create({ type: 'warning', message: error })
    return
  }
  savingModele.value = true
  try {
    await api.put(`/paiements/modeles/${edit.value.id}`, {
      nomModele: edit.value.nomModele,
      typeModele: edit.value.typeModele,
      valeur: edit.value.valeur,
      seuil: edit.value.seuil,
    })
    showModal.value = false
    await refresh({ silent: true })
    Notify.create({ type: 'positive', message: 'Modèle mis à jour' })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message })
  } finally {
    savingModele.value = false
  }
}

function removeModele(modele) {
  Dialog.create({
    title: 'Supprimer le modèle',
    message: `Supprimer « ${modele.nom_modele} » ?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/paiements/modeles/${modele.id}`)
      await refresh({ silent: true })
      Notify.create({ type: 'warning', message: 'Modèle supprimé' })
    } catch (err) {
      Notify.create({ type: 'negative', message: err.message })
    }
  })
}

async function addAffectation() {
  if (!affectForm.value.jetonId || !affectForm.value.modeleId) {
    Notify.create({ type: 'warning', message: 'Sélectionnez un opérateur et un modèle' })
    return
  }
  savingAffect.value = true
  try {
    await api.post('/paiements/affectations', affectForm.value)
    await refresh({ silent: true })
    Notify.create({ type: 'positive', message: 'Affectation enregistrée' })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message })
  } finally {
    savingAffect.value = false
  }
}

onMounted(refresh)
</script>
