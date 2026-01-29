<script setup>
import { useTheme } from 'vuetify'
import { temaAtual } from '@core/stores/config'

const props = defineProps({
  dados: Object,
})

const vuetifyTheme = useTheme()
const tema = computed(() => temaAtual())

const chartOptions = computed(() => {
  const isDark = tema.value === 'dark'
  const textColor = isDark ? '#E7E3FC' : '#4C4E64'
  const gridColor = isDark ? '#444564' : '#DBDADE'
  
  return {
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: true },
      zoom: { enabled: true }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    xaxis: {
      categories: props.dados?.dias || [],
      labels: {
        style: {
          colors: textColor,
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: textColor,
          fontSize: '12px',
        },
        formatter: (val) => {
          return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: {
        colors: textColor,
      },
    },
    colors: ['#28C76F'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100]
      }
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val) => {
          return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
      }
    },
    grid: {
      borderColor: gridColor,
    }
  }
})

const series = computed(() => {
  if (!props.dados || !props.dados.dias || props.dados.dias.length === 0) {
    return []
  }
  
  return [
    {
      name: 'Comissões Pagas',
      data: props.dados.comissoesPagas || []
    }
  ]
})
</script>

<template>
  <VCard>
    <VCardText>
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <h5 class="text-h5 mb-1">Evolução de Comissões</h5>
          <p class="text-sm text-disabled mb-0">Comissões pagas ao longo do período</p>
        </div>
        <VAvatar color="success" variant="tonal" rounded size="42">
          <VIcon icon="tabler-chart-line" size="28" />
        </VAvatar>
      </div>

      <VueApexCharts 
        v-if="props.dados && props.dados.dias && props.dados.dias.length > 0"
        :key="JSON.stringify(props.dados.dias)"
        :options="chartOptions" 
        :series="series" 
        height="350" 
        type="area" 
      />

      <div v-else class="text-center py-8">
        <VIcon icon="tabler-chart-line" size="48" color="disabled" class="mb-2" />
        <p class="text-disabled">Nenhum dado disponível para o período selecionado</p>
      </div>
    </VCardText>
  </VCard>
</template>

