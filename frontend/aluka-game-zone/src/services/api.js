const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('agz_token')
}

function clearSession() {
  try {
    localStorage.removeItem('agz_token')
    localStorage.removeItem('agz_user')
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
    window.dispatchEvent(new CustomEvent('agz:token-refreshed', { detail: data }))
    return data.token
  } catch {
    return null
  }
}

async function request(path, options = {}) {
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
    // On remonte l'erreur : renvoyer {} masquait les pannes reseau et provoquait
    // des erreurs de type dans les pages (rows.filter is not a function).
    throw new Error('Serveur injoignable — vérifiez votre connexion')
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
    throw new Error(data.message || `Erreur API (${response.status})`)
  }
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
  serverUrl: API_BASE_URL.replace(/\/api\/?$/, ''),
}
