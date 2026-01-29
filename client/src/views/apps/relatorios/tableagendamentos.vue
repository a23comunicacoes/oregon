<script setup>
import { VDataTableServer } from 'vuetify/labs/VDataTable';
import { paginationMeta } from '@api-utils/paginationMeta'
import { useCookieStore } from '@layouts/stores/config'
import { can } from '@layouts/plugins/casl'
import { useAlert } from '@/composables/useAlert'

const props = defineProps({
    cli_id: {
        type: Number,
        required: true
    }
})

const router = useRouter()
const route = useRoute()

const { setAlert } = useAlert()
const cookieStore = useCookieStore()
const loading = ref(true)
const userData = useCookie('userData').value
const userRole = userData.role

onMounted(() => {
    getAgendamentos()
})

// 👉 Store
const searchQuery = ref('')
const funcionarioQuery = ref(null)
const dataQuery = ref('')

// Data table options
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

const updateOptions = options => {
    page.value = options.page
    sortBy.value = options.sortBy[0]?.key
    orderBy.value = options.sortBy[0]?.order

    getAgendamentos()
}

// Headers
const headers = [
    {
        title: 'Data do Agendamento',
        key: 'age_data',
    },
    {
        title: 'Funcionário',
        key: 'funcionario',
    },
    {
        title: 'Serviços',
        key: 'servicos',
        sortable: false,
    },
    {
        title: 'Valor',
        key: 'age_valor',
    },
    {
        title: 'Status',
        key: 'ast_id',
    },
    {
        title: 'Ações',
        key: 'actions',
        sortable: false,
    },
]


const agendamentos = ref([])
const totalAgendamentos = ref(0)

const getAgendamentos = async () => {
    loading.value = true

    try {
        const res = await $api(`/clientes/getAgendamentos/${props.cli_id}`, {
            method: 'GET',
            query: {
                q: searchQuery.value,
                f: funcionarioQuery.value,
                d: dataQuery.value,
                itemsPerPage: itemsPerPage.value,
                page: page.value,
                sortBy: sortBy.value,
                orderBy: orderBy.value
            },
        })

        console.log('res', res)

        agendamentos.value = res.agendamentos
        totalAgendamentos.value = res.totalAgendamentos

        widgetData.value[0].value = res.totalAgendamentos
    } catch (err) {
        console.error('Error fetching user data', err)
        console.error('Error fetching user data', err.response)

        agendamentos.value = []
    }

    loading.value = false
}


const widgetData = ref([
    {
        title: 'Agendamentos',
        value: totalAgendamentos.value,
        desc: 'Total de agendamentos deste cliente',
        icon: 'tabler-calendar-user',
        iconColor: 'primary',
    },
])


const formatValor = (valor) => {
    if (!valor) return 'R$ 0,00'
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const viewAge = (age) => {
    router.push({
        name: 'agendamento',
        query: {
            viewAgendamento: age.age_id
        }
    })
}


const funcionarios = ref([])

const fetchResources = async () => {

    try {
        const res = await $api('/agenda/funcionarios', {
            method: 'GET',
            query: {
                role: 'colaborador',
                ativo: null,
                data: userData.id
            }
        })

        if (!res) return

        console.log('Funcionários:', res)

        funcionarios.value = res

        //Adicionar todos os funcionários
        funcionarios.value.unshift({
            id: null,
            fullName: 'Todos'
        })

    } catch (error) {
        console.error('Error fetching resources', error)
    }
}

fetchResources()

</script>

<template>

    <section>
        <div class="mb-6">
            <VRow class="match-height">
                <template v-for="(data, id) in widgetData" :key="id">
                    <VCol cols="12" md="3">
                        <VCard>

                            <VCardText>
                                <div class="d-flex justify-space-between">
                                    <div class="d-flex flex-column gap-y-1">
                                        <span class="text-body-1 text-medium-emphasis">{{ data.title }}</span>
                                        <div>
                                            <h4 class="text-h4">
                                                {{ data.value }}
                                            </h4>
                                        </div>
                                        <span class="text-sm">{{ data.desc }}</span>
                                    </div>
                                    <VAvatar :color="data.iconColor" variant="tonal" rounded size="38">
                                        <VIcon :icon="data.icon" size="26" />
                                    </VAvatar>
                                </div>
                            </VCardText>
                        </VCard>

                    </VCol>
                </template>

                <VCol cols="12" md="9">
                    <VCard>
                        <VCardText>
                            <VRow>
                                <VCol cols="12" md="4">
                                    <AppTextField v-model="searchQuery" label="Pesquise um agendamento"
                                        placeholder="Pesquisar por data ou valor" density="compact"
                                        @update:model-value="getAgendamentos" />
                                </VCol>

                                <VCol cols="12" md="4">
                                    <AppSelect v-model="funcionarioQuery" :items="funcionarios" item-title="fullName"
                                        item-value="id" label="Filtrar por Funcionário" @update:model-value="getAgendamentos"
                                        placeholder="Selecione um funcionário" />
                                </VCol>

                                <VCol cols="12" md="4">
                                    <AppTextField v-model="dataQuery" label="Filtrar por Data"
                                        placeholder="Pesquisar por data" type="date" density="compact"
                                        @update:model-value="getAgendamentos" />
                                </VCol>
                            </VRow>

                            
                        </VCardText>
                    </VCard>
                </VCol>
            </VRow>

        </div>
        <VCard>
            <VCardText class="d-flex flex-wrap py-4 gap-4">
                <div class="me-3 d-flex gap-3">
                    <AppSelect :model-value="itemsPerPage" :items="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 50, title: '50' },
                        { value: 100, title: '100' },
                        { value: -1, title: 'Todos' },
                    ]" style="inline-size: 6.25rem;" @update:model-value="itemsPerPage = parseInt($event, 10)" />
                </div>
                <VSpacer />
            </VCardText>

            <VDivider />

            <!-- SECTION datatable -->
            <VDataTableServer v-model:items-per-page="itemsPerPage" v-model:page="page" :items="agendamentos"
                :items-length="totalAgendamentos" :headers="headers" class="text-no-wrap"
                @update:options="updateOptions" :loading="loading" loading-text="Carregando agendamentos...">

                <template #item.age_data="{ item }">
                    {{ new Date(item.age_data).toLocaleDateString() }}
                </template>

                <template #item.funcionario="{ item }">
                    {{ item.funcionario[0].fullName }}
                </template>

                <template #item.servicos="{ item }">
                    <ul style="list-style-type: decimal; padding-left: 1rem;" v-if="item.servicos.length > 0">
                        <li v-for="(servico, index) in item.servicos" :key="index">
                            {{ servico.ser_nome }} - {{ servico.ser_descricao }} - {{ formatValor(servico.ser_valor) }}
                        </li>
                    </ul>

                    <p class="mb-0" v-else>
                        Nenhum serviço cadastrado
                    </p>
                </template>

                <template #item.age_valor="{ item }">
                    {{ formatValor(item.age_valor) }}
                </template>

                <template #item.ast_id="{ item }">
                    <VChip :color="item.bkColor" label>
                        {{ item.status }}
                    </VChip>
                </template>

                <!-- Actions -->
                <template #item.actions="{ item }">
                    <IconBtn title="Visualizar agendamento" @click="viewAge(item)">
                        <VIcon icon="tabler-eye" />
                    </IconBtn>
                </template>

                <!-- pagination -->
                <template #bottom>
                    <VDivider />
                    <div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
                        <p class="text-sm text-disabled mb-0">
                            {{ paginationMeta({ page, itemsPerPage }, totalAgendamentos) }}
                        </p>

                        <VPagination v-model="page" :length="Math.ceil(totalAgendamentos / itemsPerPage)"
                            :total-visible="$vuetify.display.xs ? 1 : totalAgendamentos > 100 ? 4 : Math.ceil(totalAgendamentos / itemsPerPage)">
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
            <!-- SECTION -->
        </VCard>

    </section>
</template>
