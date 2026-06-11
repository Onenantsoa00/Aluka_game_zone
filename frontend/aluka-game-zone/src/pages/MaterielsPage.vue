<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Gestion des materiels</div>
    <q-table :rows="rows" :columns="columns" row-key="id" />
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { api } from 'src/services/api'

const rows = ref([])
const columns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'nom', label: 'Materiel', field: 'nom' },
  { name: 'categorie', label: 'Categorie', field: 'categorie' },
  { name: 'quantite', label: 'Quantite', field: 'quantite' },
  { name: 'stock_minimum', label: 'Stock min', field: 'stock_minimum' },
  { name: 'etat', label: 'Etat', field: 'etat' },
]

onMounted(async () => {
  rows.value = await api.get('/materiels')
})
</script>
