<script setup>
import { useAlert } from "@/composables/useAlert";
import moment from "moment";
import {
  VStepper,
  VStepperHeader,
  VStepperItem,
  VStepperWindow,
} from "vuetify/labs/VStepper";

import clienteAvancado from "@/pages/apps/clientes/cliente.vue";
import NewCliente from "@/views/apps/clientes/newCliente.vue";
import { can } from "@layouts/plugins/casl";

import { useFunctions } from "@/composables/useFunctions";
const { escreverEndereco, formatDateAgendamento, typesAgendamento, debounce } =
  useFunctions();

const formatValue = (value) => {
  if (!value) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const loading = ref(false);
const viewClienteAvancado = ref(false);

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["update:isDrawerOpen", "closeDrawer", "newEvent"]);

const { setAlert } = useAlert();

if (!can("create", "agendamento")) {
  setAlert(
    "Você não tem permissão para criar agendamentos!",
    "error",
    "tabler-alert-circle",
    5000
  );
  emit("update:isDrawerOpen", false);
}

const agendamento = ref({
  /*  cliente: [
    {
      id: null,
      nome: "",
      email: "",
      celular: "",
      celular2: "",
      cpf: "",
      endereco: [
        {
          id: null,
          cep: "",
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: "",
        },
      ],
      observacao: "",
    },
  ], */
  age_observacao: "",
  funcionario: null,
  age_data: null,
  age_horaInicio: null,
  age_horaFim: null,
  age_type: "servico",
  age_contrato: null,
});

const clienteSelected = ref({
  id: null,
  nome: "",
  email: "",
  celular: "",
  celular2: "",
  cpf: "",
  enderecos: [],
});

const enderecoSelected = ref({
  id: null,
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
});

const limparAgendamento = () => {
  agendamento.value = {
    age_observacao: "",
    funcionario: null,
    age_data: null,
    age_horaInicio: null,
    age_horaFim: null,
    age_type: "servico",
  };

  clienteSelected.value = {
    id: null,
    nome: "",
    email: "",
    celular: "",
    celular2: "",
    cpf: "",
    enderecos: [],
  };

  enderecoSelected.value = {
    id: null,
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  };
  step.value = 1;

  handleType("servico");
};

const viewAddEndereco = ref(false);
const clientes = ref([]);
const loadingClientes = ref(false);

const getClientes = async () => {
  let textQuery = clienteSelected.value.nome;

  if (textQuery.length < 3) {
    clientes.value = [];
    return;
  }

  loadingClientes.value = true;

  try {
    const res = await $api("/clientes/list", {
      method: "GET",
      query: {
        q: textQuery,
      },
    });

    if (!res) return;

    console.log("Res Get Clientes:", res);

    clientes.value = res.clientes;
  } catch (error) {
    console.error("Error Get Clientes:", error, error.response);
  } finally {
    loadingClientes.value = false;
  }
};

const debouncedGetClientes = debounce(getClientes, 500);

const clearClientes = () => {
  clienteSelected.value = {
    id: null,
    nome: "",
    email: "",
    celular: "",
    celular2: "",
    cpf: "",
    enderecos: [],
  };
  enderecoSelected.value = {
    id: null,
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  };
  clientes.value = [];
};

const setCliente = async (cliente) => {
  loadingClientes.value = true;

  console.log("Cliente escolhido:", cliente);
  clientes.value = [];
  clienteSelected.value = {
    id: cliente.cli_Id,
    nome: cliente.cli_nome,
    email: cliente.cli_email,
    celular: cliente.cli_celular,
    celular2: cliente.cli_celular2,
    cpf: cliente.cli_cpf,
    enderecos: [],
    contratos: cliente.cli_contratos || [],
  };

  const res = await $api(`/clientes/get/${cliente.cli_Id}`, {
    method: "GET",
  });

  if (!res || res?.length === 0) return;

  //agendamento.value.cliente = [res[0]];
  clienteSelected.value = {
    id: res[0].id,
    nome: res[0].nome,
    email: res[0].email,
    celular: res[0].celular,
    celular2: res[0].celular2,
    cpf: res[0].cpf,
    enderecos: res[0].endereco || [],
    contratos: res[0].contratos || [],
  };

  console.log("Cliente get:", res[0]);
  console.log("Cliente Selected:", clienteSelected.value);

  if (clienteSelected.value.enderecos.length >= 1) {
    enderecoSelected.value = clienteSelected.value.enderecos[0];
  } else {
    enderecoSelected.value = {
      id: null,
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
    };
  }

  loadingClientes.value = false;
};

const funcionarios = ref([]);

const getFuncionarios = async () => {
  try {
    const res = await $api("/agenda/funcionarios", {
      method: "GET",
    });

    if (!res) return;

    console.log("Res Get Funcionarios:", res);

    funcionarios.value = res;
  } catch (error) {
    console.error("Error Get Funcionarios:", error, error.response);
  }
};

const fontes = ref([]);

const getFontes = async () => {
  const resFontes = await $api("/config/g/fonte_cliente", {
    method: "GET",
  });

  if (!resFontes) return;

  console.log("Fontes:", resFontes);

  fontes.value = resFontes;
};

onMounted(() => {
  getFuncionarios();
  getFontes();
});

const closeNavigationDrawer = () => {
  emit("update:isDrawerOpen", false);
  limparAgendamento();
};

const handleDrawerModelValueUpdate = (val) => {
  emit("update:isDrawerOpen", val);

  if (!val) {
    limparAgendamento();
  }
};

const isMobile = ref(window.innerWidth < 768);

watch(
  () => window.innerWidth,
  (val) => {
    isMobile.value = val < 768;
  }
);

const isAddNewUserDrawerVisible = ref(false);

const getCep = async (cep) => {
  if (cep.length < 9) return;

  const res = await $api(`/clientes/clientes-cep`, {
    method: "GET",
    query: { cep: cep.replace("-", "") },
  });

  if (!res) return;

  enderecoSelected.value.logradouro = res.logradouro;
  enderecoSelected.value.bairro = res.bairro;
  enderecoSelected.value.cidade = res.localidade;
  enderecoSelected.value.estado = res.uf;
};

const loadingCreate = ref(false);

const createAgendamento = async () => {
  loadingCreate.value = true;

  let body = {
    agendamentoData: {
      ...agendamento.value,
      cliente: clienteSelected.value,
      endereco: enderecoSelected.value,
    },
  };

  console.log("Body Create Agendamento:", body);

  try {
    const res = await $api("/agenda/create", {
      method: "POST",
      body,
    });

    if (!res) return;

    console.log("Res Create Agendamento:", res);

    emit("newEvent", res);
    closeNavigationDrawer();
    limparAgendamento();
  } catch (error) {
    console.error("Error Create Agendamento:", error, error.response);

    setAlert(
      error.response?._data?.message ||
        "Erro ao criar agendamento! Verifique os dados e tente novamente.",
      "error",
      "tabler-alert-circle",
      7000
    );
  } finally {
    loadingCreate.value = false;
  }
};

const items = ref([
  {
    step: 1,
    title: "Dados do Agendamento",
    icon: "tabler-calendar",
  },
  {
    step: 2,
    title: "Cliente",
    icon: "tabler-user",
    hide: false,
  },
  {
    step: 3,
    title: "Endereço",
    icon: "tabler-map-pin",
    hide: false,
  },
  {
    step: 4,
    title: "Confirmação",
    icon: "tabler-hourglass",
  },
]);

const step = ref(1);

const nextStep = () => {
  console.log("Step:", step.value);
  if (step.value == 4) {
    return createAgendamento();
  }

  if (step.value < items.value.length) {
    let proximoStep = items.value.find((i) => i.step == step.value + 1);

    if (proximoStep?.hide) {
      let proximoNoHide = items.value.find(
        (i) => i.step > step.value && !i.hide
      );
      if (proximoNoHide) {
        step.value = proximoNoHide.step;
        return;
      }
      return;
    }
    step.value++;
  } else {
    step.value = 1;
  }
};

const prevStep = () => {
  if (step.value > 1) {
    let anteriorStep = items.value.find((i) => i.step == step.value - 1);

    if (anteriorStep?.hide) {
      let anteriorNoHide = items.value.find(
        (i) => i.step < step.value && !i.hide
      );
      if (anteriorNoHide) {
        step.value = anteriorNoHide.step;
        return;
      }
    }
    step.value--;
  }
};

const handleType = (type) => {
  if (type == "bloqueio") {
    items.value[1].hide = true;
    items.value[2].hide = true;
  } else {
    items.value[1].hide = false;
    items.value[2].hide = false;
  }
};

const calcularPeriodo = (contrato) => {
  if (!contrato.periodoType || !contrato.periodo || !contrato.inicioData)
    return "";

  let inicio = moment(contrato.inicioData);

  switch (contrato.periodoType) {
    case "Mensal":
      return inicio.add(contrato.periodo, "months").format("DD/MM/YYYY");
    case "Trimestral":
      return inicio.add(contrato.periodo * 3, "months").format("DD/MM/YYYY");
    case "Semestral":
      return inicio.add(contrato.periodo * 6, "months").format("DD/MM/YYYY");
    case "Anual":
      return inicio.add(contrato.periodo, "years").format("DD/MM/YYYY");
  }

  return "";
};

</script>

<template>
  <VDialog
    persistent
    class="scrollable-content"
    :width="step != 4 ? 1000 : 800"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <VCard flat>
      <VCardText class="pa-3">
        <!-- 👉 Title -->
        <AppDrawerHeaderSection
          title="Novo Agendamento"
          @cancel="closeNavigationDrawer"
        />

        <VStepper
          v-model="step"
          :mobile="isMobile"
          :touch="false"
          :showArrows="false"
          :mandatory="true"
          color="primary"
          hide-actions
        >
          <template v-slot:default>
            <v-stepper-header>
              <template v-for="item in items" :key="item.step">
                <v-stepper-item
                  v-if="!item.hide"
                  :step="item.step"
                  :value="item.step"
                  :complete="step > item.step"
                  :icon="item.icon"
                  :color="
                    step > item.step
                      ? 'success'
                      : step == item.step
                      ? 'primary'
                      : '#4242424d'
                  "
                >
                  <p
                    v-if="!isMobile"
                    class="mb-0"
                    :style="step == item.step ? 'font-weight: 600' : ''"
                  >
                    {{ item.title }}
                  </p>
                </v-stepper-item>

                <v-divider
                  v-if="item.step !== items[items.length - 1].step"
                ></v-divider>
              </template>
            </v-stepper-header>

            <v-stepper-window v-if="step == 1">
              <VRow v-if="agendamento.age_type">
                <VCol cols="12" md="3">
                  <VLabel>
                    <VIcon icon="tabler-list-check" class="mr-2" /> Tipo do
                    Agendamento
                  </VLabel>
                  <VSelect
                    v-model="agendamento.age_type"
                    :items="typesAgendamento"
                    item-title="title"
                    item-value="value"
                    variant="solo-filled"
                    placeholder="Selecione o tipo do agendamento"
                    class="w-100"
                    @update:model-value="handleType($event)"
                  >
                    <template #selection="{ item }">
                      {{ item.raw?.emoji ?? "" }}
                      {{ item.raw?.title ?? "" }}
                    </template>

                    <template #item="{ props, item }">
                      <VListItem
                        #title
                        v-bind="props"
                        style="display: flex; align-items: center"
                      >
                        {{ item.raw.emoji ?? "" }}
                        {{ item.raw.title ?? "" }}
                      </VListItem>
                    </template>
                  </VSelect>
                </VCol>
                <VCol
                  cols="12"
                  md="3"
                  v-if="agendamento.age_type != 'bloqueio'"
                >
                  <VLabel>
                    <VIcon icon="tabler-world" class="mr-2" />
                    Fonte do Agendamento
                  </VLabel>
                  <VSelect
                    v-model="agendamento.age_fonte"
                    :items="fontes"
                    item-title="value"
                    item-value="value"
                    variant="solo-filled"
                    placeholder="Selecione a fonte do agendamento"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VLabel>
                    <VIcon icon="tabler-user" class="mr-2" /> Funcionário
                  </VLabel>
                  <VSelect
                    v-model="agendamento.funcionario"
                    :items="funcionarios"
                    variant="solo-filled"
                    item-title="fullName"
                    item-value="id"
                    clearable
                    placeholder="Selecione um funcionário"
                  />
                </VCol>

                <VCol cols="12" md="3">
                  <VLabel>
                    <VIcon icon="tabler-calendar" class="mr-2" /> Data do
                    Agendamento
                  </VLabel>
                  <VTextField
                    v-model="agendamento.age_data"
                    variant="solo-filled"
                    clearable
                    type="date"
                  />
                </VCol>

                <VCol cols="12" md="2">
                  <VLabel>
                    <VIcon icon="tabler-clock" class="mr-2" /> Hora Início
                  </VLabel>
                  <VTextField
                    v-model="agendamento.age_horaInicio"
                    variant="solo-filled"
                    clearable
                    type="time"
                  />
                </VCol>

                <VCol cols="12" md="2">
                  <VLabel>
                    <VIcon icon="tabler-clock" class="mr-2" /> Hora Fim
                  </VLabel>
                  <VTextField
                    v-model="agendamento.age_horaFim"
                    variant="solo-filled"
                    clearable
                    type="time"
                  />
                </VCol>

                <VCol cols="12" md="3">
                  <div class="d-flex align-end h-100 pb-3">
                    <VSwitch v-model="agendamento.isPeriod">
                      <template #label>Período</template>
                    </VSwitch>
                  </div>
                </VCol>

                <template v-if="agendamento.isPeriod">
                  <VCol cols="12" md="3">
                    <VLabel>
                      <VIcon icon="tabler-calendar" class="mr-2" /> Data Fim
                    </VLabel>
                    <VTextField
                      v-model="agendamento.age_dataFim"
                      variant="solo-filled"
                      clearable
                      type="date"
                    />
                  </VCol>

                  <VCol cols="12" md="2">
                    <VLabel>
                      <VIcon icon="tabler-clock" class="mr-2" /> Hora Início
                    </VLabel>
                    <VTextField
                      v-model="agendamento.age_horaInicioFim"
                      variant="solo-filled"
                      clearable
                      type="time"
                    />
                  </VCol>

                  <VCol cols="12" md="2">
                    <VLabel>
                      <VIcon icon="tabler-clock" class="mr-2" /> Hora Fim
                    </VLabel>
                    <VTextField
                      v-model="agendamento.age_horaFimFim"
                      variant="solo-filled"
                      clearable
                      type="time"
                    />
                  </VCol>
                </template>

                <VCol cols="12">
                  <VLabel>
                    <VIcon icon="tabler-align-left" class="mr-2" />
                    Observações
                  </VLabel>
                  <VTextarea
                    v-model="agendamento.age_observacao"
                    variant="solo-filled"
                    clearable
                    placeholder="Observações do agendamento"
                    rows="2"
                    auto-grow
                    active
                  />
                </VCol>
              </VRow>
            </v-stepper-window>

            <v-stepper-window v-if="step == 2">
              <div class="d-flex flex-row align-center gap-3 mb-3">
                <VLabel>
                  <VIcon icon="tabler-align-left" class="mr-2" /> Cliente
                </VLabel>

                <VBtn
                  v-if="can('create', 'cliente')"
                  color="primary"
                  variant="tonal"
                  @click="isAddNewUserDrawerVisible = true"
                  size="small"
                  style="height: 30px"
                >
                  <VIcon
                    icon="tabler-user-plus"
                    :class="!isMobile ? 'mr-2' : ''"
                  />
                  <span v-if="!isMobile">Cadastrar Novo Cliente</span>
                </VBtn>
              </div>

              <v-menu location="bottom" max-height="250px">
                <template v-slot:activator="{ props }">
                  <VTextField
                    v-model="clienteSelected.nome"
                    variant="solo-filled"
                    v-bind="props"
                    :loading="loadingClientes"
                    @keyup="debouncedGetClientes"
                    clearable
                    @click:clear="clearClientes"
                    placeholder="Pesquise um cliente por nome, CPF, telefone ou endereço"
                    :persistent-hint="clienteSelected.id ? false : true"
                    :hint="
                      clienteSelected.id
                        ? undefined
                        : 'Selecione o cliente para continuar'
                    "
                  />
                </template>

                <VList dense v-if="clientes.length > 0">
                  <VListItem
                    v-for="cliente in clientes"
                    :key="cliente.id"
                    class="item-cliente"
                    @click="setCliente(cliente)"
                  >
                    <p class="mb-0">
                      {{ cliente.cli_nome
                      }}{{
                        cliente?.enderecos?.[0]?.end_bairro
                          ? " - " + cliente?.enderecos?.[0]?.end_bairro
                          : cliente?.enderecos?.[0]?.end_cidade
                          ? " - " + cliente?.enderecos?.[0]?.end_cidade
                          : ""
                      }}
                    </p>
                    <p
                      class="text-caption mb-1"
                      v-for="endereco in cliente?.enderecos?.filter(
                        (endereco) =>
                          endereco?.end_logradouro ||
                          endereco?.end_cidade ||
                          endereco?.end_estado ||
                          endereco?.end_cep ||
                          endereco?.end_numero ||
                          endereco?.end_bairro
                      )"
                      :key="endereco.id"
                      v-if="cliente?.enderecos?.length > 0"
                    >
                      <VIcon icon="tabler-map-pin" size="12" class="mr-1" />
                      {{
                        endereco?.end_logradouro ||
                        endereco?.end_cidade ||
                        endereco?.end_estado ||
                        endereco?.end_cep ||
                        endereco?.end_numero ||
                        endereco?.end_bairro
                          ? escreverEndereco(endereco)
                          : ""
                      }}
                    </p>
                    <p class="text-caption mb-1" v-else>
                      Sem endereço cadastrado
                    </p>
                  </VListItem>
                </VList>

                <VList dense v-else-if="clienteSelected.nome === ''">
                  <VListItem>
                    <p class="mb-0">
                      Escreva mais de 3 letras para pesquisar um cliente por
                      nome, CPF, telefone ou endereço
                    </p>
                  </VListItem>
                </VList>

                <VList
                  dense
                  v-else-if="
                    clientes.length === 0 && clienteSelected.nome !== ''
                  "
                >
                  <VListItem>
                    <p class="mb-0">
                      {{loadingClientes ? "Carregando clientes..." : "Nenhum cliente encontrado"}}
                    </p>
                  </VListItem>
                </VList>
              </v-menu>

              <div v-if="clienteSelected.id" class="mt-4">
                <div class="d-flex flex-row align-center gap-3 mb-3">
                  <p class="mb-0">Cliente Selecionado:</p>

                  <VBtn
                    v-if="can('create', 'cliente')"
                    color="primary"
                    variant="tonal"
                    @click="viewClienteAvancado = true"
                    size="small"
                    style="height: 30px"
                  >
                    <VIcon icon="tabler-eye" :class="!isMobile ? 'mr-2' : ''" />
                    <span v-if="!isMobile">Ver Cliente</span>
                  </VBtn>
                </div>

                <p class="mb-0">
                  <strong>Nome:</strong> {{ clienteSelected.nome }}
                </p>
                <p class="mb-0">
                  <strong>Telefone:</strong>
                  {{
                    clienteSelected.celular
                      ? clienteSelected.celular
                      : clienteSelected.celular2
                      ? clienteSelected.celular2
                      : "Não informado"
                  }}
                </p>
                <p class="mb-0">
                  <strong>Email:</strong>
                  {{
                    clienteSelected.email
                      ? clienteSelected.email
                      : "Não informado"
                  }}
                </p>
                <p class="mb-0">
                  <strong>CPF/CNPJ:</strong>
                  {{
                    clienteSelected.cpf ? clienteSelected.cpf : "Não informado"
                  }}
                </p>

                <div class="mt-4" v-if="clienteSelected.contratos?.length > 0">
                  <VLabel>
                    <VIcon icon="tabler-file-text" class="mr-2" /> Contrato
                  </VLabel>
                  <VSelect
                    v-model="agendamento.age_contrato"
                    :items="clienteSelected.contratos"
                    item-title="numero"
                    item-value="numero"
                    placeholder="Selecione um contrato"
                    clearable
                    variant="solo-filled"
                  >
                    <template #selection="{ item }">
                      <p class="mb-0" style="font-size: 13px">
                        N° #{{ item.raw?.numero ?? "" }}
                      </p>
                    </template>

                    <template #item="{ props, item }">
                      <VListItem
                        #title
                        v-bind="props"
                        style="display: flex; align-items: center"
                      >
                      <div>
                        <div class="d-flex flex-row align-center mb-1">
                          <p class="mb-0 text-sm">N° #{{ item.raw?.numero }}</p>
                          <VChip
                            :color="item.raw?.ativo ? 'success' : 'error'"
                            size="small"
                            label
                            class="ml-2"
                          >
                            {{ item.raw?.ativo ? "Ativo" : "Inativo" }}
                          </VChip>
                        </div>

                        <p class="mb-0 text-sm">
                          <strong>Período:</strong> {{ item.raw?.periodo }} ({{
                            item.raw?.periodoType
                          }})
                        </p>

                        <p class="mb-0 text-sm">
                          <strong>Início:</strong>
                          {{ moment(item.raw?.inicioData).format("DD/MM/YYYY") }}
                          -
                          <strong>Fim:</strong> {{ calcularPeriodo(item.raw) }}
                        </p>

                        <p class="mb-0 text-sm">
                          <strong>Valor:</strong>
                          {{ formatValue(item.raw?.valor) }}
                        </p>
                      </div>
                      </VListItem>
                    </template>
                  </VSelect>
                </div>
              </div>
            </v-stepper-window>

            <v-stepper-window v-if="step == 3">
              <VLabel class="mb-2">
                <VIcon icon="tabler-map" class="mr-2" /> Selecione o endereço do
                cliente

                <VBtn
                  v-if="can('create', 'endereco')"
                  color="primary"
                  variant="tonal"
                  @click="viewAddEndereco = true"
                  size="small"
                  style="height: 30px"
                  class="ml-2"
                >
                  <VIcon icon="tabler-plus" class="mr-1" /> Endereço
                </VBtn>
              </VLabel>
              <VSelect
                v-model="enderecoSelected"
                :items="clienteSelected.enderecos"
                item-title="logradouro"
                item-value="id"
                return-object
                clearable
                variant="solo-filled"
                placeholder="Selecione um endereço"
              >
                <template v-slot:selection="{ item }">
                  <p class="mb-0" style="font-size: 13px">
                    {{ escreverEndereco(item.raw) }}
                  </p>
                </template>

                <template #item="{ props, item }">
                  <VListItem
                    #title
                    v-bind="props"
                    style="display: flex; align-items: center"
                  >
                    <p class="mb-0">
                      {{ escreverEndereco(item.raw) }}
                    </p>
                  </VListItem>
                </template>
              </VSelect>

              <v-fade-transition>
                <VRow
                  class="mt-4"
                  v-if="
                    (enderecoSelected.id !== null &&
                      enderecoSelected.id !== 0) ||
                    clienteSelected.enderecos.length == 0 ||
                    viewAddEndereco
                  "
                >
                  <VCol cols="12" md="3">
                    <VLabel>
                      <VIcon icon="tabler-map-pin" class="mr-2" /> CEP
                    </VLabel>
                    <VTextField
                      v-model="enderecoSelected.cep"
                      variant="solo-filled"
                      clearable
                      @keyup="getCep(enderecoSelected.cep)"
                    />
                  </VCol>
                  <VCol cols="12" md="5">
                    <VLabel>
                      <VIcon icon="tabler-align-left" class="mr-2" /> Logradouro
                    </VLabel>
                    <VTextField
                      v-model="enderecoSelected.logradouro"
                      variant="solo-filled"
                      clearable
                    />
                  </VCol>
                  <VCol cols="12" md="4">
                    <VLabel>
                      <VIcon icon="tabler-align-center" class="mr-2" />
                      Complemento
                    </VLabel>
                    <VTextField
                      v-model="enderecoSelected.complemento"
                      variant="solo-filled"
                      clearable
                    />
                  </VCol>
                  <VCol cols="12" md="2">
                    <VLabel>
                      <VIcon icon="tabler-numbers" class="mr-2" /> Número
                    </VLabel>
                    <VTextField
                      v-model="enderecoSelected.numero"
                      variant="solo-filled"
                      clearable
                    />
                  </VCol>
                  <VCol cols="12" md="4">
                    <VLabel>
                      <VIcon icon="tabler-map-pin-2" class="mr-2" /> Bairro
                    </VLabel>
                    <VTextField
                      v-model="enderecoSelected.bairro"
                      variant="solo-filled"
                      clearable
                    />
                  </VCol>
                  <VCol cols="12" md="3">
                    <VLabel>
                      <VIcon icon="tabler-map-pin-2" class="mr-2" /> Cidade
                    </VLabel>
                    <VTextField
                      v-model="enderecoSelected.cidade"
                      variant="solo-filled"
                      clearable
                    />
                  </VCol>
                  <VCol cols="12" md="3">
                    <VLabel>
                      <VIcon icon="tabler-flag" class="mr-2" /> Estado
                    </VLabel>
                    <VTextField
                      v-model="enderecoSelected.estado"
                      variant="solo-filled"
                      clearable
                    />
                  </VCol>
                </VRow>
              </v-fade-transition>
            </v-stepper-window>

            <v-stepper-window v-if="step == 4">
              <p class="mb-4">Detalhes do Agendamento:</p>

              <template v-if="agendamento.age_type">
                <p class="mb-0">
                  <strong>Tipo do Agendamento:</strong>
                  {{
                    typesAgendamento.find(
                      (type) => type.value === agendamento.age_type
                    ).title
                  }}
                </p>
              </template>

              <template v-if="agendamento.age_type !== 'bloqueio'">
                <template v-if="clienteSelected.id">
                  <p class="mb-0">
                    <strong>Cliente:</strong>
                  </p>
                  <p class="mb-0">
                    <strong>Nome:</strong> {{ clienteSelected.nome }}
                  </p>
                  <p class="mb-0">
                    <strong>Telefone:</strong>
                    {{
                      clienteSelected.celular
                        ? clienteSelected.celular
                        : clienteSelected.celular2
                        ? clienteSelected.celular2
                        : "Não informado"
                    }}
                  </p>
                  <p class="mb-0">
                    <strong>Email:</strong>
                    {{
                      clienteSelected.email
                        ? clienteSelected.email
                        : "Não informado"
                    }}
                  </p>
                  <p class="mb-0">
                    <strong>CPF/CNPJ:</strong>
                    {{
                      clienteSelected.cpf
                        ? clienteSelected.cpf
                        : "Não informado"
                    }}
                  </p>
                </template>

                <p v-else class="mb-0 text-error">
                  <strong>Cliente:</strong> Não informado
                </p>

                <p class="mb-0 mt-4">
                  <strong>Endereco:</strong>
                </p>

                <p class="mb-0" v-if="clienteSelected.enderecos.length">
                  {{ escreverEndereco(clienteSelected.enderecos[0]) }}
                </p>

                <p class="mb-0 mt-4">
                  <strong>Dados do Agendamento:</strong>
                </p>

                <p
                  class="mb-0"
                  :class="{ 'text-error': !agendamento.age_fonte }"
                >
                  <strong>Fonte do Agendamento:</strong>
                  {{ agendamento.age_fonte || "Não informado" }}
                </p>
                <p
                  class="mb-0"
                  :class="{ 'text-error': !agendamento.funcionario }"
                >
                  <strong>Funcionário:</strong>
                  {{
                    agendamento.funcionario
                      ? funcionarios?.find(
                          (f) => f.id === agendamento.funcionario
                        )?.fullName || "Não informado"
                      : "Não informado"
                  }}
                </p>

                <p
                  class="mb-0"
                  :class="{ 'text-error': !agendamento.age_data }"
                >
                  <strong>Data/Hora:</strong>
                  {{
                    formatDateAgendamento(
                      agendamento.age_data,
                      agendamento.age_horaInicio,
                      agendamento.age_horaFim
                    ) ?? "Não informado"
                  }}
                </p>

                <p class="mb-0" v-if="agendamento.isPeriod">
                  <strong>Data/Hora Fim do Período:</strong>
                  {{
                    formatDateAgendamento(
                      agendamento.age_dataFim,
                      agendamento.age_horaInicioFim,
                      agendamento.age_horaFimFim
                    ) ?? "Não informado"
                  }}
                </p>

                <p class="mb-0">
                  <strong>Observações:</strong>
                  {{
                    agendamento.age_observacao
                      ? agendamento.age_observacao
                      : "Nenhuma observação"
                  }}
                </p>
              </template>

              <template v-else>
                <p
                  class="mb-0"
                  :class="{ 'text-error': !agendamento.age_data }"
                >
                  <strong>Data/Hora:</strong>
                  {{
                    formatDateAgendamento(
                      agendamento.age_data,
                      agendamento.age_horaInicio,
                      agendamento.age_horaFim
                    ) ?? "Não informado"
                  }}
                </p>
                <p class="mb-0" v-if="agendamento.isPeriod">
                  <strong>Data/Hora Fim do Período:</strong>
                  {{
                    formatDateAgendamento(
                      agendamento.age_dataFim,
                      agendamento.age_horaInicioFim,
                      agendamento.age_horaFimFim
                    ) ?? "Não informado"
                  }}
                </p>
                <p
                  class="mb-0"
                  :class="{ 'text-error': !agendamento.funcionario }"
                >
                  <strong>Funcionário:</strong>
                  {{
                    agendamento.funcionario
                      ? funcionarios.find(
                          (f) => f.id === agendamento.funcionario
                        ).fullName
                      : "Não informado"
                  }}
                </p>
              </template>
            </v-stepper-window>
          </template>
        </VStepper>

        <div class="linha-flex gap-3 mt-5 mb-3 justify-center">
          <VBtn
            variant="outlined"
            color="secondary"
            @click="closeNavigationDrawer"
          >
            Cancelar
          </VBtn>

          <VBtn
            variant="outlined"
            color="primary"
            @click="prevStep"
            v-if="step > 1"
          >
            Voltar
          </VBtn>

          <VBtn
            class="me-3"
            @click="nextStep"
            color="primary"
            :loading="loadingCreate"
            :disabled="loadingCreate"
          >
            {{ step != 4 ? "Avançar" : "Finalizar" }}
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <NewCliente
      :isDrawerOpen="isAddNewUserDrawerVisible"
      @update:isDrawerOpen="isAddNewUserDrawerVisible = $event"
      @clienteSaved="setCliente"
    />

    <VDialog v-model="viewClienteAvancado" v-if="clienteSelected.id">
      <VCard class="pa-3">
        <AppDrawerHeaderSection
          title="Cadastro do Cliente"
          @cancel="viewClienteAvancado = false"
        />
        <clienteAvancado :clienteId="clienteSelected.id" />
      </VCard>
    </VDialog>
  </VDialog>
</template>

<style scoped>
.v-menu .v-list-item.item-cliente {
  border-left: 4px solid !important;
  border-left-color: rgb(var(--v-theme-primary)) !important;
  border: 1px #00000017 solid;
  border-radius: 0px !important;
  padding-inline-start: 10px !important;
}
</style>
