<template>
  <div class="notfound">
    <div>
      <div class="code">404</div>
      <div class="ui-page-header" style="justify-content: center; margin-bottom: 0">
        <div>
          <div class="title" style="font-size: 20px">Page introuvable</div>
          <div class="subtitle" style="text-align: center">
            Cette page n'existe pas ou a été déplacée.
          </div>
        </div>
      </div>
      <UiButton
        class="q-mt-lg"
        icon="arrow_back"
        label="Retour au tableau de bord"
        to="/dashboard"
      />
    </div>
  </div>
</template>

<script setup>
import { UiButton } from 'src/components/ui'
</script>
