<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Gestion des comptes"
      subtitle="L'admin crée les comptes boss, le boss crée les comptes jeton. Un compte bloqué ne peut plus se connecter."
    >
      <template #actions>
        <UiBadge tone="neutral" :label="`${rows.length} compte(s)`" />
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="refresh" />
      </template>
    </UiPageHeader>

    <UiCard
      v-if="canCreate"
      title="Créer un compte"
      hint="Le mot de passe est stocké chiffré (bcrypt) côté serveur."
      class="q-mb-lg"
    >
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-3">
          <q-input v-model="form.nom" label="Nom complet" outlined dense />
        </div>
        <div class="col-12 col-sm-3">
          <q-input v-model="form.username" label="Identifiant" outlined dense />
        </div>
        <div class="col-12 col-sm-3">
          <q-input
            v-model="form.motDePasse"
            type="password"
            label="Mot de passe"
            outlined
            dense
            autocomplete="new-password"
          />
        </div>
        <div class="col-12 col-sm-2">
          <q-input v-model="form.telephone" label="Téléphone" outlined dense />
        </div>
        <div class="col-6 col-sm-2">
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
        <div class="col-6 col-sm-2">
          <UiButton
            icon="person_add"
            label="Créer"
            :loading="saving"
            class="full-width"
            @click="createAccount"
          />
        </div>
      </div>
    </UiCard>

    <UiTable
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      empty-icon="groups"
      empty-title="Aucun compte"
      empty-text="Créez un compte boss ou jeton pour déléguer la gestion."
    >
      <template #body-cell-nom="props">
        <q-td>
          <div class="row-tight">
            <span
              style="display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: var(--brand-soft); color: var(--brand); font-size: 11px; font-weight: 700"
            >
              {{ initials(props.row.nom) }}
            </span>
            {{ props.row.nom }}
          </div>
        </q-td>
      </template>
      <template #body-cell-role="props">
        <q-td>
          <UiBadge :tone="roleTone(props.row.role)" :label="roleLabel(props.row.role)" />
        </q-td>
      </template>
      <template #body-cell-actif="props">
        <q-td>
          <q-toggle
            v-if="isAdmin && props.row.role === 'boss'"
            :model-value="props.row.actif"
            color="cyan"
            :aria-label="`Activer ou bloquer ${props.row.nom}`"
            @update:model-value="toggleActif(props.row.id, $event)"
          />
          <UiBadge
            v-else
            :tone="props.row.actif ? 'ok' : 'danger'"
            :label="props.row.actif ? 'Actif' : 'Bloqué'"
          />
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td>
          <div class="row-tight" style="justify-content: center">
            <UiButton
              variant="icon"
              icon="edit"
              tooltip="Modifier le compte"
              @click="openEdit(props.row)"
            />
            <UiButton
              v-if="props.row.id !== auth.user?.id"
              variant="icon"
              icon="person_off"
              tooltip="Désactiver le compte"
              @click="removeCompte(props.row)"
            />
          </div>
        </q-td>
      </template>
    </UiTable>

    <UiModal
      v-model="showModal"
      title="Modifier le compte"
      subtitle="Laisser le mot de passe vide pour le conserver."
    >
      <div class="stack" style="--stack-gap: 12px">
        <q-input v-model="edit.nom" label="Nom complet" outlined dense />
        <q-input v-model="edit.telephone" label="Téléphone" outlined dense />
        <q-select
          v-model="edit.role"
          :options="roleOptions"
          label="Rôle"
          outlined
          dense
          emit-value
          map-options
        />
        <q-input
          v-model="edit.motDePasse"
          type="password"
          label="Nouveau mot de passe (optionnel)"
          outlined
          dense
          autocomplete="new-password"
        />
      </div>
      <template #actions>
        <UiButton variant="ghost" label="Annuler" @click="showModal = false" />
        <UiButton label="Enregistrer" :loading="saving" @click="saveEdit" />
      </template>
    </UiModal>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { api } from 'src/services/api'
import { useAuthStore } from 'src/stores/auth-store'
import { UiBadge, UiButton, UiCard, UiModal, UiPageHeader, UiTable } from 'src/components/ui'

const auth = useAuthStore()
const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const form = ref({ nom: '', username: '', motDePasse: '', telephone: '', role: 'jeton' })
const edit = ref({ id: null, nom: '', telephone: '', role: 'jeton', motDePasse: '' })

const isAdmin = computed(() => auth.user?.role === 'admin')
const canCreate = computed(() => ['admin', 'boss'].includes(auth.user?.role))

const roleOptions = computed(() => {
  if (isAdmin.value) {
    return [
      { label: 'Administrateur', value: 'admin' },
      { label: 'Boss (entrepreneur)', value: 'boss' },
      { label: 'Jeton (opérateur)', value: 'jeton' },
    ]
  }
  return [{ label: 'Jeton (opérateur)', value: 'jeton' }]
})

const columns = [
  { name: 'nom', label: 'Nom', field: 'nom', align: 'left' },
  { name: 'username', label: 'Identifiant', field: 'username', align: 'left' },
  { name: 'telephone', label: 'Téléphone', field: 'telephone', align: 'left' },
  { name: 'role', label: 'Rôle', field: 'role', align: 'left' },
  { name: 'actif', label: 'Statut', field: 'actif', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const roleLabel = (role) =>
  ({ admin: 'Administrateur', boss: 'Entrepreneur', jeton: 'Opérateur' })[role] || role
const roleTone = (role) => ({ admin: 'brand', boss: 'info', jeton: 'neutral' })[role] || 'neutral'

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

/** `silent` : rechargement apres une action, sans overlay de chargement. */
async function refresh({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const res = await api.get('/comptes')
    rows.value = Array.isArray(res) ? res : []
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    if (!silent) loading.value = false
  }
}

async function createAccount() {
  if (!form.value.nom?.trim() || !form.value.username?.trim() || !form.value.motDePasse) {
    Notify.create({ type: 'warning', message: 'Nom, identifiant et mot de passe sont requis' })
    return
  }
  saving.value = true
  try {
    await api.post('/comptes', form.value)
    form.value = { nom: '', username: '', motDePasse: '', telephone: '', role: 'jeton' }
    await refresh({ silent: true })
    Notify.create({ type: 'positive', message: 'Compte créé' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

function openEdit(row) {
  edit.value = {
    id: row.id,
    nom: row.nom,
    telephone: row.telephone || '',
    role: row.role,
    motDePasse: '',
  }
  showModal.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    await api.put(`/comptes/${edit.value.id}`, {
      nom: edit.value.nom,
      telephone: edit.value.telephone,
      role: edit.value.role,
      motDePasse: edit.value.motDePasse || undefined,
    })
    showModal.value = false
    await refresh({ silent: true })
    Notify.create({ type: 'positive', message: 'Compte mis à jour' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

function removeCompte(row) {
  Dialog.create({
    title: 'Désactiver le compte',
    message: `Désactiver « ${row.nom} » ? Ses jetons seront révoqués immédiatement.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/comptes/${row.id}`)
      await refresh({ silent: true })
      Notify.create({ type: 'warning', message: 'Compte désactivé' })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

async function toggleActif(id, actif) {
  try {
    await api.patch(`/comptes/${id}/actif`, { actif })
    await refresh({ silent: true })
    Notify.create({
      type: actif ? 'positive' : 'warning',
      message: actif ? 'Compte débloqué' : 'Compte bloqué',
    })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
    await refresh({ silent: true })
  }
}

onMounted(refresh)
</script>
