<script setup>
import { computed } from "vue";
import { temaAtual } from '@core/stores/config';

const props = defineProps({
  dados: {
    type: Object,
    required: true,
    default: () => ({
      series: {
        quantidade: [],
        valorRecebido: [],
      },
      categories: [],
    }),
  },
});

const tema = computed(() => temaAtual());
const isDark = computed(() => tema.value === 'dark');
const textColor = computed(() => isDark.value ? '#E7E3FC' : '#4C4E64');
const gridColor = computed(() => isDark.value ? '#444564' : '#DBDADE');

const chartOptions = computed(() => {
  return {
    chart: {
      type: "area",
      height: 350,
      toolbar: { show: true },
      zoom: { enabled: true }
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    xaxis: {
      categories: props.dados.categories,
      labels: {
        style: {
          colors: textColor.value,
          fontSize: "12px",
        },
      },
    },
    yaxis: [
      {
        title: {
          text: "Quantidade",
          style: {
            color: textColor.value,
          },
        },
        labels: {
          style: {
            colors: textColor.value,
            fontSize: "12px",
          },
        },
      },
      {
        opposite: true,
        title: {
          text: "Valor Recebido (R$)",
          style: {
            color: textColor.value,
          },
        },
        labels: {
          style: {
            colors: textColor.value,
            fontSize: "12px",
          },
          formatter: (value) => {
            return new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              minimumFractionDigits: 2,
            }).format(value);
          },
        },
      },
    ],
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: {
        colors: textColor.value,
      },
    },
    colors: ['#28C76F', '#7367F0'],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100],
      },
    },
    tooltip: {
      theme: isDark.value ? "dark" : "light",
      y: [
        {
          formatter: (value) => `${value} agendamentos`,
        },
        {
          formatter: (value) =>
            new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(value),
        },
      ],
    },
    grid: {
      borderColor: gridColor.value,
    }
  };
});

const series = computed(() => [
  {
    name: "Quantidade",
    data: props.dados.series.quantidade || [],
  },
  {
    name: "Valor Recebido",
    data: props.dados.series.valorRecebido || [],
  },
]);
</script>

<template>
  <VCard>
    <VCardText>
      <div class="d-flex justify-space-between align-center mb-2">
        <div>
          <h5 class="text-h5 mb-1">Evolução de Agendamentos</h5>
          <p class="text-sm text-disabled mb-0">
            Quantidade e valores por período
          </p>
        </div>
        <VAvatar color="primary" variant="tonal" rounded size="42">
          <VIcon icon="tabler-chart-line" size="28" />
        </VAvatar>
      </div>

      <VueApexCharts
        v-if="series[0].data.length > 0"
        type="area"
        :options="chartOptions"
        :series="series"
        height="350"
      />

      <div v-else class="text-center py-8">
        <VIcon icon="tabler-chart-line" size="48" color="disabled" class="mb-2" />
        <p class="text-disabled mb-0">Sem dados para exibir</p>
      </div>
    </VCardText>
  </VCard>
</template>

