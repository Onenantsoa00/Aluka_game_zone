<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Gestion des tournois</div>
    <q-table :rows="rows" :columns="columns" row-key="id" />
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { api } from 'src/services/api'

const rows = ref([])
const columns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'nom', label: 'Nom', field: 'nom' },
  { name: 'mise', label: 'Mise', field: 'mise' },
  { name: 'recompense', label: 'Recompense', field: 'recompense' },
  { name: 'date_tournoi', label: 'Date', field: 'date_tournoi' },
]

onMounted(async () => {
  rows.value = await api.get('/tournois')
})
</script>
