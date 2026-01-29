<script setup>
import { paginationMeta } from '@api-utils/paginationMeta'
import { useAlert } from '@/composables/useAlert'
import SaidaDialog from '@/views/apps/pagamentos/SaidaDialog.vue'

const { setAlert } = useAlert()

const router = useRouter()
const route = useRoute()

const userData = useCookie('userData').value
const userRole = userData.role

const saidas = ref([])
const usuarios = ref([])

const loading = ref(true)
const loadingAdd = ref(false)

let mesAtual = new Date().getMonth() + 1

// 👉 Store
const searchQuery = ref('')
const funcionarioQuery = ref(0)
const dateQuery = ref('')
const mesQuery = ref(mesAtual)
const anoQuery = ref(new Date().getFullYear())

watch(dateQuery, (newVal) => {
    
    if(newVal && newVal != '' && newVal != null) {
        mesQuery.value = ''
        anoQuery.value = ''
    }

})

watch(mesQuery, (newVal) => {
    
    if(newVal && newVal != '' && newVal != null) {
        dateQuery.value = ''
    }

})

watch(anoQuery, (newVal) => {
    
    if(newVal && newVal != '' && newVal != null) {
        dateQuery.value = ''
    }

})

// Data table options
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const totalSaidas = ref(0)

const updateOptions = options => {
    page.value = options.page
    sortBy.value = options.sortBy[0]?.key
    orderBy.value = options.sortBy[0]?.order

    getSaidas()
}

// Headers
const headers = [
    {
        title: 'Descrição',
        key: 'sai_descricao',
    },
    {
        title: 'Data',
        key: 'sai_data',
    },
    {
        title: 'Valor',
        key: 'sai_valor',
    },
    {
        title: 'Forma de Pagamento',
        key: 'sai_fpt',
        maxWidth: '100px',
        width: '100px',
    },
    {
        title: 'Lançada por',
        key: 'fullName',
    },
    {
        title: 'Ações',
        key: 'actions',
        sortable: false,
    },
]


const selecionados = ref([])
const contas = ref([])


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

const anosQ = () => {
    /* { value: 2024, title: '2024' },
    { value: 2023, title: '2023' },
    { value: 2022, title: '2022' },
    { value: 2021, title: '2021' }, */

    let anosArray = []
    for(let i = 2019; i <= 2030; i++) {
        anosArray.push({ value: i, title: i })
    }

    return anosArray
}


const anos = ref(anosQ())

const pagoSelect = [
    { value: 0, title: 'Todos' },
    { value: 1, title: 'Pago' },
    { value: 2, title: 'Em aberto' },
    { value: 3, title: 'Em atraso' },
]

const relatorios = ref({
    totalSaidasValor: 0,
})

const widgetData = ref([
    {
        title: 'Valor Total Saídas',
        value: relatorios.value?.relatorios?.totalSaidasValor,
        desc: `${meses.find(mes => mes.value == mesQuery.value).title}/${anoQuery.value}`,
        icon: 'tabler-coin',
        iconColor: 'warning',
    }
])



const formatValor = (valor) => {
    if (!valor) return 'R$ 0,00'
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}


const getSaidas = async () => {

    loading.value = true

    try {
        const res = await $api('/pagamentos/list/saidas', {
            query: {
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                q: searchQuery.value,
                sortBy: sortBy.value,
                orderBy: orderBy.value,
                d: dateQuery.value,
                u: funcionarioQuery.value,
                mes: mesQuery.value,
                ano: anoQuery.value
            },
        })

        if (!res) return

        console.log('pagar:', res)

        saidas.value = res.saidas
        usuarios.value = res.usuarios
        totalSaidas.value = res.totalSaidas

        //Atualizar widgets
        widgetData.value = [
            {
                title: 'Valor Total Saídas',
                value: res.relatorios?.totalSaidasValor,
                desc: 
                anoQuery.value && mesQuery.value ? 
                `${meses.find(mes => mes.value == mesQuery.value).title}/${anoQuery.value}` :
                `${new Date(dateQuery.value).toLocaleDateString('pt-BR')}`, 
                icon: 'tabler-coin',
                iconColor: 'warning',
            }
        ]

    } catch (error) {
        console.error('Error getting produtos:', error)
        console.error('Error getting produtos:', error.response)

        saidas.value = []
    }

    loading.value = false
}

onMounted(() => {
    getSaidas()
})

const saidaData = ref([])
const isPagarDrawerVisible = ref(false)

const editarSaida = async (item) => {
    try {
        const res = await $api(`/pagamentos/get/saidas/${item}`, {
            method: 'GET'
        })

        if (!res) return

        console.log('Produto edit:', res)

        saidaData.value = res

        isPagarDrawerVisible.value = true
    } catch (error) {
        console.error('Error getting produto:', error)
        console.error('Error getting produto:', error.response)
    }
}

const deletarSaida = async (item) => {
    const confirma = confirm('Tem certeza que deseja deletar esta saída? Esta ação não pode ser desfeita.')

    if (!confirma) return


    try {
        const res = await $api(`/pagamentos/delete/saidas/${item}`, {
            method: 'DELETE',
        })

        if (!res) return

        setAlert('Saída deletada com sucesso!', 'success', 'tabler-trash', 3000)

        getSaidas()
    } catch (error) {
        console.error('Error deleting produto:', error)
        console.error('Error deleting produto:', error.response)
    }

}

const imprimir = async (tipo) => {
  console.log(`Imprimir ${tipo}`)

  if(!mesQuery.value || !anoQuery.value) {
    setAlert('Selecione um mês e um ano para imprimir o relatório!', 'error', 'tabler-alert-triangle', 3000)
    return
  }

  if(saidas.value.length == 0 || totalSaidas.value == 0) {
    setAlert('Não há saídas para imprimir!', 'error', 'tabler-alert-triangle', 3000)
    return
  }

  try {
    let linkApi = `/relatorios/print/${tipo}`

    const res = await $api(linkApi, {
      method: 'POST',
      body: {
        mesDe: mesQuery.value,
        mesAte: mesQuery.value,
        ano: anoQuery.value,
      }
    })

    if (!res) return

    //Abrir nova aba com o pdf
    window.open(res, '_blank')

  } catch (error) {
    console.error('Error getting produtos:', error)
    console.error('Error getting produtos:', error.response)
  }

}
</script>
<template>

    <VRow class="mb-6">
        <VCol cols="12" md="3">
            <template v-for="(data, id) in widgetData" :key="id">
                <VCard>
                    <VCardText>
                        <div class="d-flex justify-space-between">
                            <div class="d-flex flex-column gap-y-1">
                                <span class="text-medium-emphasis">{{ data.title }}</span>
                                <div>
                                    <h5 class="text-h5">
                                        {{ formatValor(data.value) }}
                                    </h5>
                                </div>
                                <span class="text-caption">{{ data.desc }}</span>
                            </div>
                            <VAvatar :color="data.iconColor" variant="tonal" rounded size="30">
                                <VIcon :icon="data.icon" size="20" />
                            </VAvatar>
                        </div>
                    </VCardText>
                </VCard>
            </template>
        </VCol>

        <VCol cols="12" md="9">
        <VCard>
            <VCardText>
                <VRow>
                    <!-- 👉 Search  -->
                    <VCol cols="12" sm="4">
                        <AppTextField v-model="searchQuery" label="Pesquise uma saída"
                            placeholder="Pesquise pela descrição, data ou valor" density="compact" @input="getSaidas"
                            @keyup="getSaidas" clearable @click:clear="getSaidas" />
                    </VCol>
                    <!-- 👉 Meses -->
                    <VCol cols="12" sm="4">
                        <AppSelect v-model="mesQuery" :items="meses" label="Mês" placeholder="Selecione um mês"
                            density="compact" @update:model-value="getSaidas"
                            :hint="anoQuery == '' || anoQuery == null ? 'Selecione o ano' : undefined"
                            :persistent-hint="(anoQuery == '' || anoQuery == null) && (mesQuery != null && mesQuery != '')" />
                    </VCol>
                    <!-- 👉 Ano -->
                    <VCol cols="12" sm="4">
                        <AppSelect v-model="anoQuery" :items="anos" label="Ano" placeholder="Selecione um ano"
                            density="compact" @update:model-value="getSaidas" />
                    </VCol>
                    <!-- Funcionario -->
                    <VCol cols="12" sm="6">
                        <AppSelect v-model="funcionarioQuery" :items="usuarios" label="Lançado por"
                            placeholder="Selecione um funcionário" density="compact" @update:model-value="getSaidas"
                            item-value="id" item-title="fullName" />
                    </VCol>
                    <!-- Data -->
                    <VCol cols="12" sm="6">
                        <AppTextField v-model="dateQuery" label="Data" type="date" placeholder="Selecione uma data"
                            density="compact" @input="getSaidas" @keyup="getSaidas" clearable @click:clear="getSaidas" />
                    </VCol>

                </VRow>
            </VCardText>
        </VCard>
    </VCol>
    </VRow>

    <VCard>
        <VCardText class="d-flex flex-wrap py-4 gap-4">

            <VBtn color="primary" @click="imprimir('saidas')" variant="tonal">
                <VIcon icon="tabler-printer" class="mr-2"/>
                <span style="text-transform: none !important;">Relatório de Saídas</span>
            </VBtn>

            <VSpacer />

            <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
                <p class="mb-0">Para adicionar uma saída, navegue até a aba de pagar!</p>
            </div>
        </VCardText>

        <VDivider />

        <!-- SECTION datatable -->
        <VDataTableServer v-model:items-per-page="itemsPerPage" v-model:page="page" :items="saidas"
            :items-length="totalSaidas" :headers="headers" class="text-no-wrap tabela-produtos tabela-pagar"
            @update:options="updateOptions" :loading="loading" loading-text="Carregando..." show-select item-value="id"
            v-model="selecionados" return-object item-selectable="selectable">

            <template #item.sai_descricao="{ item }">
                <p class="mb-0"
                    style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ item.sai_descricao }}
                </p>
            </template>

            <template #item.sai_data="{ item }">
                <p class="mb-0">{{ new Date(item.sai_data).toLocaleDateString('pt-BR') }}</p>
            </template>

            <template #item.sai_valor="{ item }">
                <p class="mb-0">{{ formatValor(item.sai_valor) }}</p>
            </template>

            <template #item.sai_fpt="{ item }">
                <p class="mb-0">{{ item.sai_fpt }}</p>
            </template>

            <template #item.fullName="{ item }">
                <p class="mb-0">{{ item.fullName }}</p>
            </template>

            <template v-slot:item.actions="{ item }">
                <VTooltip location="end">
                    <template #activator="{ props }">
                        <VIcon v-bind="props" @click="editarSaida(item.sai_id)">
                            tabler-edit
                        </VIcon>
                    </template>
                    <span>Editar/Visualizar</span>
                </VTooltip>

                <VTooltip location="end">
                    <template #activator="{ props }">
                        <VIcon v-bind="props" @click="deletarSaida(item.sai_id)" color="error" class="ml-3">
                            {{ item.excluindo ? 'tabler-loader' : ' tabler-trash' }}
                        </VIcon>
                    </template>
                    <span>{{ item.excluindo ? 'Carregando...' : 'Deletar Saída' }}</span>
                </VTooltip>
            </template>


            <!-- pagination -->
            <template #bottom>
                <VDivider />
                <div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
                    <p class="text-sm text-disabled mb-0" v-if="itemsPerPage != -1">
                        {{ paginationMeta({ page, itemsPerPage }, totalSaidas) }}
                    </p>
                    <p class="text-sm text-disabled mb-0" v-if="itemsPerPage == -1">
                        {{ 'Exibindo ' + totalSaidas + ' resultados' }}
                    </p>


                    <AppSelect :model-value="itemsPerPage" :items="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 50, title: '50' },
                        { value: 100, title: '100' },
                        { value: -1, title: 'Todos' },
                    ]" style="inline-size: 6.25rem;" @update:model-value="itemsPerPage = parseInt($event, 10)" />

                    <VPagination v-model="page" :length="Math.ceil(totalSaidas / itemsPerPage)"
                        :total-visible="$vuetify.display.xs ? 1 : Math.ceil(totalSaidas / itemsPerPage) > 5 ? 5 : Math.ceil(totalSaidas / itemsPerPage)">
                        <template #prev="slotProps">
                            <VBtn variant="tonal" color="default" v-bind="slotProps" :icon="false">
                                Anterior
                            </VBtn>
                        </template>

                        <template #next="slotProps">
                            <VBtn variant="tonal" color="default" v-bind="slotProps" :icon="false">
                                Próximo
                            </VBtn>
                        </template>
                    </VPagination>
                </div>
            </template>
        </VDataTableServer>

    </VCard>

    <SaidaDialog :isDrawerOpen="isPagarDrawerVisible" @update:isDrawerOpen="isPagarDrawerVisible = $event"
        :saidaData="saidaData" @updatePagar="getSaidas" />

</template>
