<script setup>
import { useTheme } from 'vuetify'
import { hexToRgb } from '@layouts/utils'

const props = defineProps({
  statusQuantidades: Array,
})

const statusQuantidades = ref(props.statusQuantidades)

watch(() => props.statusQuantidades, (val) => {
  statusQuantidades.value = val
})

const vuetifyTheme = useTheme()
const currentTab = ref(0)
const refVueApexChart = ref()

const chartConfigs = computed(() => {

  return [
    {
      chartOptions: {
        chart: {
          parentHeightOffset: 0,
          type: 'bar',
          toolbar: { show: false },
          width: '100%'
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
        theme: {
          palette: 'palette7' // upto palette10
        },
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
          categories: statusQuantidades.value.filter(item => item && item.status).map(item => {
            return item.status
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
        data: statusQuantidades.value.filter(item => item && item.quantidade).map(item => item.quantidade),
        //map(item => item.quantidade),
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
          <p class="mb-0 font-weight-bold">Agendamentos por status</p>
          <p class="mb-5 text-caption">Quantidade de agendamentos por status</p>
        </div>
        <VAvatar color="success" variant="tonal" rounded size="35">
          <VIcon icon="tabler-calendar" size="25" />
        </VAvatar>
      </div>

      <VueApexCharts ref="refVueApexChart" :key="currentTab" :options="chartConfigs[Number(currentTab)].chartOptions"
        :series="chartConfigs[Number(currentTab)].series" :height="statusQuantidades.length <= 3 ? '220' : '300'"
        type="bar" />
    </VCardText>
  </VCard>
</template>
