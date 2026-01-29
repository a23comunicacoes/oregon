<script setup>
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { useAlert } from '@/composables/useAlert'
import { watch } from 'vue';

const loading = ref(false)
const isNewCliente = ref(true)

const props = defineProps({
    isDrawerOpen: {
        type: Boolean,
        required: true,
    },
    clienteData: Object,
})

const emit = defineEmits([
    'update:isDrawerOpen',
    'updateClients',
    'closeDrawer',
    'newClientEvent'
])

console.log('ClienteData:', props.clienteData)


const { setAlert } = useAlert()

const atualUser = useCookie('userData').value

const cliente = ref({
    id: 0,
    nome: '',
    email: '',
    celular: '',
    celular2: '',
    cpf: '',
    endereco: [{
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
    }],
    observacao: '',
})

watch(() => props.clienteData, (newVal) => {
    if (newVal && newVal?.id !== null && newVal?.id !== undefined && newVal?.id !== 0) {
        isNewCliente.value = false
        console.log('Não é novo cliente:', newVal)
        cliente.value = newVal
    }
})

if (props.clienteData && props.clienteData?.id !== null && props.clienteData?.id !== undefined && props.clienteData?.id !== 0) {
    isNewCliente.value = false
    console.log('Não é novo cliente:', props.clienteData)
    cliente.value = props.clienteData
}

const addEndereco = () => {
    cliente.value.endereco.push({
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
    })
}

const limparCliente = () => {
    cliente.value = {
        id: 0,
        nome: '',
        email: '',
        celular: '',
        celular2: '',
        cpf: '',
        endereco: [{
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
        }],
        observacao: '',
    }
}

const closeNavigationDrawer = () => {
    emit('update:isDrawerOpen', false)
    limparCliente()
}

const handleDrawerModelValueUpdate = val => {
    emit('update:isDrawerOpen', val)
}

const saveClient = async () => {

    if (cliente.value.nome === '') {
        setAlert('O nome do cliente é obrigatório', 'tabler-info-triangle', 'error', 3000)
        return
    }

    console.log('Cliente:', cliente.value)
    loading.value = true

    let link = isNewCliente.value ? '/clientes/create' : `/clientes/update/${cliente.value.id}`

    try {
        const res = await $api(link, {
            method: 'POST',
            body: {
                data: cliente.value,
            }
        })

        if (!res) return

        console.log('Cliente cadastrado com sucesso!', res)

        setAlert(`Cliente ${isNewCliente.value ? 'cadastrado' : 'Atualizado'} com sucesso!`, 'success', 'tabler-user-check', 3000)

        closeNavigationDrawer()
        emit('updateClients')

        if(isNewCliente.value) {
            emit('newClientEvent', res[0])
        }
    } catch (error) {
        console.error('Erro ao cadastrar cliente:', error, error.response)
        setAlert(`Erro ao ${isNewCliente.value ? 'cadastrar' : 'atualizar'} cliente! Tente novamente.`, 'error', 'tabler-alert-triangle', 3000)
    }

    loading.value = false
}

const getCep = async (cep, index) => {
    if (cep.length < 9) return

    const res = await $api(`/clientes/clientes-cep`, {
        method: 'GET',
        query: { cep: cep.replace('-', '') }
    })

    if (!res) return

    cliente.value.endereco[index].logradouro = res.logradouro
    cliente.value.endereco[index].bairro = res.bairro
    cliente.value.endereco[index].cidade = res.localidade
    cliente.value.endereco[index].estado = res.uf
}

</script>
<template>
    <VDialog persistent class="scrollable-content" :model-value="props.isDrawerOpen"
        @update:model-value="handleDrawerModelValueUpdate">

        <PerfectScrollbar :options="{ wheelPropagation: false }">
            <VCard flat>
                <VCardText class="pt-2">
                    <!-- 👉 Title -->
                    <AppDrawerHeaderSection :title="isNewCliente ? 'Cadastrar Cliente' : 'Editar Cliente'"
                        @cancel="closeNavigationDrawer" />

                    <p class="font-weight-bold">Informações do Cliente</p>
                    <VRow>
                        <VCol cols="12" md="6">
                            <VLabel>
                                <VIcon icon="tabler-align-left" class="mr-2" /> Nome Completo
                            </VLabel>
                            <VTextField v-model="cliente.nome" required :rules="[requiredValidator]"
                                placeholder="Insira o nome do usuário" />
                        </VCol>

                        <VCol cols="12" md="6">
                            <VLabel>
                                <VIcon icon="tabler-mail" class="mr-2" /> Email
                            </VLabel>
                            <VTextField v-model="cliente.email" :rules="[emailValidator]"
                                placeholder="Insira o email do usuário" />
                        </VCol>

                        <VCol cols="12" md="4">
                            <VLabel>
                                <VIcon icon="tabler-phone" class="mr-2" /> Celular
                            </VLabel>
                            <VTextField v-model="cliente.celular" placeholder="Insira o celular do usuário" />
                        </VCol>

                        <VCol cols="12" md="4">
                            <VLabel>
                                <VIcon icon="tabler-phone" class="mr-2" /> Celular 2
                            </VLabel>
                            <VTextField v-model="cliente.celular2" placeholder="Insira o celular secundário do usuário" />
                        </VCol>

                        <VCol cols="12" md="4">
                            <VLabel>
                                <VIcon icon="tabler-id" class="mr-2" /> CPF/CNPJ
                            </VLabel>
                            <VTextField v-model="cliente.cpf" placeholder="Insira o CPF/CNPJ do usuário"
                                v-mask="['###.###.###-##', '##.###.###/####-##']" />
                        </VCol>

                        <VCol cols="12">
                            <VLabel>
                                <VIcon icon="tabler-message" class="mr-2" /> Observação
                            </VLabel>
                            <VTextarea v-model="cliente.observacao" rows="2" placeholder="Insira uma observação" />
                        </VCol>
                    </VRow>

                    <p class="font-weight-bold mt-10 mb-3">
                        Endereços
                        <VBtn @click="addEndereco" class="ml-2" size="small" variant="tonal">
                            <VIcon icon="tabler-plus" />
                            Adicionar novo endereço
                        </VBtn>
                    </p>

                    <VRow v-for="(endereco, index) in cliente.endereco" :key="index">
                        <VCol cols="12">
                            <VDivider v-if="index !== 0" />
                            <p class="mt-2 mb-0" v-if="cliente.endereco.length > 1">
                                Endereço {{ index + 1 }}
                                <VBtn @click="cliente.endereco.splice(index, 1)" class="ml-2" color="error" size="small"
                                    variant="tonal" v-if="index !== 0">
                                    <VIcon icon="tabler-trash" />
                                    Remover endereço
                                </VBtn>
                            </p>
                        </VCol>
                        <VCol cols="12" md="3">
                            <VLabel>
                                <VIcon icon="tabler-map" class="mr-2" /> CEP
                            </VLabel>
                            <VTextField v-model="endereco.cep" placeholder="Insira o CEP"
                                @keyup="getCep(endereco.cep, index)" v-mask="'#####-###'" />
                        </VCol>

                        <VCol cols="12" md="6">
                            <VLabel>
                                <VIcon icon="tabler-map-pin" class="mr-2" /> Logradouro
                            </VLabel>
                            <VTextField v-model="endereco.logradouro" placeholder="Insira o logradouro" />
                        </VCol>

                        <VCol cols="12" md="3">
                            <VLabel>
                                <VIcon icon="tabler-numbers" class="mr-2" /> Número
                            </VLabel>
                            <VTextField v-model="endereco.numero" placeholder="Insira o número" />
                        </VCol>

                        <VCol cols="12" md="4">
                            <VLabel>
                                <VIcon icon="tabler-align-center" class="mr-2" /> Complemento
                            </VLabel>
                            <VTextField v-model="endereco.complemento" placeholder="Insira o complemento" />
                        </VCol>

                        <VCol cols="12" md="3">
                            <VLabel>
                                <VIcon icon="tabler-map-pins" class="mr-2" /> Bairro
                            </VLabel>
                            <VTextField v-model="endereco.bairro" placeholder="Insira o bairro" />
                        </VCol>

                        <VCol cols="12" md="3">
                            <VLabel>
                                <VIcon icon="tabler-flag" class="mr-2" /> Cidade
                            </VLabel>
                            <VTextField v-model="endereco.cidade" placeholder="Insira a cidade" />
                        </VCol>

                        <VCol cols="12" md="2">
                            <VLabel>
                                <VIcon icon="tabler-map-2" class="mr-2" /> Estado
                            </VLabel>
                            <VTextField v-model="endereco.estado" placeholder="Insira o estado" />
                        </VCol>
                    </VRow>

                    <VRow>
                        <!-- 👉 Submit and Cancel -->
                        <VCol cols="12" align="center">
                            <VBtn class="me-3" @click="saveClient" color="primary" :loading="loading"
                                :disabled="loading">
                                {{ loading ? isNewCliente ? 'Cadastrando...' : 'Atualizando...' : 
                                isNewCliente ? 'Cadastrar' : 'Atualizar' }}
                            </VBtn>
                            <VBtn variant="outlined" color="secondary" @click="closeNavigationDrawer">
                                Cancelar
                            </VBtn>
                        </VCol>
                    </VRow>
                </VCardText>
            </VCard>
        </PerfectScrollbar>
    </VDialog>
</template>