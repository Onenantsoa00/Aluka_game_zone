<template>
  <q-page class="app-page">
    <UiPageHeader
      title="Caisse — rapport Z"
      subtitle="Arrêté de caisse de fin de journée : encaissements, remboursements et net par caissier et par salle."
    >
      <template #actions>
        <UiButton variant="ghost" icon="refresh" label="Actualiser" :loading="loading" @click="load" />
        <UiButton variant="ghost" icon="download" label="Export CSV" @click="exportCsv" />
        <UiButton icon="print" label="Imprimer" @click="print" />
      </template>
    </UiPageHeader>

    <UiCard class="q-mb-lg">
      <div class="row q-col-gutter-sm items-end">
        <div class="col-12 col-sm-4">
          <q-input v-model="date" type="date" label="Journée" outlined stack-label dense />
        </div>
        <div class="col-12 col-sm-4">
          <UiButton icon="search" label="Afficher" :loading="loading" @click="load" />
        </div>
        <div class="col-12 col-sm-4 text-right" style="font-size: 12px; color: var(--text-3)">
          Généré par {{ rapport.generePar || '—' }}
        </div>
      </div>
    </UiCard>

    <section class="ui-grid ui-grid--stats q-mb-lg">
      <UiStatCard label="Encaissements" icon="arrow_downward" :value="rapport.encaissements" money tone="ok" />
      <UiStatCard
        label="Remboursements"
        icon="arrow_upward"
        :value="rapport.remboursements"
        money
        tone="warn"
        :delay="0.06"
      />
      <UiStatCard label="Net caisse" icon="account_balance_wallet" :value="rapport.net" money tone="brand" :delay="0.12" />
      <UiStatCard
        label="Sessions clôturées"
        icon="play_circle"
        :value="rapport.sessionsCloturees"
        :suffix="`· ${rapport.minutesJouees} min`"
        tone="info"
        :delay="0.18"
      />
    </section>

    <q-banner
      v-if="rapport.sessionsAVerifier"
      dense
      rounded
      class="q-mb-lg"
      style="background: var(--warn-soft); color: var(--text-1)"
    >
      <template #avatar><q-icon name="fact_check" style="color: var(--warn)" /></template>
      {{ rapport.sessionsAVerifier }} session(s) clôturée(s) automatiquement restent à vérifier pour cette journée.
      <template #action>
        <UiButton variant="ghost" label="Ouvrir" to="/sessions" />
      </template>
    </q-banner>

    <div class="ui-grid ui-grid--split">
      <UiTable
        :rows="rapport.parCaissier"
        :columns="caissierColumns"
        row-key="caissier"
        :loading="loading"
        empty-icon="person"
        empty-title="Aucune opération"
        empty-text="Aucun encaissement pour cette journée."
      >
        <template #body-cell-encaisse="props">
          <q-td><span class="num">{{ formatAriary(props.row.encaisse) }}</span></q-td>
        </template>
        <template #body-cell-rembourse="props">
          <q-td><span class="num">{{ formatAriary(props.row.rembourse) }}</span></q-td>
        </template>
        <template #body-cell-net="props">
          <q-td><span class="num" style="color: var(--brand)">{{ formatAriary(props.row.net) }}</span></q-td>
        </template>
      </UiTable>

      <UiTable
        :rows="rapport.parSalle"
        :columns="salleColumns"
        row-key="salle"
        :loading="loading"
        empty-icon="meeting_room"
        empty-title="Aucune recette"
        empty-text="Aucune transaction rattachée à une salle."
      >
        <template #body-cell-net="props">
          <q-td><span class="num">{{ formatAriary(props.row.net) }}</span></q-td>
        </template>
      </UiTable>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { api } from 'src/services/api'
import { formatAriary } from 'src/utils/mappers'
import { UiButton, UiCard, UiPageHeader, UiStatCard, UiTable } from 'src/components/ui'

const date = ref(new Date().toISOString().slice(0, 10))
const loading = ref(false)
const rapport = ref({
  encaissements: 0,
  remboursements: 0,
  net: 0,
  operations: 0,
  sessionsCloturees: 0,
  minutesJouees: 0,
  sessionsAVerifier: 0,
  parCaissier: [],
  parSalle: [],
  generePar: null,
})

const caissierColumns = [
  { name: 'caissier', label: 'Caissier', field: 'caissier', align: 'left' },
  { name: 'encaisse', label: 'Encaissé', field: 'encaisse', align: 'right' },
  { name: 'rembourse', label: 'Remboursé', field: 'rembourse', align: 'right' },
  { name: 'net', label: 'Net', field: 'net', align: 'right' },
  { name: 'operations', label: 'Opérations', field: 'operations', align: 'right' },
]

const salleColumns = [
  { name: 'salle', label: 'Salle', field: 'salle', align: 'left' },
  { name: 'net', label: 'Net', field: 'net', align: 'right' },
]

async function load() {
  loading.value = true
  try {
    const res = await api.get(`/rapports/z?date=${date.value}`)
    rapport.value = { ...rapport.value, ...res }
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}

function print() {
  window.print()
}

async function exportCsv() {
  try {
    await api.download(`/rapports/z.csv?date=${date.value}`, `caisse-${date.value}.csv`)
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  }
}

onMounted(load)
</script>
