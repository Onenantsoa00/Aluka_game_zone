const routes = [
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: '/dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: '/sessions', component: () => import('pages/SessionsPage.vue') },
      { path: '/salles', component: () => import('pages/SallesPage.vue') },
      { path: '/jeux', component: () => import('pages/JeuxPage.vue') },
      { path: '/comptes', component: () => import('pages/ComptesPage.vue') },
      { path: '/materiels', component: () => import('pages/MaterielsPage.vue') },
      { path: '/tournois', component: () => import('pages/TournoisPage.vue') },
      { path: '/paiements', component: () => import('pages/PaiementsPage.vue') },
      { path: '/abonnements', component: () => import('pages/AbonnementsPage.vue'), meta: { roles: ['admin'] } },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
