const ALL_ROLES = ['admin', 'boss', 'jeton']
const MANAGEMENT_ROLES = ['admin', 'boss']

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
      {
        path: 'dashboard',
        component: () => import('pages/DashboardPage.vue'),
        meta: { roles: ALL_ROLES },
      },
      {
        path: 'sessions',
        component: () => import('pages/SessionsPage.vue'),
        meta: { roles: ALL_ROLES },
      },
      {
        path: 'reservations',
        component: () => import('pages/ReservationsPage.vue'),
        meta: { roles: ALL_ROLES },
      },
      {
        path: 'salles',
        component: () => import('pages/SallesPage.vue'),
        meta: { roles: MANAGEMENT_ROLES },
      },
      {
        path: 'jeux',
        component: () => import('pages/JeuxPage.vue'),
        meta: { roles: MANAGEMENT_ROLES },
      },
      {
        path: 'comptes',
        component: () => import('pages/ComptesPage.vue'),
        meta: { roles: MANAGEMENT_ROLES },
      },
      {
        path: 'materiels',
        component: () => import('pages/MaterielsPage.vue'),
        meta: { roles: ALL_ROLES },
      },
      {
        path: 'tournois',
        component: () => import('pages/TournoisPage.vue'),
        meta: { roles: ALL_ROLES },
      },
      {
        path: 'tournois/:id',
        component: () => import('pages/TournoiDetailPage.vue'),
        meta: { roles: ALL_ROLES },
      },
      {
        path: 'paiements',
        component: () => import('pages/PaiementsPage.vue'),
        meta: { roles: MANAGEMENT_ROLES },
      },
      {
        path: 'caisse',
        component: () => import('pages/CaissePage.vue'),
        meta: { roles: MANAGEMENT_ROLES },
      },
      {
        path: 'mon-abonnement',
        component: () => import('pages/MonAbonnementPage.vue'),
        meta: { roles: ['boss'] },
      },
      {
        path: 'abonnements',
        component: () => import('pages/AbonnementsPage.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'audit',
        component: () => import('pages/AuditPage.vue'),
        meta: { roles: ['admin'] },
      },
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
