<script setup>
  import { VDataTableServer } from "vuetify/labs/VDataTable";
  import { paginationMeta } from "@api-utils/paginationMeta";
  import ComissaoDialog from "@/views/apps/comissao/comissaoDialog.vue";
  import { useAlert } from "@/composables/useAlert";
  import moment from "moment";
  import { can } from "@layouts/plugins/casl";
  import { useFunctions } from "@/composables/useFunctions";

  const { escreverEndereco } = useFunctions();
  const { setAlert } = useAlert();
  const loading = ref(true);
  const router = useRouter();

  if (!can("view", "financeiro_comissao")) {
    setAlert(
      "Você não tem permissão para acessar esta página.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/");
  }

  onMounted(() => {
    getComissoes();
  });

  // 👉 Store
  const clienteText = ref("");
  const clienteQuery = ref("");
  const funcionarioQuery = ref(null);
  const searchQuery = ref("");
  const dateDe = ref("");
  const dateAte = ref("");

  const clientes = ref([]);

  const loadingClientes = ref(false);

  const getClientes = async () => {
    let textQuery = clienteText.value?.trim() || "";

    if (textQuery?.length < 3) {
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

  const setCliente = (cliente) => {
    console.log("Set Cliente:", cliente);
    clienteText.value = cliente.cli_nome;
    clienteQuery.value = cliente.cli_Id;
    clientes.value = [];

    getComissoes();
  };

  const clearClientes = () => {
    clienteText.value = "";
    clienteQuery.value = "";
    clientes.value = [];
    getComissoes();
  };

  // Data table options
  const itemsPerPage = ref(10);
  const page = ref(1);
  const sortBy = ref();
  const orderBy = ref();

  const updateOptions = (options) => {
    page.value = options.page;
    sortBy.value = options.sortBy[0]?.key;
    orderBy.value = options.sortBy[0]?.order;

    getComissoes();
  };

  // Headers
  const headers = [
    {
      title: "Funcionário",
      key: "fun_id",
    },
    {
      title: "Agendamento",
      key: "age_id",
    },
    {
      title: "Valor",
      key: "com_valor",
    },
    {
      title: "Status",
      key: "com_paga",
    },
    {
      title: "Ações",
      key: "actions",
      sortable: false,
    },
  ];

  const comissoes = ref([]);
  const totalComissoes = ref(0);
  const funcionarios = ref([]);

  const getComissoes = async () => {
    loading.value = true;

    console.log("Fetching comissoes with:", {
      q: searchQuery.value,
      dateDe: dateDe.value,
      dateAte: dateAte.value,
      itemsPerPage: itemsPerPage.value,
      page: page.value,
      sortBy: sortBy.value,
      orderBy: orderBy.value,
      f: funcionarioQuery.value,
      cliente: clienteQuery.value,
    });

    try {
      const res = await $api("/comissoes/list", {
        method: "GET",
        query: {
          q: searchQuery.value,
          dateDe: dateDe.value,
          dateAte: dateAte.value,
          itemsPerPage: itemsPerPage.value,
          page: page.value,
          sortBy: sortBy.value,
          orderBy: orderBy.value,
          f: funcionarioQuery.value,
          cliente: clienteQuery.value,
        },
      });

      console.log("res comissoess", res);

      comissoes.value = res.comissoes ?? [];

      totalComissoes.value = res?.totalComissoes ?? 0;
      funcionarios.value = [
        { id: null, fullName: "Todos os funcionários" },
        ...(res.funcionarios || []),
      ];
    } catch (err) {
      console.error("Error fetching user data", err, err.response);

      comissoes.value = [];
      totalComissoes.value = 0;
    }

    loading.value = false;
  };

  const isAddNewUserDrawerVisible = ref(false);
  const selectedComissaoData = ref({});

  const editUser = async (item) => {
    if (!can("edit", "financeiro_comissao")) {
      setAlert(
        "Você não tem permissão para editar comissões.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    try {
      const res = await $api(`/comissoes/get/${item.com_id}`, {
        method: "GET",
      });

      if (!res) return;

      console.log("res edit", res);

      selectedComissaoData.value = res;
      isAddNewUserDrawerVisible.value = true;
    } catch (error) {
      console.error("Error fetching user data", error, error.response);

      setAlert(
        error.response?._data?.message ||
          "Ocorreu um erro ao buscar os dados da comissão, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const formatValor = (valor) => {
    if (!valor || isNaN(valor)) return "R$ 0,00";
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };
</script>

<template>
  <h2 class="text-h5 mb-0">Comissões ({{ totalComissoes ?? 0 }} )</h2>
  <p class="text-sm">Gerencie as comissões dos funcionários.</p>

  <VCard class="mb-6">
    <VCardText>
      <VRow>
        <VCol cols="12" md="6">
          <v-menu location="bottom" max-height="250px">
            <template v-slot:activator="{ props }">
              <AppTextField
                v-model="clienteText"
                variant="solo-filled"
                v-bind="props"
                :loading="loadingClientes"
                @update:model-value="getClientes"
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
                  {{ cliente.cli_nome }}
                </p>
                <p class="text-caption mb-0">
                  <VIcon icon="tabler-map-pin" size="12" class="mr-1" />
                  {{ escreverEndereco(cliente.enderecos[0]) }}
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
        <VCol cols="12" md="6">
          <AppTextField
            v-model="searchQuery"
            label="Pesquise por funcionário ou valor"
            placeholder="Pesquise por nome do funcionário ou valor"
            density="compact"
            clearable
            @update:model-value="getComissoes"
          />
        </VCol>
        <VCol cols="12" md="4">
          <AppSelect
            v-model="funcionarioQuery"
            :items="funcionarios"
            label="Filtrar por funcionário"
            item-value="id"
            item-title="fullName"
            placeholder="Filtrar por funcionário"
            @update:model-value="getComissoes"
            clearable
            @click:clear="getComissoes"
          />
        </VCol>
        <VCol cols="12" md="4">
          <AppTextField
            v-model="dateDe"
            label="Data Inicial (Agendamento)"
            placeholder="Pesquise por data do agendamento"
            density="compact"
            @update:model-value="getComissoes"
            type="date"
            clearable
          />
        </VCol>
        <VCol cols="12" md="4">
          <AppTextField
            v-model="dateAte"
            label="Data Final (Agendamento)"
            placeholder="Pesquise por data do agendamento"
            density="compact"
            @update:model-value="getComissoes"
            type="date"
            clearable
          />
        </VCol>
      </VRow>
    </VCardText>
  </VCard>

  <VCard>
    <VCardText class="d-flex flex-wrap align-center py-4 gap-4">
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

      <p class="mb-0 text-sm ml-auto">
        Para adicionar uma comissão, adicione diretamente no agendamento.
      </p>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="comissoes"
      :items-length="totalComissoes"
      :headers="headers"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando comissões..."
    >
      <template #item.fun_id="{ item }">
        <p class="mb-0">{{ item.funcionario?.fullName || "Não Encontrado" }}</p>
      </template>

      <template #item.age_id="{ item }">
        <div class="text-sm my-1" style="max-width: 300px">
          <p class="mb-0">
            <VIcon icon="tabler-calendar" size="14" class="mr-1" />
            {{
              item.agendamento?.age_data
                ? moment(item.agendamento?.age_data).format("DD/MM/YYYY")
                : "Não Encontrado"
            }}
          </p>
          <p class="mb-0 text-truncate cursor-pointer">
            <VIcon icon="tabler-user" size="14" class="mr-1" />
            {{ item.cliente?.cli_nome || "Não Encontrado" }}

            <VTooltip activator="parent">
              <span class="text-sm">{{
                item.cliente?.cli_nome || "Não Encontrado"
              }}</span>
            </VTooltip>
          </p>
          <p
            class="mb-0 text-truncate cursor-pointer"
            v-if="item.endereco?.length > 0"
          >
            <VIcon icon="tabler-map-pin" size="14" class="mr-1" />
            {{ escreverEndereco(item.endereco[0]) }}

            <VTooltip activator="parent">
              <span class="text-sm">
                {{ escreverEndereco(item.endereco[0]) }}
              </span>
            </VTooltip>
          </p>
          <p class="mb-0" style="max-width: 250px; white-space: normal">
            <VIcon icon="tabler-coins" size="14" class="mr-1" />
            {{ formatValor(item.agendamento?.age_valor || 0) }}
          </p>
        </div>
      </template>

      <template #item.com_valor="{ item }">
        {{ formatValor(item.com_valor) }}
      </template>

      <template #item.com_paga="{ item }">
        <VChip color="success" label v-if="item.com_paga == 1">
          Pago em
          {{ moment(item.com_paga_data).format("DD/MM/YYYY") }}
        </VChip>
        <VChip color="warning" label v-else>Pendente</VChip>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          :title="
            item.com_paga == 0 ? 'Editar Comissão' : 'Visualizar Comissão'
          "
          :color="item.com_paga == 0 ? 'warning' : 'info'"
          @click="editUser(item)"
        >
          <VIcon :icon="item.com_paga == 0 ? 'tabler-edit' : 'tabler-eye'" />
        </IconBtn>
      </template>

      <!-- pagination -->
      <template #bottom>
        <VDivider />
        <div
          class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
        >
          <p class="text-sm text-disabled mb-0">
            {{ paginationMeta({ page, itemsPerPage }, totalComissoes) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalComissoes / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : totalComissoes > 100
                ? 4
                : Math.ceil(totalComissoes / itemsPerPage)
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

  <ComissaoDialog
    :isDrawerOpen="isAddNewUserDrawerVisible"
    @update:isDrawerOpen="isAddNewUserDrawerVisible = $event"
    :comissaoData="selectedComissaoData"
    :agendamento="selectedComissaoData?.agendamento || null"
    @updateComissoes="getComissoes"
  />
</template>
