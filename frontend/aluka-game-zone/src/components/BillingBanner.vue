<template>
  <div
    v-if="visible"
    class="billing-strip"
    :class="billing.isExpired ? 'is-expired' : 'is-warning'"
    role="status"
  >
    <q-icon :name="billing.isExpired ? 'lock_clock' : 'card_membership'" size="16px" />
    <span class="billing-strip__text">
      <strong>{{ title }}</strong>
      <span class="billing-strip__hint">{{ hint }}</span>
    </span>
    <UiButton
      variant="ghost"
      size="sm"
      icon="arrow_forward"
      label="Mon abonnement"
      to="/mon-abonnement"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from 'src/stores/auth-store'
import { useBillingStore } from 'src/stores/billing-store'
import { UiButton } from 'src/components/ui'

const route = useRoute()
const auth = useAuthStore()
const billing = useBillingStore()

const visible = computed(
  () =>
    auth.isBoss &&
    route.path !== '/mon-abonnement' &&
    !!billing.etat &&
    (billing.isExpired || billing.needsAttention),
)

const title = computed(() => {
  if (billing.isExpired) return 'Abonnement expiré'
  if (billing.isTrial) {
    return `Essai gratuit — ${billing.daysLeft} jour${billing.daysLeft > 1 ? 's' : ''} restant${billing.daysLeft > 1 ? 's' : ''}`
  }
  return `Abonnement — ${billing.daysLeft} jour${billing.daysLeft > 1 ? 's' : ''} restant${billing.daysLeft > 1 ? 's' : ''}`
})

const hint = computed(() => {
  if (billing.isExpired) return 'Renouvelez maintenant pour rétablir vos opérations.'
  return billing.isTrial
    ? 'Activez votre abonnement (30 000 Ar/mois) pour conserver vos accès.'
    : 'Renouvelez par Mobile Money pour éviter toute coupure de service.'
})
</script>

<style scoped>
.billing-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px clamp(16px, 2.2vw, 32px);
  border-bottom: 1px solid var(--line-soft);
  font-size: 12.5px;
}
.billing-strip.is-warning {
  background: rgba(245, 181, 68, 0.1);
}
.billing-strip.is-warning > :deep(.q-icon) {
  color: var(--warn);
}
.billing-strip.is-expired {
  background: rgba(255, 107, 107, 0.12);
}
.billing-strip.is-expired > :deep(.q-icon) {
  color: var(--danger);
}
.billing-strip__text {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.billing-strip__text strong {
  font-weight: 600;
  color: var(--text-1);
}
.billing-strip__hint {
  color: var(--text-2);
}
@media (max-width: 700px) {
  .billing-strip__hint {
    display: none;
  }
}
</style>
