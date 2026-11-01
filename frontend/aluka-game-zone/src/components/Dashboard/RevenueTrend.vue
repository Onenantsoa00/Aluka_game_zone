<template>
  <UiCard class="revenue-trend">
    <template #header>
      <div class="trend-head">
        <div>
          <div class="ui-card__title">Courbe de recette</div>
          <div class="ui-card__hint">Net encaissé par jour, remboursements déduits.</div>
        </div>
        <div class="trend-segmented" role="group" aria-label="Période affichée">
          <button
            v-for="option in [7, 30]"
            :key="option"
            type="button"
            :class="{ active: range === option }"
            @click="range = option"
          >
            {{ option }} jours
          </button>
        </div>
      </div>
    </template>

    <div class="trend-summary">
      <div>
        <span class="trend-label">Total {{ range }} j</span>
        <strong class="trend-total">{{ formatAriary(total) }}</strong>
      </div>
      <div class="trend-kpi">
        <span class="trend-label">Moyenne / jour</span>
        <strong>{{ formatAriary(average) }}</strong>
      </div>
      <div class="trend-kpi">
        <span class="trend-label">Meilleure journée</span>
        <strong>{{ best ? `${formatAriary(best.net)} · ${shortDate(best.date)}` : '—' }}</strong>
      </div>
      <div v-if="delta !== null" class="trend-kpi">
        <span class="trend-label">vs période précédente</span>
        <strong :class="delta >= 0 ? 'is-up' : 'is-down'">
          <q-icon :name="delta >= 0 ? 'trending_up' : 'trending_down'" size="15px" />
          {{ delta > 0 ? '+' : '' }}{{ delta.toFixed(1) }} %
        </strong>
      </div>
    </div>

    <div class="trend-chart">
      <svg :viewBox="`0 0 ${width} ${height}`" role="img" aria-label="Recette quotidienne">
        <defs>
          <linearGradient id="agz-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--brand)" stop-opacity="0.34" />
            <stop offset="100%" stop-color="var(--brand)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="agz-trend-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="var(--brand-2)" />
            <stop offset="55%" stop-color="var(--brand)" />
            <stop offset="100%" stop-color="#7ef0ff" />
          </linearGradient>
        </defs>

        <g class="trend-grid">
          <line
            v-for="line in gridLines"
            :key="line.y"
            :x1="pad.left"
            :x2="width - pad.right"
            :y1="line.y"
            :y2="line.y"
          />
          <text
            v-for="line in gridLines"
            :key="`t-${line.y}`"
            :x="width - pad.right"
            :y="line.y - 5"
            text-anchor="end"
          >
            {{ line.label }}
          </text>
        </g>

        <motion.path
          :d="areaPath"
          fill="url(#agz-trend-fill)"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :transition="{ duration: 0.6, delay: 0.18 }"
        />
        <motion.path
          :d="linePath"
          fill="none"
          stroke="url(#agz-trend-line)"
          stroke-width="2.4"
          stroke-linecap="round"
          :initial="{ pathLength: 0 }"
          :animate="{ pathLength: 1 }"
          :transition="{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }"
        />

        <g v-for="point in points" :key="point.date">
          <circle :cx="point.x" :cy="point.y" r="7" class="trend-dot-halo" />
          <circle :cx="point.x" :cy="point.y" r="3.2" class="trend-dot">
            <title>{{ shortDate(point.date) }} — {{ formatAriary(point.net) }}</title>
          </circle>
        </g>

        <g class="trend-x">
          <text
            v-for="label in xLabels"
            :key="label.date"
            :x="label.x"
            :y="height - 6"
            :text-anchor="label.anchor"
          >
            {{ label.text }}
          </text>
        </g>
      </svg>
    </div>
  </UiCard>
</template>

<script setup>
import { computed, ref } from 'vue'
import { motion } from 'motion-v'
import { formatAriary } from 'src/utils/mappers'
import UiCard from 'src/components/ui/UiCard.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
})

const range = ref(7)
const width = 760
const height = 224
const pad = { left: 10, right: 54, top: 18, bottom: 30 }

const normalized = computed(() =>
  (Array.isArray(props.data) ? props.data : []).map((entry) => ({
    date: entry.date,
    net: Math.max(0, Number(entry.net) || 0),
  })),
)

const series = computed(() => normalized.value.slice(-range.value))
const total = computed(() => series.value.reduce((sum, entry) => sum + entry.net, 0))
const average = computed(() =>
  series.value.length ? Math.round(total.value / series.value.length) : 0,
)
const best = computed(() =>
  series.value.length
    ? series.value.reduce((winner, entry) => (entry.net > winner.net ? entry : winner))
    : null,
)

const previousTotal = computed(() => {
  const n = range.value
  const all = normalized.value
  if (all.length < n * 2) return null
  return all.slice(all.length - n * 2, all.length - n).reduce((sum, entry) => sum + entry.net, 0)
})

const delta = computed(() => {
  if (previousTotal.value === null) return null
  if (previousTotal.value === 0) return total.value === 0 ? 0 : 100
  return ((total.value - previousTotal.value) / previousTotal.value) * 100
})

const maxValue = computed(() => {
  const max = series.value.reduce((value, entry) => Math.max(value, entry.net), 0)
  if (!max) return 1000
  const magnitude = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / magnitude) * magnitude
})

const points = computed(() => {
  const list = series.value
  if (!list.length) return []
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom
  const step = list.length > 1 ? plotWidth / (list.length - 1) : 0
  return list.map((entry, index) => ({
    ...entry,
    x: pad.left + (list.length > 1 ? index * step : plotWidth / 2),
    y: pad.top + plotHeight - (entry.net / maxValue.value) * plotHeight,
  }))
})

function smoothPath(list) {
  if (!list.length) return ''
  if (list.length === 1) return `M ${list[0].x} ${list[0].y}`
  let path = `M ${list[0].x} ${list[0].y}`
  for (let index = 0; index < list.length - 1; index += 1) {
    const p0 = list[index - 1] || list[index]
    const p1 = list[index]
    const p2 = list[index + 1]
    const p3 = list[index + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return path
}

const linePath = computed(() => smoothPath(points.value))
const areaPath = computed(() => {
  if (!points.value.length) return ''
  const baseline = height - pad.bottom
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${linePath.value} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
})

const gridLines = computed(() =>
  [0, 0.5, 1].map((ratio) => ({
    y: pad.top + (height - pad.top - pad.bottom) * (1 - ratio),
    label: compact(maxValue.value * ratio),
  })),
)

const xLabels = computed(() => {
  const list = points.value
  if (!list.length) return []
  const indices =
    list.length <= 8
      ? list.map((_, index) => index)
      : [0, Math.floor((list.length - 1) / 3), Math.floor(((list.length - 1) * 2) / 3), list.length - 1]
  return [...new Set(indices)].map((index, position, array) => ({
    date: list[index].date,
    x: list[index].x,
    text: shortDate(list[index].date),
    anchor: position === 0 ? 'start' : position === array.length - 1 ? 'end' : 'middle',
  }))
})

function compact(value) {
  const n = Number(value) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`
  if (n >= 1000) return `${Math.round(n / 1000)} k`
  return String(Math.round(n))
}

function shortDate(value) {
  if (!value) return ''
  const [year, month, day] = String(value).slice(0, 10).split('-')
  if (!year) return ''
  return `${day}/${month}`
}
</script>

<style scoped>
.revenue-trend :deep(.ui-card__head) {
  margin-bottom: 6px;
}
.trend-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.trend-segmented {
  display: inline-flex;
  padding: 3px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-hover);
}
.trend-segmented button {
  border: none;
  background: transparent;
  color: var(--text-3);
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: var(--r-pill);
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}
.trend-segmented button.active {
  background: var(--brand-soft);
  color: var(--brand);
}
.trend-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 30px;
  padding: 10px 2px 4px;
}
.trend-label {
  display: block;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
}
.trend-total {
  display: block;
  font-family: var(--font-display);
  font-size: clamp(22px, 2.4vw, 28px);
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}
.trend-kpi strong {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}
.trend-kpi strong.is-up {
  color: var(--ok);
}
.trend-kpi strong.is-down {
  color: var(--danger);
}
.trend-chart {
  margin-top: 6px;
}
.trend-chart svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.trend-grid line {
  stroke: var(--line-soft);
  stroke-dasharray: 3 5;
}
.trend-grid text,
.trend-x text {
  fill: var(--text-3);
  font-size: 9.5px;
  font-family: var(--font-body);
}
.trend-dot {
  fill: var(--brand);
  stroke: var(--surface-1);
  stroke-width: 1.4;
}
.trend-dot-halo {
  fill: rgba(45, 212, 232, 0.14);
}
</style>
