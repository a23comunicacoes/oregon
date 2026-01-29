<script setup>
import { ref } from 'vue';
import agendamentostatus from '@/views/apps/relatorios/agendamentostatus.vue'
import agendamentofonte from '@/views/apps/relatorios/agendamentofonte.vue'
import tableagendamentosretrabalho from '@/views/apps/relatorios/tableagendamentosretrabalho.vue'
import tableagendamentosgarantia from '@/views/apps/relatorios/tableagendamentosgarantia.vue'
import tableagendamentosclientes from '@/views/apps/relatorios/tableagendamentosclientes.vue'
import moment from 'moment';

const { setAlert } = useAlert()

const loading = ref(false)

const userData = useCookie('userData').value
const userRole = userData ? userData.role : null
const canView = userRole === 'admin' || userRole === 'gerente'

const meses = [
    { value: 1, title: 'Janeiro' },
    { value: 2, title: 'Fevereiro' },
    { value: 3, title: 'Março' },
    { value: 4, title: 'Abril' },
    { value: 5, title: 'Maio' },
    { value: 6, title: 'Junho' },
    { value: 7, title: 'Julho' },
    { value: 8, title: 'Agosto' },
    { value: 9, title: 'Setembro' },
    { value: 10, title: 'Outubro' },
    { value: 11, title: 'Novembro' },
    { value: 12, title: 'Dezembro' },
]

const anos = [
    { value: 2024, title: '2024' },
    { value: 2023, title: '2023' },
    { value: 2022, title: '2022' },
    { value: 2021, title: '2021' },
]

const formatValor = (valor) => {
    if (!valor) return 'R$ 0,00'
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

//Formatar data para o formato yyyy-mm-dd
const formatDate = date => {
    if (!date) return null

    const data = new Date(date)
    const dia = data.getDate().toString().padStart(2, '0')
    const mes = (data.getMonth() + 1).toString().padStart(2, '0')
    const ano = data.getFullYear()

    return `${ano}-${mes}-${dia}`
}


let mesAtual = new Date().getMonth() + 1
let anoAtual = new Date().getFullYear()

const dataDe = ref(formatDate(`${anoAtual}-${mesAtual}-01`))
const dataAte = ref(formatDate(`${anoAtual}-${mesAtual}-31`))
const dataDeQuery = ref(formatDate(`${anoAtual}-${mesAtual}-01`))
const dataAteQuery = ref(formatDate(`${anoAtual}-${mesAtual}-31`))

const relatorios = ref([])

const getRelatorios = async () => {

    //Se a data ate for menor que a data de, então a data ate recebe a data de
    if (dataAteQuery.value < dataDeQuery.value) {
        dataAteQuery.value = formatDate(`${anoAtual}-${mesAtual}-31`)
        return setAlert('A data de início não pode ser maior que a data final.', 'error', 'tabler-alert-triangle', 5000)
    }

    loading.value = true
    try {
        const res = await $api('/relatorios/get/agendamentos', {
            query: {
                dataDe: dataDeQuery.value,
                dataAte: dataAteQuery.value
            },
        })

        if (!res) return

        console.log('Relatórios res aged:', res)

        relatorios.value = res

    } catch (error) {
        console.error('Error getting produtos:', error)
        console.error('Error getting produtos:', error.response)

        relatorios.value = []
    }

    dataAte.value = dataAteQuery.value
    dataDe.value = dataDeQuery.value
    loading.value = false
}

onMounted(() => {
    getRelatorios()
})

const imprimir = async (tipo) => {
    console.log(`Imprimir ${tipo}`)

    try {
        let linkApi = `/relatorios/print/${tipo}`

        const res = await $api(linkApi, {
            method: 'POST',
            body: {
                mesDe: dataDe.value,
                mesAte: dataAte.value
            }
        })

        if (!res) return

        //Abrir nova aba com o pdf
        window.open(res, '_blank')

    } catch (error) {
        console.error('Error getting produts:', error)
        console.error('Error getting produts:', error.response)
    }

}

</script>

<template>

    <VDialog v-model="loading" persistent max-width="500">
        <VCard>
            <VCardText>
                <VProgressLinear indeterminate color="primary" height="5" />
            </VCardText>
        </VCard>
    </VDialog>

    <VCard class="mb-8">
        <VCardText class="px-6 py-4">
            <VRow>
                <VCol cols="12" sm="2" class="d-flex align-center">
                    <h4 class="mb-0">
                        Filtros
                        <p class="mb-0 text-caption">Filtre os relatórios por período..</p>
                    </h4>
                </VCol>
                <!-- 👉 Meses -->
                <VCol cols="12" sm="3" class="d-flex flex-row gap-2 align-center">
                    <p class="mb-0">De</p>
                    <AppTextField v-model="dataDeQuery" type="date" :disabled="loading" />
                </VCol>

                <VCol cols="12" sm="3" class="d-flex flex-row gap-2 align-center">
                    <p class="mb-0">Até</p>
                    <AppTextField v-model="dataAteQuery" type="date" :disabled="loading" />
                </VCol>

                <VCol cols="12" sm="3">
                    <VBtn color="primary" @click="getRelatorios" :loading="loading">
                        <VIcon icon="tabler-search" class="mr-1" />
                        Filtrar
                    </VBtn>
                </VCol>
            </VRow>
        </VCardText>
    </VCard>

    <VRow class="match-height mb-6 align-center" v-if="canView">
        <VCol cols="12" md="4">
            <VCard>
                <VCardText>
                    <div class="d-flex justify-space-between">
                        <div class="d-flex flex-column gap-y-2">
                            <span class="text-medium-emphasis">Agendamentos</span>
                            <div class="d-flex flex-row gap-2">
                                <div class="d-flex flex-wrap gap-0">
                                    <h6 class="text-h6 mb-0 w-100">
                                        {{ relatorios.agendamentosRelatorios?.totalAgendamentos }}
                                    </h6>
                                    <span class="text-caption">Quantidade</span>
                                </div>
                                <div class="d-flex flex-wrap gap-0"
                                    style="border-left: 1px #cacaca solid; padding-left: 10px;">
                                    <h6 class="text-h6 mb-0 w-100">
                                        {{ formatValor(relatorios.agendamentosRelatorios?.valorTotalAgendamentos) }}
                                    </h6>
                                    <span class="text-caption">Valor total</span>
                                </div>
                            </div>
                            <span class="text-disabled mb-0" style="font-size: 12px;">Agendamentos de
                                {{ moment(dataDe).format('DD/MM/YYYY') }} até
                                {{ moment(dataAte).format('DD/MM/YYYY') }}
                            </span>
                        </div>
                        <VAvatar color="info" variant="tonal" rounded size="35">
                            <VIcon icon="tabler-calendar" size="25" />
                        </VAvatar>
                    </div>
                </VCardText>
            </VCard>
        </VCol>

        <VCol cols="12" md="4">
            <VCard>
                <VCardText>
                    <div class="d-flex justify-space-between">
                        <div class="d-flex flex-column gap-y-2">
                            <span class="text-medium-emphasis">Agendamentos Atendidos</span>
                            <div class="d-flex flex-row gap-2">
                                <div class="d-flex flex-wrap gap-0">
                                    <h6 class="text-h6 mb-0 w-100">
                                        {{ relatorios.agendamentosRelatorios?.qtdAgendamentosAtendidos }}
                                    </h6>
                                    <span class="text-caption">Quantidade</span>
                                </div>
                                <div class="d-flex flex-wrap gap-0"
                                    style="border-left: 1px #cacaca solid; padding-left: 10px;">
                                    <h6 class="text-h6 mb-0 w-100">
                                        {{
                                            formatValor(relatorios.agendamentosRelatorios?.valorTotalAgendamentosAtendidos)
                                        }}
                                    </h6>
                                    <span class="text-caption">Valor total</span>
                                </div>
                            </div>
                            <span class="text-disabled mb-0" style="font-size: 12px;">Agendamentos de
                                {{ moment(dataDe).format('DD/MM/YYYY') }} até
                                {{ moment(dataAte).format('DD/MM/YYYY') }}
                            </span>
                        </div>
                        <VAvatar color="success" variant="tonal" rounded size="35">
                            <VIcon icon="tabler-calendar-smile" size="25" />
                        </VAvatar>
                    </div>
                </VCardText>
            </VCard>
        </VCol>

        <VCol cols="12" md="4">
            <VCard>
                <VCardText>
                    <div class="d-flex justify-space-between">
                        <div class="d-flex flex-column gap-y-2">
                            <span class="text-medium-emphasis">Agendamentos Confirmados</span>
                            <div class="d-flex flex-row gap-2">
                                <div class="d-flex flex-wrap gap-0">
                                    <h6 class="text-h6 mb-0 w-100">
                                        {{ relatorios.agendamentosRelatorios?.qtdAgendamentosConfirmado }}
                                    </h6>
                                    <span class="text-caption">Quantidade</span>
                                </div>
                                <div class="d-flex flex-wrap gap-0"
                                    style="border-left: 1px #cacaca solid; padding-left: 10px;">
                                    <h6 class="text-h6 mb-0 w-100">
                                        {{
                                            formatValor(relatorios.agendamentosRelatorios?.valorTotalAgendamentosConfirmado)
                                        }}
                                    </h6>
                                    <span class="text-caption">Valor total</span>
                                </div>
                            </div>
                            <span class="text-disabled mb-0" style="font-size: 12px;">Agendamentos de
                                {{ moment(dataDe).format('DD/MM/YYYY') }} até
                                {{ moment(dataAte).format('DD/MM/YYYY') }}
                            </span>
                        </div>
                        <VAvatar color="warning" variant="tonal" rounded size="35">
                            <VIcon icon="tabler-calendar-check" size="25" />
                        </VAvatar>
                    </div>
                </VCardText>
            </VCard>
        </VCol>
    </VRow>

    <VRow class="mb-6">

        <VCol cols="7">
            <v-fade-transition>
                <agendamentostatus :statusQuantidades="relatorios.agendamentosRelatorios?.statusAgendamentosQtd"
                    v-if="relatorios.agendamentosRelatorios?.statusAgendamentosQtd" />
            </v-fade-transition>

            <v-fade-transition>
                <VCard v-if="!relatorios.agendamentosRelatorios?.statusAgendamentosQtd">
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
                        <p>Não há agendamentos disponíveis no período selecionado.</p>
                    </VCardText>
                </VCard>
            </v-fade-transition>
        </VCol>

        <VCol cols="5">
            <v-fade-transition>
                <agendamentofonte :fontesQuantidades="relatorios.agendamentosRelatorios?.fontesAgendamentosQtd"
                    v-if="relatorios.agendamentosRelatorios?.fontesAgendamentosQtd" />
            </v-fade-transition>

            <v-fade-transition>
                <VCard v-if="!relatorios.agendamentosRelatorios?.fontesAgendamentosQtd">
                    <VCardText>
                        <div class="d-flex justify-space-between">
                            <div>
                                <p class="mb-0 font-weight-bold">Fontes por agendamento</p>
                                <p class="mb-5 text-caption">Quantidade de agendamentos que vieram de cada fonte
                                    cadastrada</p>
                            </div>
                            <VAvatar color="success" variant="tonal" rounded size="35">
                                <VIcon icon="tabler-world" size="25" />
                            </VAvatar>
                        </div>
                        <p>Não há agendamentos disponíveis no período selecionado.</p>
                    </VCardText>
                </VCard>
            </v-fade-transition>
        </VCol>
    </VRow>

    <VRow class="mb-4">
        <VCol cols="12" md="4">
            <VCard class="mb-4">
                <VCardText>
                    <div class="d-flex justify-space-between">
                        <div>
                            <p class="mb-0 font-weight-bold">Cidades com mais agendamentos</p>
                            <p class="mb-5 text-caption">Top 10 cidade com mais agendamentos</p>
                        </div>
                        <VAvatar color="info" variant="tonal" rounded size="35">
                            <VIcon icon="tabler-building-skyscraper" size="25" />
                        </VAvatar>
                    </div>

                    <VTable density="compact">
                        <thead>
                            <tr>
                                <th>Cidade</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(cidade, index) in relatorios.agendamentosRelatorios?.cidadesAgendamentosQtd"
                                :key="index"
                                v-if="relatorios.agendamentosRelatorios?.cidadesAgendamentosQtd?.length > 0">
                                <td>{{ cidade.cidade }}</td>
                                <td>{{ cidade.quantidade }}</td>
                            </tr>
                            <tr v-if="relatorios.agendamentosRelatorios?.cidadesAgendamentosQtd?.length == 0">
                                <td colspan="2">Não há agendamentos disponíveis no período selecionado.</td>
                            </tr>
                        </tbody>
                    </VTable>
                </VCardText>
            </VCard>
        </VCol>
        <VCol cols="12" md="4">
            <VCard>
                <VCardText>
                    <div class="d-flex justify-space-between">
                        <div>
                            <p class="mb-0 font-weight-bold">Bairros com mais agendamentos</p>
                            <p class="mb-5 text-caption">Top 10 bairros com mais agendamentos</p>
                        </div>
                        <VAvatar color="info" variant="tonal" rounded size="35">
                            <VIcon icon="tabler-map-pin" size="25" />
                        </VAvatar>
                    </div>

                    <VTable density="compact">
                        <thead>
                            <tr>
                                <th>Bairro</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(bairro, index) in relatorios.agendamentosRelatorios?.bairrosAgendamentosQtd"
                                :key="index"
                                v-if="relatorios.agendamentosRelatorios?.bairrosAgendamentosQtd?.length > 0">
                                <td>{{ bairro.bairro }}</td>
                                <td>{{ bairro.quantidade }}</td>
                            </tr>
                            <tr v-if="relatorios.agendamentosRelatorios?.bairrosAgendamentosQtd?.length == 0">
                                <td colspan="2">Não há agendamentos disponíveis no período selecionado.</td>
                            </tr>
                        </tbody>
                    </VTable>
                </VCardText>
            </VCard>
        </VCol>
        <VCol cols="12" md="4">
            <VCard>
                <VCardText>
                    <div class="d-flex justify-space-between">
                        <div>
                            <p class="mb-0 font-weight-bold">Clientes com mais agendamentos</p>
                            <p class="mb-5 text-caption">Top 10 clientes com mais agendamentos</p>
                        </div>
                        <VAvatar color="info" variant="tonal" rounded size="35">
                            <VIcon icon="tabler-user" size="25" />
                        </VAvatar>
                    </div>

                    <VTable density="compact">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(cliente, index) in relatorios.agendamentosRelatorios?.clientesAgendamentosQtd"
                                :key="index"
                                v-if="relatorios.agendamentosRelatorios?.clientesAgendamentosQtd?.length > 0">
                                <td>{{ cliente.cliente }}</td>
                                <td>{{ cliente.quantidade }}</td>
                            </tr>
                            <tr v-if="relatorios.agendamentosRelatorios?.clientesAgendamentosQtd?.length == 0">
                                <td colspan="2">Não há agendamentos disponíveis no período selecionado.</td>
                            </tr>
                        </tbody>
                    </VTable>
                </VCardText>
            </VCard>
        </VCol>

    </VRow>

    <VRow class="mb-4">
        <VCol cols="12">
            <VCard>
                <VCardText>
                    <div class="d-flex justify-space-between mb-3">
                        <div>
                            <p class="mb-0 font-weight-bold">Relatório de Retrabalhos</p>
                            <p class="mb-5 text-caption">Agendamentos que tiveram retrabalho</p>
                        </div>
                        <VAvatar color="warning" variant="tonal" rounded size="35">
                            <VIcon icon="tabler-repeat" size="25" />
                        </VAvatar>
                    </div>

                    <tableagendamentosretrabalho :dataDe="dataDe" :dataAte="dataAte" />
                </VCardText>
            </VCard>
        </VCol>
    </VRow>

    <VRow class="mb-6">
        <VCol cols="12">
            <VCard>
                <VCardText>
                    <div class="d-flex justify-space-between mb-3">
                        <div>
                            <p class="mb-0 font-weight-bold">Relatório de Garantias</p>
                            <p class="mb-5 text-caption">Relatório de garantias dos agendamentos</p>
                        </div>
                        <VAvatar color="success" variant="tonal" rounded size="35">
                            <VIcon icon="tabler-certificate" size="25" />
                        </VAvatar>
                    </div>

                    <tableagendamentosgarantia :dataDe="dataDe" :dataAte="dataAte" />
                </VCardText>
            </VCard>
        </VCol>
    </VRow>

    <VRow class="mb-6">
        <VCol cols="12">
            <VCard>
                <VCardText>
                    <div class="d-flex justify-space-between mb-3">
                        <div>
                            <p class="mb-0 font-weight-bold">Relatório por Clientes</p>
                            <p class="mb-5 text-caption">Relatório de agendamentos por cliente</p>
                        </div>
                        <VAvatar color="success" variant="tonal" rounded size="35">
                            <VIcon icon="tabler-user" size="25" />
                        </VAvatar>
                    </div>

                    <tableagendamentosclientes :dataDe="dataDe" :dataAte="dataAte" />
                </VCardText>
            </VCard>
        </VCol>
    </VRow>

</template>
