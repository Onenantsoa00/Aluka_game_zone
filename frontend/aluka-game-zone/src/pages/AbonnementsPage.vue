<template>
  <q-page class="app-page">
    <div class="page-header">
      <div class="title">Abonnements</div>
      <div class="subtitle">
        Gestion manuelle des abonnements boss — débloquer ou bloquer un compte
      </div>
    </div>

    <div class="dc-card dc-form">
      <div class="text-subtitle2 q-mb-md" style="color: var(--dc-text)">Nouvel abonnement</div>
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-2">
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
        <div class="col-12 col-md-2">
          <q-input v-model="form.dateDebut" type="date" label="Début" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.dateFin" type="date" label="Fin" outlined dense />
        </div>
        <div class="col-12 col-md-2">
          <q-input
            v-model.number="form.montant"
            type="number"
            label="Montant (Ar)"
            outlined
            dense
          />
        </div>
        <div class="col-12 col-md-3">
          <q-input v-model="form.commentaire" label="Commentaire" outlined dense />
        </div>
        <div class="col-12 col-md-1">
          <q-btn class="btn-dc-primary full-width" label="Créer" @click="createAbonnement" />
        </div>
      </div>
    </div>

    <q-table class="dc-table dc-card" flat :rows="rows" :columns="columns" row-key="id">
      <template #body-cell-actions="props">
        <q-td>
          <q-btn
            dense
            flat
            icon="lock_open"
            color="positive"
            title="Débloquer le boss"
            @click="toggleBoss(props.row.boss_id, true)"
          />
          <q-btn
            dense
            flat
            icon="lock"
            color="negative"
            title="Bloquer le boss (impayé)"
            @click="toggleBoss(props.row.boss_id, false)"
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
import { formatAriary } from 'src/utils/mappers'

const rows = ref([])
const comptes = ref([])
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
  { name: 'boss_nom', label: 'Boss', field: 'boss_nom' },
  { name: 'date_debut', label: 'Début', field: 'date_debut' },
  { name: 'date_fin', label: 'Fin', field: 'date_fin' },
  { name: 'montant', label: 'Montant', field: 'montant', format: (v) => formatAriary(v) },
  { name: 'actif', label: 'Actif', field: 'actif', format: (v) => (v ? 'Oui' : 'Non') },
  { name: 'commentaire', label: 'Note', field: 'commentaire' },
  { name: 'actions', label: 'Compte', field: 'actions' },
]

async function refresh() {
  rows.value = await api.get('/abonnements')
}

async function createAbonnement() {
  try {
    await api.post('/abonnements', form.value)
    await refresh()
    Notify.create({ type: 'positive', message: 'Abonnement créé' })
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

async function toggleBoss(bossId, actif) {
  const msg = actif ? 'Débloquer ce compte boss ?' : 'Bloquer ce compte boss (abonnement impayé) ?'
  Dialog.create({ title: 'Confirmation', message: msg, cancel: true }).onOk(async () => {
    await api.patch(`/abonnements/boss/${bossId}/blocage`, { actif })
    Notify.create({
      type: actif ? 'positive' : 'warning',
      message: actif ? 'Compte débloqué' : 'Compte bloqué',
    })
  })
}

onMounted(async () => {
  comptes.value = await api.get('/comptes')
  if (bossOptions.value.length) form.value.bossId = bossOptions.value[0].value
  await refresh()
})
</script>
