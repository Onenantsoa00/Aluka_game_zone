import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    // Le design system est pensé "dark premium" : sombre par défaut,
    // le clair reste disponible via le bouton du TopBar.
    theme: localStorage.getItem('agz_theme') || 'dark',
  }),
  actions: {
    apply() {
      if (this.theme === 'dark') {
        document.body.classList.add('theme-dark')
        document.body.classList.remove('theme-light')
      } else {
        document.body.classList.add('theme-light')
        document.body.classList.remove('theme-dark')
      }
    },
    toggle() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('agz_theme', this.theme)
      this.apply()
    },
    set(theme) {
      this.theme = theme
      localStorage.setItem('agz_theme', this.theme)
      this.apply()
    },
  },
})
