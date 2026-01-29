<script setup>
  import { VDataTableServer } from "vuetify/labs/VDataTable";
  import { paginationMeta } from "@api-utils/paginationMeta";
  import ServicosDialog from "@/views/apps/servicos/ServicosDialog.vue";
  import { can } from "@layouts/plugins/casl";
  import { temaAtual } from "@core/stores/config";
  const { setAlert } = useAlert();
  const loading = ref(true);
  const userData = useCookie("userData").value;
  const router = useRouter();

  if (!can("view", "servico")) {
    setAlert(
      "Você não tem permissão para acessar esta página.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/");
  }

  onMounted(() => {
    getServicos();
  });

  // 👉 Store
  const searchQuery = ref("");
  const selectedRole = ref();

  // Data table options
  const itemsPerPage = ref(10);
  const page = ref(1);
  const sortBy = ref();
  const orderBy = ref();

  const updateOptions = (options) => {
    page.value = options.page;
    sortBy.value = options.sortBy[0]?.key;
    orderBy.value = options.sortBy[0]?.order;

    getServicos();
  };

  // Headers
  const headers = [
    {
      title: "Serviço",
      key: "ser_nome",
    },
    {
      title: "Valor",
      key: "ser_valor",
    },
    {
      title: "SubServiços",
      key: "ser_subservicos",
      sortable: false,
    },
    {
      title: "Ações",
      key: "actions",
      sortable: false,
    },
  ];

  const servicos = ref([]);
  const totalServicos = ref(0);

  const getServicos = async () => {
    if (!can("view", "servico")) {
      setAlert(
        "Você não tem permissão para acessar esta página.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return router.push("/");
    }

    loading.value = true;

    try {
      const res = await $api("/servicos/list", {
        method: "GET",
        query: {
          q: searchQuery.value,
          itemsPerPage: itemsPerPage.value,
          page: page.value,
          sortBy: sortBy.value,
          orderBy: orderBy.value,
        },
      });

      console.log("res servicos", res);

      servicos.value = res.servicos;
      totalServicos.value = res.totalServicos;
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
    }

    loading.value = false;
  };

  const isAddNewUserDrawerVisible = ref(false);
  const selectedServicoData = ref({});

  const editUser = async (item) => {
    try {
      if (!can("edit", "servico")) {
        setAlert(
          "Você não tem permissão para editar serviços.",
          "error",
          "tabler-alert-triangle",
          3000
        );
        return;
      }

      const res = await $api(`/servicos/get/${item.ser_id}`, {
        method: "GET",
      });

      if (!res) return;

      console.log("res edit", res);

      selectedServicoData.value = res;
      isAddNewUserDrawerVisible.value = true;
    } catch (error) {
      console.error("Error fetching user data", error, error.response);
    }
  };

  const deleteUser = async (id) => {
    if (!can("delete", "servico")) {
      setAlert(
        "Você não tem permissão para excluir serviços.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    //Confirmação de exclusão
    const confirm = window.confirm(
      "Tem certeza que deseja remover este serviço? Todos os dados relacionados a ele serão perdidos."
    );

    if (!confirm) {
      return;
    }

    try {
      await $api(`/servicos/delete/${id}`, {
        method: "GET",
        onResponseError({ response }) {
          errors.value = response._data.errors;
        },
      });

      setAlert(
        "Serviço excluído com sucesso!",
        "success",
        "tabler-trash",
        3000
      );

      getServicos();
    } catch (err) {
      console.error("Error fetching user data", err);
      console.error("Error fetching user data", err.response);
      setAlert(
        "Ocorreu um erro ao excluir o serviço, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const formatValor = (valor) => {
    if (!valor) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };
</script>

<template>
  <h2 class="text-h5 mb-0">Serviços ({{ totalServicos ?? 0 }})</h2>
  <p class="text-sm">Gerencie os serviços cadastrados no sistema.</p>

  <VCard class="mb-6">
    <VCardText class="d-flex flex-row gap-3 align-end">
      <AppTextField
        v-model="searchQuery"
        label="Pesquise um serviço"
        placeholder="Pesquisar por nome, descrição ou valor"
        density="compact"
        @update:model-value="getServicos"
      />
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
          v-if="can('create', 'servico')"
          prepend-icon="tabler-plus"
          @click="isAddNewUserDrawerVisible = true"
        >
          Cadastrar Serviço
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="servicos"
      :items-length="totalServicos"
      :headers="headers"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando servicos..."
    >
      <template #item.ser_nome="{ item }">
        <p class="mb-0">
          {{
            item.ser_nome && item.ser_nome !== "" && item.ser_nome !== undefined
              ? item.ser_nome
              : "Não Informado"
          }}
        </p>

        <p class="mb-0 text-truncate text-sm" v-if="item.ser_descricao">
          {{ item.ser_descricao }}
        </p>
      </template>

      <template #item.ser_valor="{ item }">
        {{ formatValor(item.ser_valor) }}
      </template>

      <template #item.ser_subservicos="{ item }">
        <p
          class="mb-0 text-sm text-primary cursor-pointer"
          @click="item.viewSubs = !item.viewSubs"
        >
          {{ item.ser_subservicos.length ?? 0 }} Subserviços

          <VIcon icon="tabler-eye" class="ml-2" />
        </p>

        <VDialog v-if="item.viewSubs" v-model="item.viewSubs" max-width="600px">
          <VCard>
            <VCardText class="pt-2">
              <!-- 👉 Title -->
              <AppDrawerHeaderSection
                :title="`Subserviços de ${item.ser_nome}`"
                @cancel="item.viewSubs = false"
              />

              <VTextField
                v-model="item.searchSubServico"
                placeholder="Buscar subserviço"
                prepend-inner-icon="tabler-search"
                class="mb-4"
                clearable
              />

              <VExpansionPanels
                multiple
                v-if="item.ser_subservicos?.length"
                rounded="md"
              >
                <template
                  v-for="(subservico, index) in item.ser_subservicos.filter(
                    (s) =>
                      !item.searchSubServico
                        ? true
                        : (s.ser_nome ?? '')
                            .toLowerCase()
                            .includes(item.searchSubServico.toLowerCase()) ||
                          (s.ser_descricao ?? '')
                            .toLowerCase()
                            .includes(item.searchSubServico.toLowerCase()) ||
                          (s.ser_valor ?? 0)
                            .toString()
                            .includes(item.searchSubServico.toLowerCase())
                  )"
                  :key="index"
                >
                  <VExpansionPanel
                    v-if="subservico"
                    rounded="md"
                    :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
                    :title="`${index + 1} - ${
                      subservico.ser_nome || 'Novo Subserviço'
                    }${
                      subservico.ser_valor
                        ? ' - ' + formatValor(subservico.ser_valor)
                        : ''
                    }`"
                  >
                    <VExpansionPanelText class="pt-4">
                      <p class="mb-0">
                        <strong>Nome:</strong>
                        {{ subservico.ser_nome || "Não Informado" }}
                      </p>

                      <p class="mb-0">
                        <strong>Descrição:</strong>
                        {{ subservico.ser_descricao || "Não Informado" }}
                      </p>

                      <p class="mb-0">
                        <strong>Valor:</strong>
                        {{
                          subservico.ser_valor
                            ? formatValor(subservico.ser_valor)
                            : formatValor(item.ser_valor)
                        }}
                      </p>

                      <div v-if="subservico.ser_data">
                        <VDivider class="my-4" />

                        <p class="mb-0"><strong>Informações</strong></p>

                        <p class="mb-0" v-if="subservico.ser_data?.garantia">
                          <strong>Garantia:</strong>
                          {{ subservico.ser_data.garantia || "Não Informado" }}
                        </p>

                        <p class="mb-0" v-if="subservico.ser_data?.ser_area">
                          <strong>Área:</strong>
                          {{ subservico.ser_data.ser_area || "Não Informado" }}
                        </p>

                        <p
                          class="mb-0"
                          v-if="subservico.ser_data?.metragem_interno"
                        >
                          <strong>Metragem Interno:</strong>
                          {{
                            subservico.ser_data.metragem_interno ||
                            "Não Informado"
                          }}
                        </p>

                        <p
                          class="mb-0"
                          v-if="subservico.ser_data?.metragem_externo"
                        >
                          <strong>Metragem Externo:</strong>
                          {{
                            subservico.ser_data.metragem_externo ||
                            "Não Informado"
                          }}
                        </p>

                        <p
                          class="mb-0"
                          v-if="subservico.ser_data?.metragem_total"
                        >
                          <strong>Metragem Total:</strong>
                          {{
                            subservico.ser_data.metragem_total ||
                            "Não Informado"
                          }}
                        </p>
                      </div>
                    </VExpansionPanelText>
                  </VExpansionPanel>
                </template>
              </VExpansionPanels>

              <p v-else class="text-sm text-disabled text-center">
                Nenhum subserviço cadastrado para este serviço.
              </p>
            </VCardText>
          </VCard>
        </VDialog>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          title="Editar serviço"
          @click="editUser(item)"
          color="warning"
          v-if="can('edit', 'servico')"
          class="me-2"
        >
          <VIcon icon="tabler-edit" />
        </IconBtn>

        <IconBtn
          v-if="can('delete', 'servico')"
          title="Remover serviço"
          @click="deleteUser(item.ser_id)"
          color="error"
        >
          <VIcon icon="tabler-trash" />
        </IconBtn>
      </template>

      <!-- pagination -->
      <template #bottom>
        <VDivider />
        <div
          class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
        >
          <p class="text-sm text-disabled mb-0">
            {{ paginationMeta({ page, itemsPerPage }, totalServicos) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalServicos / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : totalServicos > 100
                ? 4
                : Math.ceil(totalServicos / itemsPerPage)
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

  <ServicosDialog
    :isDrawerOpen="isAddNewUserDrawerVisible"
    @update:isDrawerOpen="isAddNewUserDrawerVisible = $event"
    :servicoData="selectedServicoData"
    @updateServicos="getServicos"
  />
</template>
