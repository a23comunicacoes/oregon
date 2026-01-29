<script setup>
  import { VDataTableServer } from "vuetify/labs/VDataTable";
  import { paginationMeta } from "@api-utils/paginationMeta";

  import { can } from "@layouts/plugins/casl";
  import moment from "moment";

  import NewCliente from "@/views/apps/clientes/newCliente.vue";

  import tableagendamentos from "@/views/apps/relatorios/tableagendamentos.vue";

  import { useFunctions } from "@/composables/useFunctions";
  const { copyEndereco, enderecoWaze, enderecoMaps } = useFunctions();

  const router = useRouter();

  const { setAlert } = useAlert();
  const loading = ref(true);
  const userData = useCookie("userData").value;

  if (!can("view", "cliente")) {
    setAlert(
      "Você não tem permissão para acessar esta página.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/");
  }

  onMounted(() => {
    getClientes();
  });

  // 👉 Store
  const searchQuery = ref("");
  const cadastroDeQuery = ref(null);
  const cadastroAteQuery = ref(null);
  const totalAgendamentosDeQuery = ref(null);
  const totalAgendamentosAteQuery = ref(null);
  const gastoDeQuery = ref(null);
  const gastoAteQuery = ref(null);

  // Data table options
  const itemsPerPage = ref(10);
  const page = ref(1);
  const sortBy = ref();
  const orderBy = ref();

  const updateOptions = (options) => {
    page.value = options.page;
    sortBy.value = options.sortBy[0]?.key;
    orderBy.value = options.sortBy[0]?.order;

    console.log("options", options);

    getClientes();
  };

  // Headers
  const headers = [
    {
      title: "Nome",
      key: "cli_nome",
    },
    {
      title: "Ganhos",
      key: "gasto",
      sortable: false,
      hide: !can("view", "crm_clientes") && !can("manage", "crm"),
    },
    {
      title: "Agendamentos",
      key: "agendamentos",
      sortable: false,
    },
    {
      title: "Endereços",
      key: "enderecos",
      sortable: false,
    },
    {
      title: "Cadastro",
      key: "created_at",
    },
    {
      title: "Ações",
      key: "actions",
      sortable: false,
    },
  ];

  const clientes = ref([]);
  const totalClientes = ref(0);

  const getClientes = async () => {
    loading.value = true;

    try {
      const res = await $api("/clientes/list", {
        method: "GET",
        query: {
          q: searchQuery.value,
          itemsPerPage: itemsPerPage.value,
          page: page.value,
          sortBy: sortBy.value,
          orderBy: orderBy.value,
          cadastroDe: cadastroDeQuery.value,
          cadastroAte: cadastroAteQuery.value,
          totalAgendamentosDe: totalAgendamentosDeQuery.value,
          totalAgendamentosAte: totalAgendamentosAteQuery.value,
          gastoDe: gastoDeQuery.value,
          gastoAte: gastoAteQuery.value,
        },
      });

      console.log("res", res);

      clientes.value = res.clientes;
      totalClientes.value = res.totalClientes;
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
    }

    loading.value = false;
  };

  const selectedUserData = ref(null);
  const viewNewCliente = ref(false);

  watch(viewNewCliente, (newVal) => {
    if (!newVal) {
      selectedUserData.value = null;
    }
  });

  const editUser = async (item) => {
    if (!can("edit", "cliente")) {
      setAlert(
        "Você não tem permissão para editar clientes.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    try {
      const res = await $api(`/clientes/get/${item.cli_Id}`);

      if (!res) return;

      console.log("res edit", res);

      selectedUserData.value = res[0];
      viewNewCliente.value = true;
    } catch (error) {
      console.error("Error fetching user data", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Ocorreu um erro ao buscar os dados do cliente, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const viewUser = (item) => {
    if (!item || !item.cli_Id) return;

    router.push(`/cliente/${item.cli_Id}`);
  };

  const deleteUser = async (id) => {
    if (!can("delete", "cliente")) {
      setAlert(
        "Você não tem permissão para excluir clientes.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    const confirm = window.confirm(
      "Tem certeza que deseja remover este cliente? Você poderá restaurá-lo posteriormente."
    );

    if (!confirm) {
      return;
    }

    try {
      await $api(`/clientes/delete/${id}`, {
        method: "GET",
      });

      setAlert(
        "Cliente excluído com sucesso!",
        "success",
        "tabler-trash",
        3000
      );
      getClientes();
      atualizaTotalUsuarios();
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
      setAlert(
        "Ocorreu um erro ao excluir o cliente, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const restoreUser = async (id) => {
    if (!can("delete", "cliente")) {
      setAlert(
        "Você não tem permissão para restaurar clientes.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    const confirm = window.confirm(
      "Tem certeza que deseja restaurar este cliente?"
    );

    if (!confirm) {
      return;
    }

    try {
      await $api(`/clientes/restore/${id}`, {
        method: "GET",
      });

      setAlert(
        "Cliente restaurado com sucesso!",
        "success",
        "tabler-trash",
        3000
      );
      getClientes();
      atualizaTotalUsuarios();
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
      setAlert(
        "Ocorreu um erro ao restaurar o cliente, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const viewFilters = ref(false);
</script>

<template>
  <h2 class="text-h5 mb-0">Clientes ({{ totalClientes ?? 0 }})</h2>
  <p class="text-sm">Gerencie os clientes cadastrados no sistema.</p>

  <VCard class="mb-6">
    <VCardText class="d-flex flex-row gap-3 align-end">
      <VRow>
        <VCol cols="12" class="d-flex flex-row gap-4 align-end">
          <AppTextField
            v-model="searchQuery"
            label="Pesquise um cliente"
            placeholder="Pesquisar por nome, email, CPF, celular ou endereço"
            @keyup.enter="getClientes()"
            clearable
          />

          <VBtn
            color="primary"
            variant="tonal"
            @click="viewFilters = !viewFilters"
          >
            <VIcon
              :icon="viewFilters ? 'tabler-filter-off' : 'tabler-filter'"
              class="mr-2"
            />
            {{ viewFilters ? "Ocultar Filtros" : "Mostrar Filtros" }}
          </VBtn>

          <VBtn color="primary" @click="getClientes()">
            <VIcon icon="tabler-search" class="mr-2" />
            Pesquisar
          </VBtn>
        </VCol>

        <template v-if="viewFilters">
          <VCol cols="12" md="4">
            <AppTextField
              v-model="cadastroDeQuery"
              label="Cadastro de"
              type="date"
              clearable
            />
          </VCol>

          <VCol cols="12" md="4">
            <AppTextField
              v-model="cadastroAteQuery"
              label="Cadastro até"
              type="date"
              clearable
            />
          </VCol>

          <VCol cols="12" md="4">
            <AppTextField
              v-model="totalAgendamentosDeQuery"
              label="Total de agendamentos de"
              placeholder="Informe o total de agendamentos de"
              type="number"
              clearable
            />
          </VCol>

          <VCol cols="12" md="4">
            <AppTextField
              v-model="totalAgendamentosAteQuery"
              label="Total de agendamentos até"
              placeholder="Informe o total de agendamentos até"
              type="number"
              clearable
            />
          </VCol>

          <VCol
            cols="12"
            md="4"
            v-if="
              can('manage', 'cliente') ||
              can('view', 'crm_clientes')
            "
          >
            <AppTextField
              v-model="gastoDeQuery"
              label="Ganhos de (R$)"
              type="number"
              placeholder="Informe o ganhos de"
              clearable
            />
          </VCol>

          <VCol
            cols="12"
            md="4"
            v-if="
              can('manage', 'cliente') ||
              can('view', 'crm_clientes') ||
              can('manage', 'crm')
            "
          >
            <AppTextField
              v-model="gastoAteQuery"
              label="Ganhos até (R$)"
              type="number"
              placeholder="Informe o ganhos até"
              clearable
            />
          </VCol>
        </template>
      </VRow>
    </VCardText>
  </VCard>

  <VCard>
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

      <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
        <!-- 👉 Add user button -->
        <VBtn
          prepend-icon="tabler-plus"
          @click="viewNewCliente = true"
          v-if="can('manage', 'cliente') || can('create', 'cliente')"
        >
          Cadastrar Cliente
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="clientes"
      :items-length="totalClientes"
      :headers="headers.filter((h) => !h.hide)"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando clientes..."
    >
      <template #item.cli_nome="{ item }">
        <div class="mt-1 mb-2">
          <p class="mb-0">{{ item.cli_nome }}</p>
          <p class="mb-0 text-caption" v-if="item.cli_email">
            <VIcon icon="tabler-mail" class="mr-1" />
            {{ item.cli_email }}
          </p>
          <p class="mb-0 text-caption" v-if="item.cli_celular">
            <VIcon icon="tabler-phone" class="mr-1" />
            {{ item.cli_celular }}
          </p>
          <p class="mb-0 text-caption" v-if="item.cli_cpf">
            <VIcon icon="tabler-id" class="mr-1" />
            {{ item.cli_cpf }}
          </p>
        </div>
      </template>

      <template #item.agendamentos="{ item }">
        <a
          href="#"
          class="text-primary mb-0"
          @click="item.agendamentoVisible = true"
          v-if="item.agendamentos"
        >
          <VIcon icon="tabler-calendar" class="mr-1" />
          Ver agendamentos ({{ item.agendamentos?.length }})
        </a>

        <VDialog v-model="item.agendamentoVisible" v-if="item.agendamentos">
          <VCard>
            <VCardText>
              <div
                class="d-flex flex-row justify-space-between align-center mb-4"
              >
                <div class="d-flex flex-row">
                  <VIcon icon="tabler-calendar" class="mr-1" />
                  <p class="mb-0">Agendamentos do cliente</p>
                </div>
                <VIcon
                  icon="tabler-x"
                  @click="item.agendamentoVisible = false"
                />
              </div>
              <tableagendamentos :cli_id="item.cli_Id" />
            </VCardText>
          </VCard>
        </VDialog>

        <p class="mb-0" v-else>Nenhum agendamento</p>
      </template>

      <template #item.gasto="{ item }">
        <p class="mb-0" v-if="item.gasto">
          R$ {{ parseFloat(item.gasto).toFixed(2).replace(".", ",") }}
        </p>
        <p class="mb-0" v-else>Nenhum ganhos</p>
      </template>

      <template #item.enderecos="{ item }">
        <a
          href="#"
          class="text-primary mb-0"
          @click="item.enderecosVisible = true"
          v-if="item.enderecos"
        >
          <VIcon icon="tabler-map-pin" class="mr-1" />
          Ver endereços ({{ item.enderecos?.length }})
        </a>

        <p v-else class="mb-0">Nenhum endereço</p>

        <VDialog
          v-model="item.enderecosVisible"
          v-if="item.enderecos"
          max-width="600"
        >
          <VCard rounded="xl">
            <VCardText>
              <div
                class="d-flex flex-row justify-space-between align-center mb-4"
              >
                <div class="d-flex flex-row">
                  <VIcon icon="tabler-map-pin" class="mr-1" />
                  <p class="mb-0">Endereços do cliente</p>
                </div>
                <VIcon icon="tabler-x" @click="item.enderecosVisible = false" />
              </div>

              <div>
                <VCard
                  v-for="endereco in item.enderecos"
                  :key="endereco.end_id"
                  class="mb-4 pa-4 text-sm"
                >
                  <div class="d-flex flex-column flex-md-row gap-2 mb-3">
                    <VBtn
                      color="warning"
                      variant="tonal"
                      @click="copyEndereco(endereco)"
                      size="small"
                    >
                      <VIcon icon="tabler-copy" class="mr-1" />
                      Copiar
                    </VBtn>

                    <VBtn
                      color="info"
                      variant="tonal"
                      @click="enderecoWaze(endereco)"
                      size="small"
                    >
                      <VIcon icon="tabler-brand-waze" class="mr-1" />
                      Waze
                    </VBtn>

                    <VBtn
                      color="success"
                      variant="tonal"
                      @click="enderecoMaps(endereco)"
                      size="small"
                    >
                      <VIcon icon="tabler-brand-google-maps" class="mr-1" />
                      Google Maps
                    </VBtn>
                  </div>

                  <p class="mb-0">
                    <strong>Endereço:</strong>
                    {{ endereco.end_logradouro }}, {{ endereco.end_numero }}
                    <span v-if="endereco.end_complemento">
                      - {{ endereco.end_complemento }}
                    </span>
                  </p>
                  <p class="mb-0">
                    <strong>Bairro:</strong> {{ endereco.end_bairro }}
                  </p>
                  <p class="mb-0">
                    <strong>Cidade:</strong> {{ endereco.end_cidade }} -
                    {{ endereco.end_estado }}
                  </p>
                  <p class="mb-0">
                    <strong>CEP:</strong> {{ endereco.end_cep }}
                  </p>
                </VCard>
              </div>
            </VCardText>
          </VCard>
        </VDialog>
      </template>

      <template #item.created_at="{ item }">
        {{ moment(item.created_at).format("DD/MM/YYYY HH:mm") }}
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <div v-if="item.cli_ativo === 1" class="d-flex gap-2">
          <IconBtn
            variant="tonal"
            color="primary"
            title="Visualizar cliente"
            @click="viewUser(item)"
            v-if="
              can('manage', 'cliente') ||
              can('view', 'crm_clientes') ||
              can('manage', 'crm')
            "
          >
            <VIcon icon="tabler-eye" />
          </IconBtn>

          <IconBtn
            variant="tonal"
            color="warning"
            title="Editar cliente"
            @click="editUser(item)"
            v-if="can('manage', 'cliente') || can('edit', 'cliente')"
          >
            <VIcon icon="tabler-edit" />
          </IconBtn>

          <IconBtn
            variant="tonal"
            color="error"
            title="Remover cliente"
            @click="deleteUser(item.cli_Id)"
            v-if="can('manage', 'cliente') || can('delete', 'cliente')"
          >
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </div>

        <div v-else>
          <VBtn
            variant="outlined"
            @click="restoreUser(item.cli_Id)"
            v-if="can('manage', 'cliente') || can('delete', 'cliente')"
          >
            <VIcon icon="tabler-restore" />
            Restaurar cliente
          </VBtn>
        </div>
      </template>

      <!-- pagination -->
      <template #bottom>
        <VDivider />
        <div
          class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
        >
          <p class="text-sm text-disabled mb-0">
            {{ paginationMeta({ page, itemsPerPage }, totalClientes) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalClientes / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : totalClientes > 100
                ? 4
                : Math.ceil(totalClientes / itemsPerPage)
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

  <NewCliente
    :isDrawerOpen="viewNewCliente"
    @update:isDrawerOpen="viewNewCliente = $event"
    :clienteData="selectedUserData"
    @clienteSaved="getClientes"
  />
</template>
