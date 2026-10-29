<template>
  <div class="login-shell">
    <aside class="login-aside">
      <div class="row-tight">
        <span class="brand-mark">
          <q-icon name="sports_esports" size="20px" />
        </span>
        <span class="brand-text">
          <span class="brand-name">Aluka</span>
          <span class="brand-sub">Game Zone</span>
        </span>
      </div>

      <div>
        <h1 class="headline">Pilotez vos salles <em>comme un pro.</em></h1>
        <p class="lede">
          Sessions, encaissements, matériels, tournois et rémunération des opérateurs — réunis dans
          un seul tableau de bord, en temps réel.
        </p>
        <div class="login-features">
          <span class="feature"><q-icon name="bolt" /> Sessions en direct</span>
          <span class="feature"><q-icon name="payments" /> Recettes consolidées</span>
          <span class="feature"><q-icon name="shield" /> Rôles admin / boss / jeton</span>
        </div>
      </div>

      <div class="dim" style="font-size: 11.5px">© 2026 Aluka Game Zone — Gestion multi-salles</div>
    </aside>

    <div class="login-panel">
      <motion.div
        class="login-card"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }"
      >
        <div class="title">Connexion</div>
        <div class="subtitle">Accédez à votre espace de gestion.</div>

        <q-form class="stack q-mt-lg" style="--stack-gap: 14px" @submit.prevent="submit">
          <q-input
            v-model="username"
            label="Identifiant"
            outlined
            autocomplete="username"
            :disable="loading"
          >
            <template #prepend><q-icon name="person" size="18px" /></template>
          </q-input>

          <q-input
            v-model="motDePasse"
            label="Mot de passe"
            :type="showPassword ? 'text' : 'password'"
            outlined
            autocomplete="current-password"
            :disable="loading"
          >
            <template #prepend><q-icon name="lock" size="18px" /></template>
            <template #append>
              <q-btn
                flat
                dense
                round
                :icon="showPassword ? 'visibility_off' : 'visibility'"
                :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <UiButton
            type="submit"
            label="Se connecter"
            icon="arrow_forward"
            :loading="loading"
            class="full-width"
          />
        </q-form>

        <div class="meta">
          <q-icon name="info" size="14px" />
          Comptes de démonstration : admin, boss1, jeton1
        </div>
      </motion.div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Notify } from 'quasar'
import { motion } from 'motion-v'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth-store'
import { UiButton } from 'src/components/ui'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const motDePasse = ref('')
const showPassword = ref(false)
const loading = ref(false)

async function submit() {
  if (!username.value || !motDePasse.value) {
    Notify.create({ type: 'warning', message: 'Renseignez vos identifiants' })
    return
  }
  loading.value = true
  try {
    await auth.login(username.value, motDePasse.value)
    await router.push('/dashboard')
  } catch (error) {
    Notify.create({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}
</script>
