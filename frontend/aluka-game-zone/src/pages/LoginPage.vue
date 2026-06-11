<template>
  <div class="row justify-center items-center bg-grey-2 login-wrapper">
    <q-card style="width: 380px">
      <q-card-section>
        <div class="text-h6">Connexion</div>
        <div class="text-caption text-grey-7">Application de gestion salle de jeux</div>
      </q-card-section>
      <q-card-section class="q-gutter-md">
        <q-input v-model="username" label="Username" outlined />
        <q-input v-model="motDePasse" label="Mot de passe" type="password" outlined />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn color="primary" :loading="loading" label="Se connecter" @click="submit" />
      </q-card-actions>
      <q-card-section class="text-caption text-grey-7">
        Compte par defaut: admin / admin123
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth-store'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

const username = ref('admin')
const motDePasse = ref('admin123')
const loading = ref(false)

async function submit() {
  loading.value = true
  try {
    await auth.login(username.value, motDePasse.value)
    await router.push('/dashboard')
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
}
</style>
