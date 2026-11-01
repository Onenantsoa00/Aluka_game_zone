import { defineStore } from 'pinia'
import { api } from 'src/services/api'
import { useAuthStore } from './auth-store'

/**
 * Abonnement du boss connecte (P2.11). Le backend fait foi : cet etat sert a
 * afficher les relances et l'espace de paiement, jamais a autoriser une action.
 */
export const useBillingStore = defineStore('billing', {
  state: () => ({
    etat: null,
    infos: null,
    demandes: [],
    historique: [],
    notifications: [],
    nonLues: 0,
    loading: false,
    loaded: false,
    error: null,
  }),
  getters: {
    isExpired: (state) => Boolean(state.etat) && state.etat.actif === false,
    isTrial: (state) => state.etat?.statut === 'essai',
    daysLeft: (state) => Number(state.etat?.joursRestants ?? 0),
    hasPendingDemand: (state) =>
      state.demandes.some((demande) => demande.statut === 'en_attente'),
    needsAttention() {
      return this.isExpired || this.daysLeft <= 7
    },
    statusLabel() {
      if (this.isExpired) return 'Expiré'
      if (this.isTrial) return 'Essai gratuit'
      return 'Actif'
    },
  },
  actions: {
    async load({ silent = false } = {}) {
      const auth = useAuthStore()
      if (auth.role !== 'boss') return null
      if (!silent) this.loading = true
      try {
        const data = await api.get('/mon-abonnement')
        this.etat = data.etat
        this.infos = data.infos
        this.demandes = data.demandes || []
        this.historique = data.historique || []
        this.notifications = data.notifications || []
        this.nonLues = Number(data.nonLues) || 0
        this.error = null
        this.loaded = true
        if (auth.abonnement !== undefined) auth.setSession({ abonnement: data.etat })
        return data
      } catch (error) {
        this.error = error.message
        return null
      } finally {
        this.loading = false
      }
    },
    async refreshNotifications() {
      const auth = useAuthStore()
      if (auth.role !== 'boss') return
      try {
        const data = await api.get('/mon-abonnement/notifications')
        this.notifications = data.notifications || []
        this.nonLues = Number(data.nonLues) || 0
      } catch {
        // Une notification manquee n'empeche pas d'utiliser l'application.
      }
    },
    async markAllRead() {
      try {
        await api.post('/mon-abonnement/notifications/lu', {})
        this.notifications = this.notifications.map((n) => ({ ...n, lu: true }))
        this.nonLues = 0
      } catch {
        // ignore
      }
    },
    async submitDemande(payload) {
      const data = await api.post('/mon-abonnement/demandes', payload)
      await this.load({ silent: true })
      return data
    },
    reset() {
      this.etat = null
      this.infos = null
      this.demandes = []
      this.historique = []
      this.notifications = []
      this.nonLues = 0
      this.loaded = false
      this.error = null
    },
  },
})
