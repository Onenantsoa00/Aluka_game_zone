<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Matériels & stock"
      subtitle="Inventaire par salle, seuils d'alerte et mouvements d'entrée / sortie."
    >
      <template #actions>
        <UiBadge :tone="alertCount ? 'warn' : 'ok'" :label="`${alertCount} alerte(s) de stock`" />
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="refresh" />
      </template>
    </UiPageHeader>

    <UiCard title="Ajouter un matériel" hint="Le seuil minimum déclenche l'alerte de réapprovisionnement." class="q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-2">
          <q-select
            v-model="form.salleId"
            :options="salleOptions"
            label="Salle"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input v-model="form.nom" label="Nom" outlined dense />
        </div>
        <div class="col-12 col-sm-2">
          <q-input v-model="form.categorie" label="Catégorie" outlined dense />
        </div>
        <div class="col-6 col-sm-1">
          <q-input v-model.number="form.quantite" type="number" label="Qté" outlined dense />
        </div>
        <div class="col-6 col-sm-1">
          <q-input v-model.number="form.stockMinimum" type="number" label="Min" outlined dense />
        </div>
        <div class="col-12 col-sm-1">
          <q-input v-model="form.etat" label="État" outlined dense />
        </div>
        <div class="col-12 col-sm-2">
          <UiButton icon="add" label="Ajouter" :loading="saving" class="full-width" @click="addMateriel" />
        </div>
      </div>
    </UiCard>

    <UiTable
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      empty-icon="inventory_2"
      empty-title="Aucun matériel"
      empty-text="Ajoutez manettes, casques ou câbles pour suivre le stock par salle."
    >
      <template #body-cell-stock="props">
        <q-td>
          <div style="min-width: 120px">
            <div class="row items-center" style="gap: 8px">
              <span class="num" style="font-weight: 600">{{ props.row.quantite }}</span>
              <span class="dim" style="font-size: 11.5px">/ min {{ props.row.stock_minimum }}</span>
            </div>
            <div class="ui-meter" style="margin-top: 6px; height: 4px">
              <div
                class="ui-meter__fill"
                :style="{
                  width: `${stockRatio(props.row)}%`,
                  background:
                    props.row.quantite <= props.row.stock_minimum ? 'var(--danger)' : 'var(--brand)',
                }"
              />
            </div>
          </div>
        </q-td>
      </template>
      <template #body-cell-etat="props">
        <q-td>
          <UiBadge
            :tone="props.row.etat === 'bon' ? 'ok' : 'warn'"
            :label="props.row.etat || 'Non renseigné'"
          />
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td>
          <div class="row-tight" style="justify-content: center">
            <UiButton
              variant="icon"
              icon="add"
              tooltip="Entrée de stock"
              @click="mouvement(props.row, 'entree')"
            />
            <UiButton
              variant="icon"
              icon="remove"
              tooltip="Sortie de stock"
              @click="mouvement(props.row, 'sortie')"
            />
          </div>
        </q-td>
      </template>
    </UiTable>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { api } from 'src/services/api'
import { UiBadge, UiButton, UiCard, UiPageHeader, UiTable } from 'src/components/ui'

const rows = ref([])
const salles = ref([])
const loading = ref(false)
const saving = ref(false)
const form = ref({
  salleId: null,
  nom: '',
  categorie: '',
  quantite: 0,
  stockMinimum: 5,
  etat: 'bon',
})

const salleOptions = computed(() => salles.value.map((s) => ({ label: s.nom, value: s.id })))
const alertCount = computed(
  () => rows.value.filter((r) => Number(r.quantite) <= Number(r.stock_minimum)).length,
)

const columns = [
  { name: 'nom', label: 'Matériel', field: 'nom', align: 'left' },
  { name: 'categorie', label: 'Catégorie', field: 'categorie', align: 'left' },
  { name: 'stock', label: 'Stock', field: 'quantite', align: 'left' },
  { name: 'etat', label: 'État', field: 'etat', align: 'left' },
  { name: 'actions', label: 'Mouvement', field: 'actions', align: 'center' },
]

function stockRatio(row) {
  const min = Number(row.stock_minimum) || 0
  const qty = Number(row.quantite) || 0
  const target = Math.max(min * 2, 1)
  return Math.min(100, Math.round((qty / target) * 100))
}

/** `silent` : rechargement apres une action, sans overlay de chargement. */
async function refresh({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const [m, s] = await Promise.all([api.get('/materiels'), api.get('/salles')])
    rows.value = Array.isArray(m) ? m : []
    salles.value = Array.isArray(s) ? s : []
    if (salles.value.length && !form.value.salleId) form.value.salleId = salles.value[0].id
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    if (!silent) loading.value = false
  }
}

async function addMateriel() {
  if (!form.value.nom.trim()) {
    Notify.create({ type: 'warning', message: 'Le nom du matériel est requis' })
    return
  }
  saving.value = true
  try {
    await api.post('/materiels', form.value)
    form.value = { ...form.value, nom: '', categorie: '', quantite: 0 }
    await refresh({ silent: true })
    Notify.create({ type: 'positive', message: 'Matériel ajouté' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

function mouvement(row, type) {
  Dialog.create({
    title: type === 'entree' ? 'Entrée de stock' : 'Sortie de stock',
    message: `${row.nom} — quantité actuelle : ${row.quantite}`,
    prompt: { model: '1', type: 'number', label: 'Quantité' },
    cancel: true,
    persistent: true,
  }).onOk(async (qty) => {
    const quantite = Number(qty)
    if (!(quantite > 0)) {
      Notify.create({ type: 'warning', message: 'Quantité invalide' })
      return
    }
    try {
      await api.post('/materiels/mouvements', {
        materielId: row.id,
        typeMouvement: type,
        quantite,
      })
      await refresh({ silent: true })
      Notify.create({ type: 'positive', message: 'Mouvement enregistré' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

onMounted(refresh)
</script>
