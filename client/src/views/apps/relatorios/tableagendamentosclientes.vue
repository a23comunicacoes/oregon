<script setup>
import { VDataTableServer } from 'vuetify/labs/VDataTable';
import { paginationMeta } from '@api-utils/paginationMeta'
import { useCookieStore } from '@layouts/stores/config'
import { can } from '@layouts/plugins/casl'
import { useAlert } from '@/composables/useAlert'

const props = defineProps({
    dataDe: {
        type: String,
        default: null,
    },
    dataAte: {
        type: String,
        default: null,
    },
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
const dataDeQuery = ref('')
const dataAteQuery = ref('')
const statusQuery = ref(null)

const clienteQuery = ref(null)
const clienteText = ref('')

const clientes = ref([])

const loadingClientes = ref(false)

const getClientes = async () => {
  let textQuery = clienteText.value

  if (textQuery.length < 3) {
    clientes.value = []
    return
  }

  loadingClientes.value = true

  try {
    const res = await $api('/clientes/list', {
      method: 'GET',
      query: {
        q: textQuery
      }
    })

    if (!res) return

    console.log('Res Get Clientes:', res)

    clientes.value = res.clientes

  } catch (error) {
    console.error('Error Get Clientes:', error, error.response)
  } finally {
    loadingClientes.value = false
  }

}

const setCliente = cliente => {
  clienteText.value = cliente.cli_nome
  clienteQuery.value = cliente.cli_id
  clientes.value = []

  getAgendamentos()
}

const clearClientes = () => {
  clienteText.value = ''
  clienteQuery.value = ''
  clientes.value = []
  getAgendamentos()
}

if(props.dataDe) {
    dataDeQuery.value = props.dataDe
}

if(props.dataAte) {
    dataAteQuery.value = props.dataAte
}

watch(() => props.dataDe, () => {
    dataDeQuery.value = props.dataDe
    getAgendamentos()
})

watch(() => props.dataAte, () => {
    dataAteQuery.value = props.dataAte
    getAgendamentos()
})

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
        title: 'Cliente',
        key: 'cliente',
        sortable: false,
    },
    {
        title: 'Data do Agendamento',
        key: 'age_data',
    },
    {
        title: 'Funcionário',
        key: 'funcionario',
        sortable: false,
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
        title: 'Ações',
        key: 'actions',
        sortable: false,
    },
]


const agendamentos = ref([])
const totalAgendamentos = ref(0)

const getAgendamentos = async () => {
    loading.value = true

    console.log('Data de Query:', dataDeQuery.value, 'Data Ate Query:', dataAteQuery.value)

    try {
        const res = await $api(`/agenda/getAgendamentosByCliente/`, {
            method: 'GET',
            query: {
                q: searchQuery.value,
                dataDe: dataDeQuery.value,
                dataAte: dataAteQuery.value,
                cliente: clienteQuery.value,
                status: statusQuery.value,
                itemsPerPage: itemsPerPage.value,
                page: page.value,
                sortBy: sortBy.value,
                orderBy: orderBy.value
            },
        })

        console.log('res', res)

        agendamentos.value = res.agendamentos
        totalAgendamentos.value = res.totalAgendamentos
    } catch (err) {
        console.error('Error fetching user data', err)
        console.error('Error fetching user data', err.response)

        agendamentos.value = []
    }

    loading.value = false
}

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

const statusItens = [
    { value: null, title: 'Todos' },
    { value: 1, title: 'Agendado' },
    { value: 2, title: 'Confirmado' },
    { value: 3, title: 'Atendido' },
    { value: 6, title: 'Cancelado' },
    { value: 7, title: 'Remarcado' }
]

</script>

<template>

    <section>
        <div class="mb-6">
            <VRow class="match-height">
                <VCol cols="12">
                    <VCard>
                        <VCardText>
                            <VRow>
                                <VCol cols="12" md="4">
                                    <v-menu location="bottom" height="250px">
                                        <template v-slot:activator="{ props }">
                                          <AppTextField v-model="clienteText" variant="solo-filled" v-bind="props"
                                            :loading="loadingClientes" @keyup="getClientes" clearable @click:clear="clearClientes"
                                            label="Pesquise por cliente"
                                            placeholder="Pesquise por cliente por nome, CPF, telefone ou endereço"/>
                                        </template>
                    
                                        <VList dense v-if="clientes.length > 0">
                                          <VListItem v-for="cliente in clientes" :key="cliente.id" class="item-cliente"
                                            @click="setCliente(cliente)">
                                            <p class="mb-0">{{ cliente.cli_nome ?? 'N/A' }} - {{ cliente.end_bairro }}</p>
                                            <p class="text-caption mb-0">
                                              <VIcon icon="tabler-map-pin" size="12" class="mr-1" />
                                              {{ cliente.end_logradouro }}, {{ cliente.end_numero }} -
                                              {{ cliente.end_cidade }}
                                            </p>
                                          </VListItem>
                                        </VList>
                    
                                        <VList dense v-else-if="clienteText === ''">
                                          <VListItem>
                                            <p class="mb-0">Escreva mais de 3 letras para pesquisar um cliente por nome,
                                              CPF, telefone ou endereço</p>
                                          </VListItem>
                                        </VList>
                    
                                        <VList dense v-else-if="clientes.length === 0 && clienteText !== ''">
                                          <VListItem>
                                            <p class="mb-0">Nenhum cliente encontrado</p>
                                          </VListItem>
                                        </VList>
                                      </v-menu>
                                </VCol>

                                <VCol cols="12" md="4">
                                    <AppTextField v-model="searchQuery" label="Pesquise por valor"
                                        placeholder="Pesquisar por valor" density="compact"
                                        @update:model-value="getAgendamentos" />
                                </VCol>

                                <VCol cols="12" md="4">
                                    <AppSelect v-model="statusQuery" :items="statusItens" label="Status do Agendamento"
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

                <template #item.cliente="{ item }">
                    <p class="mb-0" style="max-width: 150px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                        {{ item?.cliente[0]?.cli_nome ?? 'N/A' }}
                    </p>
                    <p class="mb-0" v-if="item.cliente[0]?.cli_celular">
                        <VIcon icon="tabler-phone" size="15" />
                        {{ item.cliente[0]?.cli_celular ?? 'N/A' }}
                    </p>
                    <p class="mb-0" v-if="item.cliente[0]?.cli_celular2">
                        <VIcon icon="tabler-phone" size="15" />
                        {{ item.cliente[0]?.cli_celular2 ?? 'N/A' }}
                    </p>
                </template>

                <template #item.age_data="{ item }">
                    {{ new Date(item.age_data).toLocaleDateString() }}
                </template>

                <template #item.funcionario="{ item }">
                    {{ item.funcionario[0].fullName }}
                </template>

                <template #item.servicos="{ item }">
                    <ul style="list-style-type: decimal; padding-left: 1rem;" v-if="item.servicos.length > 0">
                        <li v-for="(servico, index) in item.servicos" :key="index">
                            {{ servico.ser_nome }} - {{ servico.ser_descricao }} - {{ formatValor(servico.ser_valor) }} - <strong>Qtd:</strong> {{ servico.ser_quantity }}
                        </li>
                    </ul>

                    <p class="mb-0" v-else>
                        Nenhum serviço cadastrado
                    </p>
                </template>

                <template #item.age_valor="{ item }">
                    {{ formatValor(item.age_valor) }}
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
