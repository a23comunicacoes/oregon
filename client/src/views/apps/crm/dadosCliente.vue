<script setup>
import moment from "moment";
import informacoes from "@/views/apps/clientes/cliente/informacoes.vue";
import clienteAvancado from "@/pages/apps/clientes/cliente.vue";

const {
  escreverEndereco,
  formatDateAgendamento,
  copyEndereco,
  enderecoWaze,
  enderecoMaps,
} = useFunctions();

const props = defineProps({
  dados: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["close"]);

const agendamentoSelected = ref(null);
const agendamentos = ref([]);
const allAgendamentos = ref([]);
const queryAgendamento = ref("");
const loadingAgendamentos = ref(false);
const getAgendamentos = async () => {
  if (!props.dados?.cliente?.cli_Id) return;

  loadingAgendamentos.value = true;

  try {
    const res = await $api(`/agenda/getAgendamentosByCliente/`, {
      method: "GET",
      query: {
        q: queryAgendamento.value,
        itemsPerPage: 1000,
        cliente: props.dados?.cliente?.cli_Id,
      },
    });

    if (!res) return;

    console.log("Res pedidos", res);

    allAgendamentos.value = res.agendamentos;

    agendamentos.value = res.agendamentos.slice(0, 20);
  } catch (error) {
    console.error("Error fetching agendamentos:", error, error.response);

    agendamentos.value = [];
    allAgendamentos.value = [];
  }

  loadingAgendamentos.value = false;
};

watch(
  () => props.dados,
  (newValue) => {
    if (newValue?.cliente?.cli_Id) {
      getAgendamentos();
    } else {
      agendamentos.value = [];
      allAgendamentos.value = [];
    }
  },
  { immediate: true }
);

const filterPedidos = () => {
  if (!queryAgendamento.value) {
    agendamentos.value = allAgendamentos.value.slice(0, 20);
    return;
  }

  const filtered = allAgendamentos.value.filter((agendamento) => {
    return (
      agendamento?.cliente?.first_name
        ?.toLowerCase()
        .includes(queryAgendamento.value.toLowerCase()) ||
      agendamento?.cliente?.last_name
        ?.toLowerCase()
        .includes(queryAgendamento.value.toLowerCase()) ||
      agendamento.id?.toString().includes(queryAgendamento.value.toLowerCase())
    );
  });

  agendamentos.value = filtered.slice(0, 20);
};

const formatValue = (value) => {
  if (!value) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const viewItens = ref(false);
const viewCodigoPix = ref(false);
const viewEventos = ref(false);

const closeDados = () => {
  agendamentoSelected.value = null;
  agendamentos.value = [];
  allAgendamentos.value = [];
  queryAgendamento.value = "";
  loadingAgendamentos.value = false;
  viewItens.value = false;
  viewCodigoPix.value = false;
  viewEventos.value = false;
  emit("close");
};

const viewClienteAvancado = ref(false);
</script>
<template>
  <div class="pa-3 overflow-y-auto" style="max-height: 700px">
    <div
      class="header-messages d-flex flex-row justify-space-between align-center"
    >
      <h2 class="text-h5 mb-4">Dados do Cliente</h2>

      <VIcon icon="tabler-x" class="cursor-pointer" @click="closeDados" />
    </div>

    <p class="mb-2">Contato WhatsApp</p>

    <div class="d-flex flex-row gap-3 align-center">
      <VAvatar
        :color="dados?.contato?.avatar ? undefined : 'secondary'"
        size="40"
      >
        <VImg :src="dados?.contato?.avatar" v-if="dados?.contato?.avatar" />
        <VIcon icon="tabler-user-filled" v-else />
      </VAvatar>
      <div class="contact-info">
        <p class="mb-0 contact-name">
          {{ dados?.contato?.nome || dados?.nome || "Cliente" }}
        </p>
        <p class="mb-0 online-msg">
          {{ dados?.contato?.numero }}
        </p>
      </div>
    </div>

    <VDivider class="my-3" />

    <p class="mb-1 d-flex flex-row gap-2 align-center">
      Dados Cliente

      <span
        class="text-caption cursor-pointer text-primary ml-auto"
        @click="viewClienteAvancado = true"
      >
        Ver cadastro
      </span>
    </p>

    <informacoes :clienteData="dados?.cliente" :hideHistorico="true" />

    <VDivider class="my-3" />

    <p class="mb-1">Agendamentos</p>

    <VSelect
      :loading="loadingAgendamentos"
      placeholder="Selecione um agendamento para ver os dados"
      v-model="agendamentoSelected"
      :items="agendamentos"
      item-title="age_id"
      item-value="age_id"
      return-object
    >
      <template #prepend-item>
        <VTextField
          v-model="queryAgendamento"
          label="Pesquisar agendamento"
          class="mb-2 mx-2"
          placeholder="Insira o número do agendamento"
          @update:model-value="filterAgendamentos"
        />

        <VDivider />
      </template>

      <template #selection="{ item }">
        <p class="mb-0">
          #{{ item.raw.age_id }}
          -
          {{
            item.raw?.age_data
              ? moment(item.raw?.age_data).format("DD/MM/YYYY")
              : ""
          }}
        </p>
      </template>

      <template #item="{ props, item }">
        <VListItem
          #title
          v-bind="props"
          style="display: flex; align-items: center; gap: 0"
        >
          <p class="mb-0">
            #{{ item.raw.age_id }}
            -
            {{
              item.raw?.age_data
                ? moment(item.raw?.age_data).format("DD/MM/YYYY")
                : ""
            }}
          </p>

          <span class="text-caption">
            {{ item.raw.status }} - {{ item.raw.servicos?.length }} serviços
          </span>
        </VListItem>
      </template>
    </VSelect>

    <v-fade-transition>
      <div v-if="agendamentoSelected">
        <VDivider class="my-3" />
        <p class="mb-1">
          Dados do Agendamento - #{{ agendamentoSelected.age_id }}
        </p>

        <p class="mb-1">
          <VIcon icon="tabler-list-details" class="mr-2" />
          <VChip label :color="agendamentoSelected?.bkColor" variant="flat">
            {{ agendamentoSelected?.status }}
          </VChip>
        </p>

        <p class="mb-1">
          <VIcon icon="tabler-calendar" class="mr-1" />
          {{
            formatDateAgendamento(
              agendamentoSelected?.age_data,
              agendamentoSelected?.age_horaInicio,
              agendamentoSelected?.age_horaFim
            )
          }}
        </p>

        <p class="mb-1" v-if="agendamentoSelected?.age_dataFim">
          <VIcon icon="tabler-calendar-x" class="mr-1" />
          {{
            formatDateAgendamento(
              agendamentoSelected?.age_dataFim,
              agendamentoSelected?.age_horaInicioFim,
              agendamentoSelected?.age_horaFimFim
            )
          }}
        </p>

        <p class="mb-1" v-if="agendamentoSelected?.funcionario?.[0]">
          <VIcon icon="tabler-user-cog" class="mr-1" />
          {{ agendamentoSelected?.funcionario[0]?.fullName }}
        </p>

        <p class="mb-1" v-if="agendamentoSelected?.endereco?.[0]">
          <VIcon icon="tabler-map-pin" class="mr-1" />
          {{ escreverEndereco(agendamentoSelected?.endereco[0]) }}
        </p>

        <p class="mb-1">
          <VIcon icon="tabler-coin" class="mr-1" />
          {{ formatValue(agendamentoSelected?.age_valor) }}
        </p>

        <div class="mb-1" v-if="agendamentoSelected?.servicos">
          <p class="mb-1">Serviços:</p>
          <ul
            v-if="agendamentoSelected?.servicos?.length > 0"
            style="list-style-type: decimal"
            class="ml-5"
          >
            <li
              v-for="servico in agendamentoSelected?.servicos"
              class="text-sm"
            >
              {{ servico.ser_nome }} - {{ servico.ser_descricao }} -
              {{ formatValue(servico.ser_valor) }} -
              <strong>Qtd:</strong> {{ servico.ser_quantity }}
            </li>
          </ul>
          <span v-else>Nenhum serviço cadastrado</span>
        </div>
      </div>
    </v-fade-transition>
  </div>

  <VDialog v-model="viewClienteAvancado">
    <VCard class="pa-3">
      <AppDrawerHeaderSection
        title="Cadastro do Cliente"
        @cancel="viewClienteAvancado = false"
      />
      <clienteAvancado :clienteId="dados?.cliente?.cli_Id" />
    </VCard>
  </VDialog>
</template>
