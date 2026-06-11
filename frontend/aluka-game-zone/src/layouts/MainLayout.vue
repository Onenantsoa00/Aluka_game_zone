<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>Aluka Game Zone</q-toolbar-title>
        <div class="row items-center q-gutter-sm">
          <q-badge color="primary">{{ auth.user?.role }}</q-badge>
          <q-btn flat icon="logout" label="Deconnexion" @click="handleLogout" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>Navigation</q-item-label>
        <q-item v-for="item in menuItems" :key="item.to" clickable :to="item.to" v-ripple>
          <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth-store'

const router = useRouter()
const auth = useAuthStore()
const menuItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
  { to: '/sessions', label: 'Sessions', icon: 'sports_esports' },
  { to: '/comptes', label: 'Comptes', icon: 'groups' },
  { to: '/materiels', label: 'Materiels', icon: 'inventory_2' },
  { to: '/tournois', label: 'Tournois', icon: 'emoji_events' },
]

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
