<script setup>
import { VDataTableServer } from "vuetify/labs/VDataTable";
import { paginationMeta } from "@api-utils/paginationMeta";
import moment from "moment";
import { useFunctions } from "@/composables/useFunctions";

const {
  copyEndereco,
  enderecoWaze,
  enderecoMaps,
  formatValue,
  escreverEndereco,
  formatDateAgendamento,
  typesAgendamento,
  debounce,
} = useFunctions();

const props = defineProps({
  dataDe: {
    type: String,
    default: null,
  },
  dataAte: {
    type: String,
    default: null,
  },
  viewFilter: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();
const loading = ref(true);
const userData = useCookie("userData").value;

onMounted(() => {
  getAgendamentos();
});

// Queries
const searchQuery = ref("");
const funcionarioQuery = ref(null);
const statusQuery = ref(null);
const typeQuery = ref(null);
const dataDeQuery = ref(props.dataDe);
const dataAteQuery = ref(props.dataAte);
const clienteQuery = ref(null);
const clienteText = ref("");
const pagoQuery = ref(null);

// Clientes
const clientes = ref([]);
const loadingClientes = ref(false);

const getClientes = async () => {
  let textQuery = clienteText.value;

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

    clientes.value = res.clientes;
  } catch (error) {
    console.error("Error Get Clientes:", error);
  } finally {
    loadingClientes.value = false;
  }
};

const debouncedGetClientes = debounce(getClientes, 500);

const setCliente = (cliente) => {
  console.log("setCliente", cliente);
  clienteText.value = cliente.cli_nome;
  clienteQuery.value = cliente.cli_Id;
  clientes.value = [];
  getAgendamentos();
};

const clearClientes = () => {
  clienteText.value = "";
  clienteQuery.value = "";
  clientes.value = [];
  getAgendamentos();
};

// Watchers
watch(
  () => props.dataDe,
  () => {
    dataDeQuery.value = props.dataDe;
    getAgendamentos();
  }
);

watch(
  () => props.dataAte,
  () => {
    dataAteQuery.value = props.dataAte;
    getAgendamentos();
  }
);

// Data table options
const itemsPerPage = ref(10);
const page = ref(1);
const sortBy = ref("age_data");
const orderBy = ref("desc");

const updateOptions = (options) => {
  page.value = options.page;
  sortBy.value = options.sortBy[0]?.key || "age_data";
  orderBy.value = options.sortBy[0]?.order || "desc";
  getAgendamentos();
};

// Headers
const headers = [
  {
    title: "Informações do Agendamento",
    key: "age_data",
  },
  {
    title: "Endereço",
    key: "endereco",
    sortable: false,
  },
  {
    title: "Serviços",
    key: "servicos",
    sortable: false,
  },
  {
    title: "Ações",
    key: "actions",
    sortable: false,
  },
];

// Agendamentos
const agendamentos = ref([]);
const totalAgendamentos = ref(0);

const getAgendamentos = async () => {
  loading.value = true;

  try {
    let query = {
      start: dataDeQuery.value,
      end: dataAteQuery.value,
      fun_id: funcionarioQuery.value,
      status: statusQuery.value,
      type: typeQuery.value,
      cliente: clienteQuery.value,
      pago: pagoQuery.value,
      notBloqueio: true,
    };

    console.log("query", query);

    const res = await $api(`/agenda/agendamentos`, {
      method: "GET",
      query,
    });

    console.log("res agendamentos", res);

    let filteredAgendamentos = res;

    // Filtrar por cliente no frontend
    /*     if (clienteQuery.value) {
      filteredAgendamentos = filteredAgendamentos.filter(
        (age) => age.cli_id === clienteQuery.value
      );
    } */

    // Filtrar por busca no frontend
    if (searchQuery.value) {
      const search = searchQuery.value.toLowerCase();
      filteredAgendamentos = filteredAgendamentos.filter((age) => {
        return (
          age.age_observacoes?.toLowerCase().includes(search) ||
          age.age_id?.toString().includes(search) ||
          age.cliente?.[0]?.cli_nome?.toLowerCase().includes(search)
        );
      });
    }

    // Filtrar por pagamento no frontend
    if (pagoQuery.value !== null) {
      console.log("filtrando por pagamento", pagoQuery.value);
      filteredAgendamentos = filteredAgendamentos.filter(
        (age) =>
          age.pago == pagoQuery.value &&
          age.ast_id == 3 &&
          age.age_valor != null &&
          age.age_valor > 0
      );
    }

    // Ordenação
    if (sortBy.value) {
      console.log("sortBy", sortBy.value);
      console.log("orderBy", orderBy.value);
      filteredAgendamentos.sort((a, b) => {
        if (!sortBy.value.includes("data")) {
          const aVal = a[sortBy.value];
          const bVal = b[sortBy.value];
          if (orderBy.value === "desc") {
            return aVal > bVal ? -1 : 1;
          }
          return aVal > bVal ? 1 : -1;
        } else {
          const dataA = moment(a.age_data);
          const dataB = moment(b.age_data);
          if (orderBy.value === "desc") {
            return dataA.isAfter(dataB) ? -1 : 1;
          }
          return dataA.isBefore(dataB) ? -1 : 1;
        }
      });
    }

    totalAgendamentos.value = filteredAgendamentos.length;

    // Paginação no frontend
    const start = (page.value - 1) * itemsPerPage.value;
    const end =
      itemsPerPage.value === -1
        ? filteredAgendamentos.length
        : start + itemsPerPage.value;

    agendamentos.value = filteredAgendamentos.slice(start, end);
  } catch (err) {
    console.error("Error fetching agendamentos", err);
    agendamentos.value = [];
  }

  loading.value = false;
};

const debouncedGetAgendamentos = debounce(getAgendamentos, 500);

// Funcionários
const funcionarios = ref([]);

const fetchResources = async () => {
  try {
    const res = await $api("/agenda/funcionarios", {
      method: "GET",
      query: {
        role: "colaborador",
        ativo: null,
        data: userData.id,
      },
    });

    if (!res) return;

    funcionarios.value = res;

    funcionarios.value.unshift({
      id: null,
      fullName: "Todos",
    });
  } catch (error) {
    console.error("Error fetching resources", error);
  }
};

fetchResources();

const status = [
  {
    title: "Todos",
    value: null,
  },
  {
    title: "Atendido",
    value: 3,
  },
  {
    title: "Agendado",
    value: 1,
  },
  {
    title: "Confirmado",
    value: 2,
  },
  {
    title: "Cancelado",
    value: 6,
  },
  {
    title: "Remarcado",
    value: 7,
  },
];

const formatValor = (valor) => {
  if (!valor) return "R$ 0,00";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const viewAge = (age) => {
  router.push({
    name: "agendamento",
    query: {
      viewAgendamento: age.age_id,
    },
  });
};
</script>

<template>
  <section>
    <VCard class="mb-6" rounded="xl" v-if="props.viewFilter">
      <VCardText>
        <VRow>
          <VCol cols="12" md="8">
            <v-menu location="bottom" max-height="250px">
              <template v-slot:activator="{ props }">
                <AppTextField
                  v-model="clienteText"
                  variant="solo-filled"
                  v-bind="props"
                  :loading="loadingClientes"
                  @keyup="debouncedGetClientes"
                  clearable
                  @click:clear="clearClientes"
                  label="Pesquise por cliente"
                  placeholder="Pesquise por cliente por nome, CPF, telefone ou endereço"
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
                </VListItem>
              </VList>

              <VList dense v-else-if="clienteText === ''">
                <VListItem>
                  <p class="mb-0">
                    Escreva mais de 3 letras para pesquisar um cliente por nome,
                    CPF, telefone ou endereço
                  </p>
                </VListItem>
              </VList>

              <VList
                dense
                v-else-if="clientes.length === 0 && clienteText !== ''"
              >
                <VListItem>
                  <p class="mb-0">Nenhum cliente encontrado</p>
                </VListItem>
              </VList>
            </v-menu>
          </VCol>

          <VCol cols="12" md="4">
            <AppSelect
              v-model="funcionarioQuery"
              :items="funcionarios"
              item-title="fullName"
              item-value="id"
              label="Filtrar por Funcionário"
              @update:model-value="debouncedGetAgendamentos"
              placeholder="Selecione um funcionário"
              clearable
            />
          </VCol>

          <VCol cols="12" md="4">
            <AppSelect
              v-model="statusQuery"
              :items="status"
              item-title="title"
              item-value="value"
              label="Filtrar por Status"
              @update:model-value="debouncedGetAgendamentos"
              placeholder="Todos os status"
              clearable
            />
          </VCol>

          <VCol cols="12" md="4">
            <AppSelect
              v-model="typeQuery"
              :items="[{ title: 'Todos', value: null }, ...typesAgendamento]"
              item-title="title"
              item-value="value"
              label="Filtrar por Tipo"
              @update:model-value="debouncedGetAgendamentos"
              placeholder="Todos os tipos"
              clearable
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
            </AppSelect>
          </VCol>

          <VCol cols="12" md="4">
            <AppSelect
              v-model="pagoQuery"
              :items="[
                { title: 'Todos', value: null },
                { title: 'Pago', value: true },
                { title: 'Pendente', value: false },
              ]"
              item-title="title"
              item-value="value"
              label="Filtrar por Pagamento"
              @update:model-value="debouncedGetAgendamentos"
              placeholder="Todos os pagamentos"
              clearable
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VCard rounded="xl">
      <VCardText class="d-flex flex-wrap py-4 gap-4">
        <div class="me-3 d-flex gap-3">
          <AppSelect
            :model-value="itemsPerPage"
            :items="[
              { value: 10, title: '10' },
              { value: 25, title: '25' },
              { value: 50, title: '50' },
              { value: 100, title: '100' },
              { value: -1, title: 'Todos' },
            ]"
            style="inline-size: 6.25rem"
            @update:model-value="itemsPerPage = parseInt($event, 10)"
          />
        </div>
        <VSpacer />
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="agendamentos"
        :items-length="totalAgendamentos"
        :headers="headers"
        @update:options="updateOptions"
        :loading="loading"
        loading-text="Carregando agendamentos..."
      >
        <template #item.age_data="{ item }">
          <div class="my-2" style="max-width: 350px">
            <div class="d-flex flex-row align-center gap-2 mb-2">
              <p class="mb-0">#{{ item.age_id }}</p>

              <VChip
                label
                variant="flat"
                :color="item.bkColor || 'default'"
                size="x-small"
              >
                <span class="text-white">{{
                  item.status ?? "Desconhecido"
                }}</span>

                <VTooltip activator="parent" location="bottom">
                  <p class="mb-0 text-sm">Status do agendamento</p>
                </VTooltip>
              </VChip>
            </div>

            <p class="mb-1 text-sm">
              <span class="mr-2">
                {{
                  typesAgendamento?.find((t) => t.value == item.age_type)?.emoji
                }}
              </span>
              {{
                typesAgendamento?.find((t) => t.value == item.age_type)?.title
              }}
            </p>
            <p class="mb-1 text-sm font-weight-medium">
              <VIcon icon="tabler-user" class="mr-2" />
              {{ item?.cliente?.[0]?.cli_nome || "N/A" }}
            </p>

            <p class="mb-1 text-sm">
              <VIcon icon="tabler-calendar" class="mr-2" />
              {{
                formatDateAgendamento(
                  item.age_data,
                  item.age_horaInicio,
                  item.age_horaFim
                )
              }}
              <VTooltip activator="parent" location="bottom">
                <p class="mb-0 text-sm">Data do agendamento</p>
              </VTooltip>
            </p>

            <p class="mb-1 text-sm text-truncate">
              <VIcon icon="tabler-user" class="mr-2" />
              {{
                item?.funcionario?.length
                  ? item.funcionario[0]?.fullName
                  : "Sem funcionário"
              }}
              <VTooltip activator="parent" location="bottom">
                <p class="mb-0 text-sm">Funcionário responsável</p>
              </VTooltip>
            </p>

            <div class="d-flex flex-row align-center gap-2 mb-1">
              <p class="mb-0 text-sm" v-if="item?.age_valor != null">
                <VIcon icon="tabler-coin" class="mr-2" />
                {{ formatValor(item.age_valor) }}
                <span
                  v-if="item.age_desconto > 0"
                  class="text-caption text-disabled ml-1"
                >
                  (Desc: {{ formatValor(item.age_desconto) }})
                </span>
                <VTooltip activator="parent" location="bottom">
                  <span class="mb-0 text-sm">Valor do agendamento</span>
                </VTooltip>
              </p>
              <VChip
                v-if="
                  item?.ast_id == 3 &&
                  item?.age_valor != null &&
                  item?.age_valor > 0
                "
                class="ml-2"
                size="x-small"
                :color="item.pago ? 'success' : 'warning'"
                label
              >
                <VIcon icon="tabler-coin" size="12" class="mr-1" />
                {{ item.pago ? "Pago" : "Pendente" }}
                <VTooltip activator="parent" location="bottom">
                  <p class="mb-0 text-sm">Status do pagamento</p>
                </VTooltip>
              </VChip>
            </div>

            <div class="d-flex gap-1 mt-1">
              <VChip size="x-small" color="error" v-if="item.age_retrabalho">
                Retrabalho
              </VChip>
              <VChip size="x-small" color="warning" v-if="item.age_garantia">
                Garantia
              </VChip>
              <VChip size="x-small" color="info" v-if="item.age_contrato">
                <VIcon icon="tabler-file-text" size="12" class="mr-1" />
                #{{ item.age_contrato }}
              </VChip>
            </div>
          </div>
        </template>

        <template #item.endereco="{ item }">
          <div class="my-2" style="max-width: 300px">
            <p class="mb-2 text-sm" v-if="item?.endereco?.[0]">
              {{ escreverEndereco(item?.endereco?.[0]) }}
            </p>
            <p class="mb-0 text-sm text-disabled" v-else>Sem endereço</p>
            <div class="d-flex gap-1" v-if="item?.endereco?.[0]">
              <IconBtn
                size="x-small"
                color="warning"
                variant="tonal"
                @click="copyEndereco(item?.endereco?.[0])"
              >
                <VIcon icon="tabler-copy" size="14" />
                <VTooltip activator="parent">Copiar</VTooltip>
              </IconBtn>
              <IconBtn
                size="x-small"
                color="info"
                variant="tonal"
                @click="enderecoWaze(item?.endereco?.[0])"
              >
                <VIcon icon="tabler-brand-waze" size="14" />
                <VTooltip activator="parent">Waze</VTooltip>
              </IconBtn>
              <IconBtn
                size="x-small"
                color="success"
                variant="tonal"
                @click="enderecoMaps(item?.endereco?.[0])"
              >
                <VIcon icon="tabler-map" size="14" />
                <VTooltip activator="parent">Maps</VTooltip>
              </IconBtn>
            </div>
          </div>
        </template>

        <template #item.servicos="{ item }">
          <div class="my-2" style="max-width: 250px">
            <div v-if="item?.servicos?.length > 0">
              <p
                class="mb-1 text-sm"
                v-for="(servico, index) in item.servicos"
                :key="index"
              >
                <VIcon icon="tabler-tools" class="mr-2" size="16" />
                <strong>{{ servico.ser_quantity || 1 }}x</strong>
                {{ servico.ser_nome }}
                <span class="text-caption"
                  >({{ formatValue(servico.ser_valor) }})</span
                >
              </p>
            </div>
            <p class="mb-0 text-sm text-disabled" v-else>
              <VIcon icon="tabler-tools-off" class="mr-2" />
              Nenhum serviço
            </p>
          </div>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn
            variant="tonal"
            color="primary"
            @click="$emit('openEvent', item.age_id)"
          >
            <VIcon icon="tabler-eye" />

            <VTooltip
              activator="parent"
              location="bottom"
              text="Visualizar agendamento"
            />
          </IconBtn>
        </template>

        <!-- pagination -->
        <template #bottom>
          <VDivider />
          <div
            class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
          >
            <p class="text-sm text-disabled mb-0">
              {{ paginationMeta({ page, itemsPerPage }, totalAgendamentos) }}
            </p>

            <VPagination
              v-model="page"
              :length="Math.ceil(totalAgendamentos / itemsPerPage)"
              :total-visible="
                $vuetify.display.xs
                  ? 1
                  : totalAgendamentos > 100
                  ? 4
                  : Math.ceil(totalAgendamentos / itemsPerPage)
              "
            >
              <template #prev="slotProps">
                <VBtn
                  variant="tonal"
                  color="default"
                  v-bind="slotProps"
                  :icon="false"
                >
                  Anterior
                </VBtn>
              </template>

              <template #next="slotProps">
                <VBtn
                  variant="tonal"
                  color="default"
                  v-bind="slotProps"
                  :icon="false"
                >
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

<style scoped>
.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
