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
    colors: ['#28C76F', '#EA5455', '#FF9F43', '#00CFE8'],
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

const series = computed(() => [
  {
    name: 'Receitas',
    data: props.dados?.receitas || []
  },
  {
    name: 'Despesas',
    data: props.dados?.despesas || []
  },
  {
    name: 'Comissões',
    data: props.dados?.comissoes || []
  },
  {
    name: 'Lucro',
    data: props.dados?.lucro || []
  }
])
</script>

<template>
  <VCard>
    <VCardText>
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <h5 class="text-h5 mb-1">Evolução Financeira</h5>
          <p class="text-sm text-disabled mb-0">Acompanhe a evolução das suas finanças</p>
        </div>
        <VAvatar color="primary" variant="tonal" rounded size="42">
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
        <p class="text-disabled">Selecione um período para visualizar a evolução financeira</p>
      </div>
    </VCardText>
  </VCard>
</template>

