<template>
  <q-page class="app-page">
    <div class="page-header">
      <div class="title">Gestion des comptes</div>
      <div class="subtitle">Admin crée des comptes boss · Boss crée des comptes jeton</div>
    </div>

    <div v-if="canCreate" class="dc-card dc-form">
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-3">
          <q-input v-model="form.nom" label="Nom complet" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.username" label="Identifiant" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.motDePasse" type="password" label="Mot de passe" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.telephone" label="Téléphone" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-select
            v-model="form.role"
            :options="roleOptions"
            label="Rôle"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="col-12 col-md-1 flex items-center">
          <q-btn class="btn-dc-primary" label="Créer" @click="createAccount" />
        </div>
      </div>
    </div>

    <q-table class="dc-table dc-card" flat :rows="rows" :columns="columns" row-key="id">
      <template #body-cell-actif="props">
        <q-td>
          <q-toggle
            v-if="isAdmin && props.row.role === 'boss'"
            :model-value="props.row.actif"
            color="cyan"
            @update:model-value="toggleActif(props.row.id, $event)"
          />
          <span v-else :class="props.row.actif ? 'badge-ok' : 'badge-low-stock'">
            {{ props.row.actif ? 'Actif' : 'Bloqué' }}
          </span>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/services/api'
import { useAuthStore } from 'src/stores/auth-store'

const auth = useAuthStore()
const rows = ref([])
const form = ref({ nom: '', username: '', motDePasse: '', telephone: '', role: 'jeton' })

const isAdmin = computed(() => auth.user?.role === 'admin')
const canCreate = computed(() => ['admin', 'boss'].includes(auth.user?.role))

const roleOptions = computed(() => {
  if (isAdmin.value)
    return [
      { label: 'Boss (entrepreneur)', value: 'boss' },
      { label: 'Jeton', value: 'jeton' },
    ]
  return [{ label: 'Jeton', value: 'jeton' }]
})

const columns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'nom', label: 'Nom', field: 'nom' },
  { name: 'username', label: 'Identifiant', field: 'username' },
  { name: 'telephone', label: 'Téléphone', field: 'telephone' },
  { name: 'role', label: 'Rôle', field: 'role' },
  { name: 'actif', label: 'Statut', field: 'actif' },
]

async function refresh() {
  rows.value = await api.get('/comptes')
}

async function createAccount() {
  try {
    await api.post('/comptes', form.value)
    form.value = { nom: '', username: '', motDePasse: '', telephone: '', role: 'jeton' }
    await refresh()
    Notify.create({ type: 'positive', message: 'Compte créé' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

async function toggleActif(id, actif) {
  try {
    await api.patch(`/comptes/${id}/actif`, { actif })
    await refresh()
    Notify.create({
      type: actif ? 'positive' : 'warning',
      message: actif ? 'Compte débloqué' : 'Compte bloqué',
    })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

onMounted(refresh)
</script>
