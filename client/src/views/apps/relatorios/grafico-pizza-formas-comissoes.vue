<script setup>
import { useTheme } from 'vuetify'
import { temaAtual } from '@core/stores/config'

const props = defineProps({
  formasPagamento: Array,
})

const vuetifyTheme = useTheme()
const tema = computed(() => temaAtual())

const chartOptions = computed(() => {
  const isDark = tema.value === 'dark'
  const textColor = isDark ? '#E7E3FC' : '#4C4E64'
  
  return {
    chart: {
      type: 'donut',
      height: 300,
    },
    labels: props.formasPagamento?.map(f => f.forma) || [],
    colors: ['#28C76F', '#00CFE8', '#7367F0', '#FF9F43', '#EA5455', '#FFA1A1'],
    legend: {
      position: 'bottom',
      labels: {
        colors: textColor,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => {
        return `${val.toFixed(1)}%`
      },
      style: {
        fontSize: '14px',
        fontFamily: 'Public Sans',
        fontWeight: 'bold',
        colors: ['#fff'],
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '16px',
              color: textColor,
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                return `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              }
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 600,
              color: textColor,
              formatter: (val) => {
                return `R$ ${parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              }
            }
          }
        }
      }
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val) => {
          return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
      }
    }
  }
})

const series = computed(() => props.formasPagamento?.map(f => f.valor) || [])
</script>

<template>
  <VCard>
    <VCardText>
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <h5 class="text-h5 mb-1">Formas de Pagamento</h5>
          <p class="text-sm text-disabled mb-0">Distribuição por forma de pagamento</p>
        </div>
        <VAvatar color="success" variant="tonal" rounded size="42">
          <VIcon icon="tabler-credit-card" size="28" />
        </VAvatar>
      </div>

      <VueApexCharts 
        v-if="props.formasPagamento && props.formasPagamento.length > 0"
        :key="JSON.stringify(props.formasPagamento)"
        :options="chartOptions" 
        :series="series" 
        height="300" 
        type="donut" 
      />

      <div v-else class="text-center py-8">
        <VIcon icon="tabler-credit-card" size="48" color="disabled" class="mb-2" />
        <p class="text-disabled">Nenhuma forma de pagamento encontrada</p>
      </div>
    </VCardText>
  </VCard>
</template>

