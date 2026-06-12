<template>
  <div class="login-dark">
    <div class="login-card">
      <div class="text-h5 q-mb-xs" style="color: var(--dc-accent)">Aluka Game Zone</div>
      <div class="text-caption q-mb-lg" style="color: var(--dc-text-muted)">
        Gestion de salles de jeux — suivi des recettes
      </div>

      <div class="dc-form q-gutter-md">
        <q-input v-model="username" label="Identifiant" outlined dark color="cyan" />
        <q-input v-model="motDePasse" label="Mot de passe" type="password" outlined dark color="cyan" />
      </div>

      <q-btn
        class="btn-dc-primary full-width q-mt-lg"
        :loading="loading"
        label="Se connecter"
        @click="submit"
      />

      <div class="text-caption q-mt-md" style="color: var(--dc-text-muted)">
        Compte admin par défaut : admin / admin123
      </div>
    </div>
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
