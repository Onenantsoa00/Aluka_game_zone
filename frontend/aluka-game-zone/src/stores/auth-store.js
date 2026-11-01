import { defineStore } from 'pinia'
import { api } from 'src/services/api'

function readStoredJson(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw && raw !== 'undefined') return JSON.parse(raw)
  } catch (err) {
    console.warn(`Failed to parse stored ${key} from localStorage`, err)
  }
  return null
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const token = localStorage.getItem('agz_token') || null
    return {
      token,
      user: readStoredJson('agz_user'),
      abonnement: readStoredJson('agz_abonnement'),
    }
  },
  getters: {
    isLoggedIn: (state) => !!state.token,
    role: (state) => state.user?.role || null,
    isAdmin: (state) => state.user?.role === 'admin',
    isBoss: (state) => state.user?.role === 'boss',
    isJeton: (state) => state.user?.role === 'jeton',
  },
  actions: {
    async login(username, motDePasse) {
      const data = await api.post('/auth/login', { username, motDePasse })
      if (!data || !data.token) {
        throw new Error(data?.message || 'Authentification échouée')
      }
      this.token = data.token
      this.user = data.user || null
      this.abonnement = data.abonnement || null
      try {
        localStorage.setItem('agz_token', data.token)
        localStorage.setItem('agz_user', JSON.stringify(this.user))
        localStorage.setItem('agz_abonnement', JSON.stringify(this.abonnement))
      } catch (err) {
        console.warn('Failed to persist auth state to localStorage', err)
      }
    },
    /** Met a jour le store apres un refresh de jeton (api.js). */
    setSession({ token, user, abonnement }) {
      if (token) this.token = token
      if (user) this.user = user
      if (abonnement !== undefined) this.abonnement = abonnement
      try {
        if (token) localStorage.setItem('agz_token', token)
        if (user) localStorage.setItem('agz_user', JSON.stringify(user))
        if (abonnement !== undefined) {
          localStorage.setItem('agz_abonnement', JSON.stringify(abonnement))
        }
      } catch (err) {
        console.warn('Failed to persist refreshed auth state', err)
      }
    },
    /**
     * Recharge le profil + l'etat d'abonnement (expiration detectee au
     * demarrage sans attendre une requete metier). N'invalide pas la session
     * si le reseau est momentanement indisponible.
     */
    async refreshProfile() {
      if (!this.token) return null
      try {
        const data = await api.get('/auth/me')
        if (!data) return null
        const { abonnement, ...profile } = data
        this.setSession({ user: profile, abonnement })
        return data
      } catch {
        return null
      }
    },
    /** Revoque le jeton cote serveur (token_version) puis vide le local. */
    logout() {
      const token = this.token
      this.token = null
      this.user = null
      this.abonnement = null
      localStorage.removeItem('agz_token')
      localStorage.removeItem('agz_user')
      localStorage.removeItem('agz_abonnement')
      api.clearCache()
      if (token) {
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {
          // Hors ligne : le jeton local est deja supprime.
        })
      }
    },
  },
})
