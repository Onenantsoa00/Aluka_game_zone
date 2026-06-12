<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useThemeStore } from './stores/theme-store'

const theme = useThemeStore()
onMounted(() => {
  theme.apply()
})
</script>
