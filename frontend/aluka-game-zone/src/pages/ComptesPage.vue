<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Gestion des comptes</div>
    <q-card class="modern-card q-mb-md">
      <q-card-section class="row q-col-gutter-sm">
        <div class="col-12 col-md-4"><q-input dense v-model="form.nom" label="Nom" /></div>
        <div class="col-12 col-md-3">
          <q-input dense v-model="form.username" label="Username" />
        </div>
        <div class="col-12 col-md-3">
          <q-input dense v-model="form.motDePasse" type="password" label="Mot de passe" />
        </div>
        <div class="col-12 col-md-2">
          <q-select dense v-model="form.role" :options="roles" label="Role" />
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn class="bg-primary" label="Creer compte" @click="createAccount" />
      </q-card-actions>
    </q-card>

    <q-table :rows="rows" :columns="columns" row-key="id" />
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/services/api'

const $q = useQuasar()
const rows = ref([])
const roles = ['boss', 'jeton']
const form = ref({ nom: '', username: '', motDePasse: '', role: 'jeton' })
const columns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'nom', label: 'Nom', field: 'nom' },
  { name: 'username', label: 'Username', field: 'username' },
  { name: 'role', label: 'Role', field: 'role' },
  { name: 'actif', label: 'Actif', field: 'actif' },
]

async function refresh() {
  rows.value = await api.get('/comptes')
}

async function createAccount() {
  try {
    await api.post('/comptes', form.value)
    form.value = { nom: '', username: '', motDePasse: '', role: 'jeton' }
    await refresh()
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  }
}

onMounted(async () => {
  try {
    await refresh()
  } catch (err) {
    console.error('Comptes load failed', err)
    $q.notify({ type: 'negative', message: err.message || 'Impossible de charger les comptes' })
  }
})
</script>
