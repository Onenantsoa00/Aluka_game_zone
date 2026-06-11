import { defineStore } from 'pinia'
import { api } from 'src/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('agz_token'),
    user: JSON.parse(localStorage.getItem('agz_user') || 'null'),
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    async login(username, motDePasse) {
      const data = await api.post('/auth/login', { username, motDePasse })
      this.token = data.token
      this.user = data.user
      localStorage.setItem('agz_token', data.token)
      localStorage.setItem('agz_user', JSON.stringify(data.user))
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('agz_token')
      localStorage.removeItem('agz_user')
    },
  },
})
