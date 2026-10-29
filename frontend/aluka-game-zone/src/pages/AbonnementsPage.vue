<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Abonnements"
      subtitle="Gestion manuelle des abonnements boss : enregistrer une période payée et débloquer ou bloquer un compte."
    >
      <template #actions>
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="refresh" />
      </template>
    </UiPageHeader>

    <UiCard title="Nouvel abonnement" hint="Le blocage coupe immédiatement l'accès du boss." class="q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-2">
          <q-select
            v-model="form.bossId"
            :options="bossOptions"
            label="Boss"
            outlined
            dense
            emit-value
            map-options
          />
        </div>
        <div class="col-6 col-sm-2">
          <q-input v-model="form.dateDebut" type="date" label="Début" outlined stack-label dense />
        </div>
        <div class="col-6 col-sm-2">
          <q-input v-model="form.dateFin" type="date" label="Fin" outlined stack-label dense />
        </div>
        <div class="col-6 col-sm-2">
          <q-input v-model.number="form.montant" type="number" label="Montant" suffix="Ar" outlined dense />
        </div>
        <div class="col-12 col-sm-2">
          <q-input v-model="form.commentaire" label="Commentaire" outlined dense />
        </div>
        <div class="col-12 col-sm-2">
          <UiButton
            icon="card_membership"
            label="Créer"
            :loading="saving"
            class="full-width"
            @click="createAbonnement"
          />
        </div>
      </div>
    </UiCard>

    <UiTable
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      empty-icon="card_membership"
      empty-title="Aucun abonnement"
      empty-text="Enregistrez la période payée par un boss pour activer son compte."
    >
      <template #body-cell-montant="props">
        <q-td>
          <span class="num">{{ formatAriary(props.row.montant) }}</span>
        </q-td>
      </template>
      <template #body-cell-actif="props">
        <q-td>
          <UiBadge
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
              icon="lock_open"
              tooltip="Débloquer ce boss"
              @click="toggleBoss(props.row.boss_id, true)"
            />
            <UiButton
              variant="icon"
              icon="lock"
              tooltip="Bloquer ce boss (impayé)"
              @click="toggleBoss(props.row.boss_id, false)"
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
import { formatAriary } from 'src/utils/mappers'
import { UiBadge, UiButton, UiCard, UiPageHeader, UiTable } from 'src/components/ui'

const rows = ref([])
const comptes = ref([])
const loading = ref(false)
const saving = ref(false)
const form = ref({
  bossId: null,
  dateDebut: new Date().toISOString().slice(0, 10),
  dateFin: '',
  montant: 0,
  commentaire: '',
})

const bossOptions = computed(() =>
  comptes.value.filter((c) => c.role === 'boss').map((c) => ({ label: c.nom, value: c.id })),
)

const columns = [
  { name: 'boss_nom', label: 'Boss', field: 'boss_nom', align: 'left' },
  { name: 'date_debut', label: 'Début', field: 'date_debut', align: 'left' },
  { name: 'date_fin', label: 'Fin', field: 'date_fin', align: 'left' },
  { name: 'montant', label: 'Montant', field: 'montant', align: 'right' },
  { name: 'actif', label: 'Statut', field: 'actif', align: 'left' },
  { name: 'commentaire', label: 'Note', field: 'commentaire', align: 'left' },
  { name: 'actions', label: 'Compte', field: 'actions', align: 'center' },
]

async function refresh() {
  loading.value = true
  try {
    const [a, c] = await Promise.all([api.get('/abonnements'), api.get('/comptes')])
    rows.value = Array.isArray(a) ? a : []
    comptes.value = Array.isArray(c) ? c : []
    if (bossOptions.value.length && !form.value.bossId) {
      form.value.bossId = bossOptions.value[0].value
    }
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}

async function createAbonnement() {
  if (!form.value.bossId) {
    Notify.create({ type: 'warning', message: 'Sélectionnez un boss' })
    return
  }
  saving.value = true
  try {
    await api.post('/abonnements', form.value)
    await refresh()
    Notify.create({ type: 'positive', message: 'Abonnement créé' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    saving.value = false
  }
}

function toggleBoss(bossId, actif) {
  Dialog.create({
    title: 'Confirmation',
    message: actif ? 'Débloquer ce compte boss ?' : 'Bloquer ce compte boss (abonnement impayé) ?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.patch(`/abonnements/boss/${bossId}/blocage`, { actif })
      await refresh()
      Notify.create({
        type: actif ? 'positive' : 'warning',
        message: actif ? 'Compte débloqué' : 'Compte bloqué',
      })
    } catch (error) {
      Notify.create({ type: 'negative', message: error.message })
    }
  })
}

onMounted(refresh)
</script>
