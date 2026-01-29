<script setup>
import { computed } from 'vue';
import { temaAtual } from '@core/stores/config';

const props = defineProps({
  dados: {
    type: Object,
    required: true,
  },
});

const tema = computed(() => temaAtual());
const isDark = computed(() => tema.value === 'dark');
const textColor = computed(() => isDark.value ? '#E7E3FC' : '#4C4E64');
const gridColor = computed(() => isDark.value ? '#444564' : '#DBDADE');

const formatValue = (value) => {
  if (!value) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const chartSeries = computed(() => [
  {
    name: 'Quantidade',
    data: props.dados.series?.quantidade || [],
  },
  {
    name: 'Valor Total',
    data: props.dados.series?.valorTotal || [],
  },
]);

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    height: 350,
    toolbar: { show: true },
    zoom: { enabled: true }
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  xaxis: {
    categories: props.dados.categories || [],
    labels: {
      style: {
        colors: textColor.value,
        fontSize: '12px',
      },
    },
  },
  yaxis: [
    {
      title: {
        text: 'Quantidade',
        style: {
          color: textColor.value,
        },
      },
      labels: {
        style: {
          colors: textColor.value,
          fontSize: '12px',
        },
      },
    },
    {
      opposite: true,
      title: {
        text: 'Valor Total (R$)',
        style: {
          color: textColor.value,
        },
      },
      labels: {
        style: {
          colors: textColor.value,
          fontSize: '12px',
        },
        formatter: (value) => {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          }).format(value);
        },
      },
    },
  ],
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    labels: {
      colors: textColor.value,
    },
  },
  colors: ['#28C76F', '#7367F0'],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.7,
      opacityTo: 0.3,
      stops: [0, 90, 100],
    },
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    y: [
      {
        formatter: (value) => `${value} serviços`,
      },
      {
        formatter: (value) => formatValue(value),
      },
    ],
  },
  grid: {
    borderColor: gridColor.value,
  }
}));
</script>

<template>
  <VCard>
    <VCardText>
      <div class="d-flex justify-space-between mb-4">
        <div>
          <p class="mb-0 font-weight-bold">Evolução de Serviços</p>
          <p class="mb-0 text-caption">
            Quantidade de serviços e valor gerado ao longo do período
          </p>
        </div>
        <VAvatar color="success" variant="tonal" rounded size="35">
          <VIcon icon="tabler-trending-up" size="25" />
        </VAvatar>
      </div>

      <VueApexCharts
        v-if="chartSeries[0].data.length > 0"
        :key="JSON.stringify(props.dados)"
        type="area"
        :options="chartOptions"
        :series="chartSeries"
        height="350"
      />

      <div v-else class="text-center py-8">
        <p class="text-disabled">Nenhum dado disponível para o período selecionado</p>
      </div>
    </VCardText>
  </VCard>
</template>

