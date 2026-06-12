<template>
  <q-page class="app-page">
    <div class="page-header">
      <div class="title">Gestion des matériels</div>
      <div class="subtitle">Stock, disponibilité et mouvements d'inventaire par salle</div>
    </div>

    <div class="dc-card dc-form">
      <div class="text-subtitle2 q-mb-md" style="color: var(--dc-text)">Ajouter un matériel</div>
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-2">
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
        <div class="col-12 col-md-2">
          <q-input v-model="form.nom" label="Nom" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.categorie" label="Catégorie" outlined dense />
        </div>
        <div class="col-12 col-md-1">
          <q-input v-model.number="form.quantite" type="number" label="Qté" outlined dense />
        </div>
        <div class="col-12 col-md-1">
          <q-input v-model.number="form.stockMinimum" type="number" label="Min" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.etat" label="État" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-btn class="btn-dc-primary" label="Ajouter" @click="addMateriel" />
        </div>
      </div>
    </div>

    <q-table class="dc-table dc-card" flat :rows="rows" :columns="columns" row-key="id">
      <template #body-cell-stock="props">
        <q-td>
          <span
            :class="props.row.quantite <= props.row.stock_minimum ? 'badge-low-stock' : 'badge-ok'"
          >
            {{ props.row.quantite }} / min {{ props.row.stock_minimum }}
          </span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td>
          <q-btn dense flat icon="add" color="positive" @click="mouvement(props.row, 'entree')" />
          <q-btn
            dense
            flat
            icon="remove"
            color="negative"
            @click="mouvement(props.row, 'sortie')"
          />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { api } from 'src/services/api'

const rows = ref([])
const salles = ref([])
const form = ref({
  salleId: null,
  nom: '',
  categorie: '',
  quantite: 0,
  stockMinimum: 5,
  etat: 'bon',
})

const salleOptions = computed(() => salles.value.map((s) => ({ label: s.nom, value: s.id })))

const columns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'nom', label: 'Matériel', field: 'nom' },
  { name: 'categorie', label: 'Catégorie', field: 'categorie' },
  { name: 'stock', label: 'Stock', field: 'quantite' },
  { name: 'etat', label: 'État', field: 'etat' },
  { name: 'actions', label: 'Mouvement', field: 'actions' },
]

async function refresh() {
  rows.value = await api.get('/materiels')
}

async function addMateriel() {
  try {
    await api.post('/materiels', form.value)
    form.value = { ...form.value, nom: '', categorie: '', quantite: 0 }
    await refresh()
    Notify.create({ type: 'positive', message: 'Matériel ajouté' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

function mouvement(row, type) {
  Dialog.create({
    title: type === 'entree' ? 'Entrée stock' : 'Sortie stock',
    prompt: { model: '1', type: 'number', label: 'Quantité' },
    cancel: true,
  }).onOk(async (qty) => {
    await api.post('/materiels/mouvements', {
      materielId: row.id,
      typeMouvement: type,
      quantite: Number(qty),
    })
    await refresh()
  })
}

onMounted(async () => {
  salles.value = await api.get('/salles')
  if (salles.value.length) form.value.salleId = salles.value[0].id
  await refresh()
})
</script>
