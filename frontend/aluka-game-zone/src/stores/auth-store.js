import { defineStore } from 'pinia'
import { api } from 'src/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => {
    const token = localStorage.getItem('agz_token') || null
    let user = null
    try {
      const raw = localStorage.getItem('agz_user')
      if (raw && raw !== 'undefined') user = JSON.parse(raw)
    } catch (err) {
      // invalid stored user, clear it and continue with null
      console.warn('Failed to parse stored agz_user from localStorage', err)
      try {
        localStorage.removeItem('agz_user')
      } catch (removeErr) {
        console.warn('Failed to remove malformed agz_user from localStorage', removeErr)
      }
      user = null
    }
    return { token, user }
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
      try {
        localStorage.setItem('agz_token', data.token)
        localStorage.setItem('agz_user', JSON.stringify(this.user))
      } catch (err) {
        console.warn('Failed to persist auth state to localStorage', err)
      }
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('agz_token')
      localStorage.removeItem('agz_user')
    },
  },
})
