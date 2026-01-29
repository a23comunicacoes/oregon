<script setup>
import { useTheme } from 'vuetify'
import { temaAtual } from '@core/stores/config'

const props = defineProps({
  tiposDespesas: Array,
})

const vuetifyTheme = useTheme()
const tema = computed(() => temaAtual())

// Filtro de busca
const buscaTipo = ref('')

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
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => {
        return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      offsetX: 50,
      style: {
        fontSize: '12px',
        colors: [textColor],
        fontWeight: 600,
      }
    },
    xaxis: {
      categories: tiposFiltrados.value.map(t => t.tipo),
      labels: {
        style: {
          colors: textColor,
        },
        formatter: (val) => {
          return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
        }
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: textColor,
        },
      },
    },
    colors: ['#EA5455'],
    grid: {
      borderColor: gridColor,
      xaxis: {
        lines: {
          show: true
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

// Filtrar apenas tipos com valor > 0 e aplicar busca
const tiposFiltrados = computed(() => {
  if (!props.tiposDespesas || props.tiposDespesas.length === 0) {
    return []
  }
  
  let result = props.tiposDespesas
    .filter(t => (t.valorPago || 0) > 0)
    .sort((a, b) => b.valorPago - a.valorPago)
  
  // Aplicar filtro de busca
  if (buscaTipo.value) {
    result = result.filter(t => 
      t.tipo?.toLowerCase().includes(buscaTipo.value.toLowerCase())
    )
  }
  
  return result
})

const series = computed(() => {
  if (tiposFiltrados.value.length === 0) {
    return [{
      name: 'Valor',
      data: []
    }]
  }
  
  return [{
    name: 'Valor',
    data: tiposFiltrados.value.map(t => t.valorPago || 0)
  }]
})
</script>

<template>
  <VCard>
    <VCardText>
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <h5 class="text-h5 mb-1">Despesas por Tipo</h5>
          <p class="text-sm text-disabled mb-0">
            {{ tiposFiltrados.length }} {{ tiposFiltrados.length === 1 ? 'categoria' : 'categorias' }} de despesas
          </p>
        </div>
        <VAvatar color="error" variant="tonal" rounded size="42">
          <VIcon icon="tabler-receipt" size="28" />
        </VAvatar>
      </div>

      <!-- Campo de busca -->
      <AppTextField
        v-model="buscaTipo"
        placeholder="Buscar tipo de despesa..."
        density="compact"
        clearable
        class="mb-4"
      >
        <template #prepend-inner>
          <VIcon icon="tabler-search" size="20" />
        </template>
      </AppTextField>

      <!-- Gráfico com overflow -->
      <div style="max-height: 600px; overflow-y: auto;">
        <VueApexCharts 
          v-if="tiposFiltrados.length > 0"
          :key="JSON.stringify(tiposFiltrados)"
          :options="chartOptions" 
          :series="series" 
          :height="Math.max(300, tiposFiltrados.length * 50)" 
          type="bar" 
        />

        <div v-else class="text-center py-8">
          <VIcon icon="tabler-receipt" size="48" color="disabled" class="mb-2" />
          <p class="text-disabled">Nenhuma despesa categorizada encontrada</p>
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

