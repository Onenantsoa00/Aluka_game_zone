<template>
  <header class="topbar">
    <div>
      <div class="title">Gestion de Salle de Jeux</div>
      <div class="muted">Tableau central · Vue en temps réel</div>
    </div>
    <div>
      <q-btn class="btn-new" unelevated @click="$emit('new-session')">+ Nouvelle session</q-btn>
    </div>
  </header>
</template>

<script setup>
// lightweight topbar
</script>

<style scoped>
.muted {
  color: var(--dc-text-muted);
  font-size: 0.9rem;
}
.btn-new {
  font-weight: 700;
}
</style>
