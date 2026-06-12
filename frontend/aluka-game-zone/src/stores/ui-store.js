import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: false,
    requestNewSession: false,
  }),
  actions: {
    openSidebar() {
      this.sidebarOpen = true
      try {
        document.body.classList.add('sidebar-open')
      } catch (err) {
        console.warn('Could not add sidebar-open class to body', err)
      }
    },
    closeSidebar() {
      this.sidebarOpen = false
      try {
        document.body.classList.remove('sidebar-open')
      } catch (err) {
        console.warn('Could not remove sidebar-open class from body', err)
      }
    },
    toggleSidebar() {
      if (this.sidebarOpen) this.closeSidebar()
      else this.openSidebar()
    },
    requestNewSessionOpen() {
      this.requestNewSession = true
    },
    clearNewSessionRequest() {
      this.requestNewSession = false
    },
  },
})
