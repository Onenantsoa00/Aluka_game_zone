<template>
  <q-page padding>
    <div class="page-hero q-mb-md">
      <div class="text-h5">Tableau de bord</div>
      <div class="text-subtitle2">Vue synthétique des indicateurs</div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-4">
        <q-card class="modern-card"
          ><q-card-section class="text-h6">Solde jour</q-card-section
          ><q-card-section class="text-subtitle2"
            >{{ money(data.soldes.jour) }} Ar</q-card-section
          ></q-card
        >
      </div>
      <div class="col-12 col-md-4">
        <q-card class="modern-card"
          ><q-card-section class="text-h6">Solde mois</q-card-section
          ><q-card-section class="text-subtitle2"
            >{{ money(data.soldes.mois) }} Ar</q-card-section
          ></q-card
        >
      </div>
      <div class="col-12 col-md-4">
        <q-card class="modern-card"
          ><q-card-section class="text-h6">Solde année</q-card-section
          ><q-card-section class="text-subtitle2"
            >{{ money(data.soldes.annee) }} Ar</q-card-section
          ></q-card
        >
      </div>
    </div>

    <q-card class="modern-card q-mb-md">
      <q-card-section class="text-subtitle1"
        >Postes actuellement utilisés: {{ data.postesActifs }}</q-card-section
      >
    </q-card>

    <q-card class="modern-card q-mb-md">
      <q-card-section class="text-subtitle1">Argent par salle</q-card-section>
      <q-separator />
      <q-card-section v-for="item in data.argentParSalle" :key="item.nom">
        <div class="row justify-between q-mb-xs">
          <span>{{ item.nom }}</span>
          <span class="text-weight-600">{{ money(item.montant) }} Ar</span>
        </div>
        <q-linear-progress :value="normalize(item.montant)" size="10px" color="primary" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { onMounted, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/services/api'

const $q = useQuasar()

const data = reactive({
  soldes: { jour: 0, mois: 0, annee: 0 },
  postesActifs: 0,
  argentParSalle: [],
})

function money(v) {
  return Number(v || 0).toLocaleString('fr-FR')
}

function normalize(value) {
  const max = Math.max(1, ...data.argentParSalle.map((i) => Number(i.montant || 0)))
  return Number(value || 0) / max
}

onMounted(async () => {
  try {
    const payload = await api.get('/dashboard')
    Object.assign(data, payload)
  } catch (err) {
    console.error('Dashboard load failed', err)
    $q.notify({
      type: 'negative',
      message: err.message || 'Impossible de charger le tableau de bord',
    })
  }
})
</script>
