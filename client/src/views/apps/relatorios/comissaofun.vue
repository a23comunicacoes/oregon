<script setup>
import { useTheme } from 'vuetify'
import { hexToRgb } from '@layouts/utils'

const props = defineProps({
  funcionariosData: Array,
})

const funcionariosData = ref(props.funcionariosData)

watch(() => props.funcionariosData, (val) => {
  funcionariosData.value = val
})

const vuetifyTheme = useTheme()
const currentTab = ref(0)
const refVueApexChart = ref()

// Função para gerar a lista de cores
const getColors = (funcionariosData) => {
  return funcionariosData.map(item => item.color)
}

const chartConfigs = computed(() => {

  return [
    {
      chartOptions: {
        chart: {
          parentHeightOffset: 0,
          type: 'bar',
          toolbar: { show: false },
          width: '100%',
        },
        plotOptions: {
          bar: {
            horizontal: true,
            startingShape: 'rounded',
            borderRadius: 4,
            distributed: true,
            dataLabels: { position: 'top' },
          },
        },
        grid: {
          show: false,
          padding: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
        },
        colors: getColors(funcionariosData.value),
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val}`,
          style: {
            fontSize: '13px',
            colors: ['black'],
            fontWeight: '600',
            fontFamily: 'Public Sans',
          },
        },
        legend: { show: true },
        tooltip: { enabled: false },
        xaxis: {
          categories: funcionariosData.value.filter(item => item && item.fullName).map(item => {
            return item.fullName
          }),
          labels: {
            show: false
          },
          axisBorder: {
            show: true,
          },
          axisTicks: { show: false },
        },
        yaxis: {
          show: true,
          showAlways: true,
          axisBorder: {
            show: true,
            color: 'gray',
          },
          axisTicks: { show: false },
          labels: {
            style: {
              colors: 'gray',
              fontSize: '13px',
              fontWeight: 400,
              fontFamily: 'Public Sans',
            },
          },
        },
      },
      series: [{
        data: funcionariosData.value.filter(item => item && item.quantidade).map(item => item.quantidade),
      }],
    }
  ]
})
</script>

<template>
  <VCard>
    <VCardText>
      <div class="d-flex justify-space-between">
        <div>
          <p class="mb-0 font-weight-bold">Comissões por funcionário</p>
          <p class="mb-5 text-caption">Quantidade de comissões por funcionário</p>
        </div>
        <VAvatar color="success" variant="tonal" rounded size="35">
          <VIcon icon="tabler-info-circle" size="25" />
        </VAvatar>
      </div>

      <VueApexCharts ref="refVueApexChart" :key="currentTab" :options="chartConfigs[Number(currentTab)].chartOptions"
        :series="chartConfigs[Number(currentTab)].series" :height="funcionariosData.length <= 3 ? '220' : '300'"
        type="bar" class="w-100" />
    </VCardText>
  </VCard>
</template>
