const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('agz_token')
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  // If offline, quickly return an empty result to avoid unhandled exceptions
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('Offline: skipping API request', path)
    return {}
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch (err) {
    // Network/fetch error — return empty object and log
    if (typeof console !== 'undefined') console.warn('API fetch failed', err)
    return {}
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    // Handle unauthorized centrally: clear token and redirect to login
    if (response.status === 401) {
      try {
        localStorage.removeItem('agz_token')
      } catch (err) {
        // non-critical: log removal failure for debugging
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('Failed to remove agz_token', err)
        }
      }
      // If running in browser, redirect to login page
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    throw new Error(data.message || 'Erreur API')
  }
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
