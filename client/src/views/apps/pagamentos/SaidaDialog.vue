<script setup>
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { useAlert } from '@/composables/useAlert'
import { watch, onMounted, ref } from 'vue';

const loading = ref(false)

const props = defineProps({
    isDrawerOpen: {
        type: Boolean,
        required: true,
    },
    saidaData: {
        type: Object,
        required: true,
    }
})

const emit = defineEmits([
    'update:isDrawerOpen',
    'updatePagar',
    'closeDrawer'
])

console.log('Saída:', props.saidaData)

const { setAlert } = useAlert()

const atualUser = useCookie('userData').value

const formatDate = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatValor = (valor) => {
    if (!valor) return 'R$ 0,00'
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const saida = ref({
    sai_id: 0,
    sai_descricao: '',
    sai_valor: 0,
    sai_data: formatDate(new Date()),
    sai_fpt: null,
    sai_user: 0,
    sai_contas: []
})

watch(() => props.saidaData, (val) => {
    console.log('Saída:', val)
    saida.value = val
    saida.value.sai_data = formatDate(val.sai_data)
})

const removerConta = async (conta) => {
    let confirmar = confirm('Deseja realmente remover esta conta desta saída? Essa ação não poderá ser desfeita.')
    if(!confirmar) return

    const res = await $api('/pagamentos/remove/saidas/conta', {
        method: 'POST',
        body: {
            contaId: conta.id,
            id: saida.value.sai_id
        }
    })

    console.log('Conta removida:', res)

    saida.value.sai_contas.splice(saida.value.sai_contas.indexOf(conta), 1)

    if (saida.value.sai_contas.length === 0) {
        setAlert('Nenhuma conta a pagar!', 'warning', 'tabler-alert-triangle', 3000)
        emit('updatePagar')
        closeNavigationDrawer()
    }
}

const limparSaida = () => {
    saida.value = {
        sai_id: 0,
        sai_descricao: '',
        sai_valor: 0,
        sai_data: formatDate(new Date()),
        sai_fpt: null,
        sai_user: 0,
        sai_contas: []
    }
}

const closeNavigationDrawer = () => {
    emit('update:isDrawerOpen', false)
    limparSaida()
}

const handleDrawerModelValueUpdate = val => {
    emit('update:isDrawerOpen', val)
}

const formasPagamentoSaida = ref([])

const getFormasPagamentoSaida = async () => {
    const res = await $api('/config/g/fpt_saida', {
        method: 'GET',
    })

    if (!res) return

    console.log('Formas de pagamento:', res)

    formasPagamentoSaida.value = res.map(r => r.value)
}

getFormasPagamentoSaida();

const checkDateStatus = (date) => {
    if (!date) return { status: 'Em aberto', color: 'warning' };

    const today = new Date();
    const dateToCheck = new Date(date);

    // Normalize the dates to only compare year, month, and day
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateToCheckNormalized = new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate());

    if (dateToCheckNormalized < todayNormalized) {
        return { status: 'Em atraso', color: 'error' };
    } else if (dateToCheckNormalized > todayNormalized) {
        return { status: 'Em aberto', color: 'warning' };
    } else {
        return { status: 'Pagar hoje', color: 'info' };
    }
};

const lancarSaida = async () => {
    loading.value = true

    try {
        const res = await $api(`/pagamentos/update/saidas/${saida.value.sai_id}`, {
            method: 'POST',
            body: {
                saidaData: saida.value
            }
        })

        if (!res) return

        console.log('Saída lançada:', res)

        setAlert('Saída atualizada com sucesso!', 'success', 'tabler-check', 3000)
        emit('updatePagar')
        closeNavigationDrawer()
    } catch (error) {
        console.error('Erro ao atualizar saída:', error, error.response)
        setAlert('Erro ao atualizar saída! Tente novamente.', 'error', 'tabler-alert-triangle', 3000)
    }

    loading.value = false
}
</script>

<template>
    <VDialog persistent class="scrollable-content" :model-value="props.isDrawerOpen"
        @update:model-value="handleDrawerModelValueUpdate">

        <PerfectScrollbar :options="{ wheelPropagation: false }">
            <VCard flat>
                <VCardText class="pt-2">
                    <!-- 👉 Title -->
                    <AppDrawerHeaderSection title="Editar Saída" @cancel="closeNavigationDrawer" />

                    <VRow>
                        <VCol cols="12" md="4">
                            <VLabel>
                                <VIcon icon="tabler-calendar" class="mr-1" /> Data da saída
                            </VLabel>
                            <VTextField v-model="saida.sai_data" type="date" placeholder="Informe a data da saída" />
                        </VCol>

                        <VCol cols="12" md="4">
                            <VLabel>
                                <VIcon icon="tabler-coin" class="mr-1" /> Valor da saída
                            </VLabel>
                            <Dinheiro v-model="saida.sai_valor" readonly />
                        </VCol>

                        <VCol cols="12" md="4">
                            <VLabel>
                                <VIcon icon="tabler-credit-card" class="mr-1" /> Forma de pagamento
                            </VLabel>
                            <VSelect v-model="saida.sai_fpt" :items="formasPagamentoSaida"
                                placeholder="Selecione a forma de pagamento da saída" />
                        </VCol>

                        <VCol cols="12">
                            <VLabel>
                                <VIcon icon="tabler-message" class="mr-1" /> Descrição (Opcional)
                            </VLabel>
                            <VTextarea v-model="saida.sai_descricao" placeholder="Insira uma descrição para a saída"
                                label="Insira uma descrição para a saída" rows="3" />
                        </VCol>
                    </VRow>

                    <p class="mt-4 mb-0 font-weight-bold">Contas a pagar</p>
                    <p class="mb-4 text-caption">Não é possível adicionar contas em saídas já lançadas.</p>

                    <VTable>
                        <thead>
                            <tr>
                                <th style="max-width: 40px !important; width: 40px !important;"></th>
                                <th>Descrição</th>
                                <th>Tipo</th>
                                <th>Valor</th>
                                <th>Data de vencimento</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="conta in saida.sai_contas" :key="conta.id">
                                <td style="max-width: 40px !important; width: 40px !important;">
                                    <VTooltip location="top">
                                        <template #activator="{ props }">
                                            <VIcon icon="tabler-circle-minus" color="error" @click="removerConta(conta)"
                                                v-bind="props" />
                                        </template>
                                        <span>Remover conta</span>
                                    </VTooltip>
                                </td>
                                <td>{{ conta.descricao }}</td>
                                <td>
                                    <VChip :color="conta.tipo == 'Despesa' ? 'warning' : 'primary'"
                                        class="text-capitalize" label>
                                        {{ conta.tipo }}
                                    </VChip>
                                </td>
                                <td>{{ formatValor(conta.valor) }}</td>
                                <td>{{ new Date(conta.data).toLocaleDateString() }}</td>
                                <td>
                                    <VChip color="success" label>Pago</VChip>
                                </td>
                            </tr>
                        </tbody>
                    </VTable>

                    <VRow class="mt-3">
                        <!-- 👉 Submit and Cancel -->
                        <VCol cols="12" align="center">
                            <VBtn class="me-3" variant="outlined" color="secondary" @click="closeNavigationDrawer">
                                Cancelar
                            </VBtn>
                            <VBtn class="me-3" @click="lancarSaida()" color="success" :loading="loading"
                                :disabled="loading">
                                {{ !loading ? 'Salvar Saída' : 'Salvando saída...' }}
                            </VBtn>
                        </VCol>
                    </VRow>
                </VCardText>
            </VCard>
        </PerfectScrollbar>
    </VDialog>
</template>