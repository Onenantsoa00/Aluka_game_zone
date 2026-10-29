<template>
  <div class="ui-table">
    <q-table
      v-bind="$attrs"
      flat
      :rows="rows"
      :columns="columns"
      :row-key="rowKey"
      :loading="loading"
      :pagination="pagination"
      :rows-per-page-options="rowsPerPageOptions"
      :dense="dense"
      :separator="separator"
      loading-label="Chargement…"
      no-data-label="Aucune donnée"
    >
      <template v-for="name in passthroughSlots" #[name]="slotData">
        <slot :name="name" v-bind="slotData || {}" />
      </template>
      <template #no-data>
        <slot name="no-data">
          <UiEmptyState :icon="emptyIcon" :title="emptyTitle" :text="emptyText" />
        </slot>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import UiEmptyState from './UiEmptyState.vue'

defineOptions({ inheritAttrs: false })

defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  loading: { type: Boolean, default: false },
  dense: { type: Boolean, default: false },
  separator: { type: String, default: 'horizontal' },
  pagination: { type: Object, default: () => ({ rowsPerPage: 15 }) },
  rowsPerPageOptions: { type: Array, default: () => [10, 15, 25, 50, 0] },
  emptyIcon: { type: String, default: 'inbox' },
  emptyTitle: { type: String, default: 'Aucune donnée' },
  emptyText: { type: String, default: '' },
})

const slots = useSlots()
const passthroughSlots = computed(() =>
  Object.keys(slots).filter((name) => name !== 'no-data'),
)
</script>
