import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'src/stores/auth-store'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach((to) => {
    const auth = useAuthStore()
    if (to.meta.requiresAuth && !auth.isLoggedIn) return '/login'
    if (to.path === '/login' && auth.isLoggedIn) return '/dashboard'
    const roles = to.meta.roles
    if (roles && auth.user?.role && !roles.includes(auth.user.role)) {
      return '/dashboard'
    }
    return true
  })

  // Prechargement des pages en arriere-plan (une seule fois, apres la premiere
  // navigation) : le clic sur un menu n'attend plus le telechargement du chunk.
  Router.afterEach(() => {
    if (prefetchStarted) return
    prefetchStarted = true
    schedulePrefetch(Router)
  })

  return Router
})

let prefetchStarted = false

/**
 * Charge les modules de page pendant les temps morts, un par un, pour ne pas
 * concurrencer la page en cours d'affichage ni la premiere requete API.
 */
function schedulePrefetch(router) {
  const connection = typeof navigator !== 'undefined' ? navigator.connection : null
  if (connection?.saveData) return

  // Seules les pages accessibles au role courant sont prechargees.
  const role = useAuthStore().user?.role
  const loaders = []
  for (const record of router.getRoutes()) {
    const roles = record.meta?.roles
    if (roles && role && !roles.includes(role)) continue
    for (const component of Object.values(record.components || {})) {
      if (typeof component === 'function') loaders.push(component)
    }
  }
  const unique = [...new Set(loaders)]

  const idle =
    typeof window !== 'undefined' && window.requestIdleCallback
      ? window.requestIdleCallback
      : (fn) => setTimeout(fn, 300)

  let index = 0
  const next = () => {
    if (index >= unique.length) return
    const load = unique[index++]
    Promise.resolve()
      .then(() => load())
      .catch(() => {})
      .finally(() => idle(next, { timeout: 4000 }))
  }
  idle(next, { timeout: 4000 })
}
