<script setup>
import { useTheme } from 'vuetify'
import { hexToRgb } from '@layouts/utils'

const props = defineProps({
    servicosDataQtd: {
        type: Array,
        default: () => []
    }
})

const servicosDataQtd = ref(props.servicosDataQtd)

watch(() => props.servicosDataQtd, (val) => {
    servicosDataQtd.value = val
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
                    palette: 'palette1' // upto palette10
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
                    categories: servicosDataQtd.value.filter(item => item && item.ser_nome).map(item => {
                        return item.ser_nome
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
                data: servicosDataQtd.value.filter(item => item && item.qtdAtendidos).map(item => item.qtdAtendidos),
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
                    <p class="mb-0 font-weight-bold">Serviços</p>
                    <p class="mb-5 text-caption">Quantidade de serviços, por tipo, atendidos no período selecionado</p>
                </div>
                <VAvatar color="success" variant="tonal" rounded size="35">
                    <VIcon icon="tabler-tools" size="25" />
                </VAvatar>
            </div>

            <VueApexCharts ref="refVueApexChart" :key="currentTab"
                :options="chartConfigs[Number(currentTab)].chartOptions"
                :series="chartConfigs[Number(currentTab)].series"
                :height="servicosDataQtd.length <= 3 ? '220' : servicosDataQtd.length <= 12 ? '500' : 800" type="bar" />
        </VCardText>
    </VCard>
</template>
