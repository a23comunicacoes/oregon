<script setup>
import { useTheme } from 'vuetify'
import { temaAtual } from '@core/stores/config'

const props = defineProps({
  topClientes: Array,
})

const vuetifyTheme = useTheme()
const tema = computed(() => temaAtual())

const chartOptions = computed(() => {
  const isDark = tema.value === 'dark'
  const textColor = isDark ? '#E7E3FC' : '#4C4E64'
  const gridColor = isDark ? '#444564' : '#DBDADE'
  
  return {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
        columnWidth: '60%',
        distributed: true,
      },
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: props.topClientes?.map(c => {
        // Limitar o nome do cliente a 20 caracteres
        return c.nome.length > 20 ? c.nome.substring(0, 20) + '...' : c.nome
      }) || [],
      labels: {
        style: {
          colors: textColor,
          fontSize: '11px',
        },
        rotate: -45,
        rotateAlways: true,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: textColor,
        },
        formatter: (val) => {
          return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
        }
      },
    },
    colors: ['#7367F0', '#28C76F', '#00CFE8', '#EA5455', '#FF9F43', '#826AF9', '#FFA1A1', '#FFD700', '#00D4BD', '#FF6B9D'],
    legend: {
      show: false
    },
    grid: {
      borderColor: gridColor,
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

const series = computed(() => [{
  name: 'Valor Total',
  data: props.topClientes?.map(c => c.valor) || []
}])
</script>

<template>
  <VCard>
    <VCardText>
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <h5 class="text-h5 mb-1">Top 10 Clientes</h5>
          <p class="text-sm text-disabled mb-0">Clientes que mais contribuíram no período</p>
        </div>
        <VAvatar color="info" variant="tonal" rounded size="42">
          <VIcon icon="tabler-users" size="28" />
        </VAvatar>
      </div>

      <VueApexCharts 
        v-if="props.topClientes && props.topClientes.length > 0"
        :key="JSON.stringify(props.topClientes)"
        :options="chartOptions" 
        :series="series" 
        height="350" 
        type="bar" 
      />

      <div v-else class="text-center py-8">
        <VIcon icon="tabler-users" size="48" color="disabled" class="mb-2" />
        <p class="text-disabled">Nenhum cliente com receita no período</p>
      </div>
    </VCardText>
  </VCard>
</template>

