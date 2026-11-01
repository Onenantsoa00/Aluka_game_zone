const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const CACHE_PREFIX = 'agz:cache:'
const CACHE_TTL = 24 * 60 * 60 * 1000

function getToken() {
  return localStorage.getItem('agz_token')
}

function clearSession() {
  try {
    localStorage.removeItem('agz_token')
    localStorage.removeItem('agz_user')
    localStorage.removeItem('agz_abonnement')
  } catch (err) {
    console.warn('Impossible de vider la session locale', err)
  }
}

/**
 * On previent l'application (App.vue) plutot que de forcer une navigation : un
 * location.assign sur une URL a hash ne recharge pas la page et laissait le
 * store avec un utilisateur en memoire alors que le token etait supprime
 * (tableau de bord vide a la place de l'ecran de connexion).
 */
function notifyUnauthorized() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('agz:unauthorized'))
}

function notifyOfflineData(path) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('agz:offline-data', { detail: { path } }))
}

/**
 * Cache local des lectures (P2.13). Le service worker met deja les GET en
 * cache ; ce filet localStorage couvre le mode dev et les navigateurs ou le SW
 * n'est pas encore actif (premiere visite). Les mutations ne sont jamais
 * rejouees hors ligne : une caisse ne doit pas inventer d'encaissement.
 */
function readCache(path) {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${path}`)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry?.at || Date.now() - entry.at > CACHE_TTL) return null
    return entry
  } catch {
    return null
  }
}

function writeCache(path, data) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${path}`, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // Quota plein : le cache est un confort, jamais un prerequis.
  }
}

/**
 * Renouvelle le jeton avant expiration (O10) : evite de deconnecter un
 * operateur en pleine session. Le nouveau jeton est republie dans le store via
 * l'evenement agz:token-refreshed.
 */
async function refreshToken() {
  const token = getToken()
  if (!token) return null
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return null
    const data = await response.json()
    if (!data?.token) return null
    localStorage.setItem('agz_token', data.token)
    if (data.user) localStorage.setItem('agz_user', JSON.stringify(data.user))
    if (data.abonnement) {
      localStorage.setItem('agz_abonnement', JSON.stringify(data.abonnement))
    }
    window.dispatchEvent(new CustomEvent('agz:token-refreshed', { detail: data }))
    return data.token
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    if (method === 'GET') {
      const cached = readCache(path)
      if (cached) {
        notifyOfflineData(path)
        return cached.data
      }
    }
    throw new Error(
      typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'Hors ligne : cette action nécessite une connexion'
        : 'Serveur injoignable — vérifiez votre connexion',
    )
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && token && !options._retried) {
      const renewed = await refreshToken()
      if (renewed) {
        return request(path, { ...options, _retried: true })
      }
      clearSession()
      notifyUnauthorized()
    }
    if (response.status === 402 && data?.code === 'ABONNEMENT_EXPIRE') {
      window.dispatchEvent(
        new CustomEvent('agz:subscription-expired', { detail: data }),
      )
    }
    throw new Error(data.message || `Erreur API (${response.status})`)
  }

  if (method === 'GET') writeCache(path, data)
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  /** Telecharge un fichier protege par JWT (rapport Z en CSV). */
  async download(path, filename) {
    const token = getToken()
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) {
      if (response.status === 401) {
        clearSession()
        notifyUnauthorized()
      }
      throw new Error(`Téléchargement impossible (${response.status})`)
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
  /** Purge les lectures en cache (deconnexion, changement de compte). */
  clearCache() {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .forEach((key) => localStorage.removeItem(key))
    } catch {
      // ignore
    }
  },
  serverUrl: API_BASE_URL.replace(/\/api\/?$/, ''),
}
