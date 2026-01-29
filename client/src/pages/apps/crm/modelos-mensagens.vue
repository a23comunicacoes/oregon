<script setup>
import { VDataTableServer } from "vuetify/labs/VDataTable";
  import { paginationMeta } from "@api-utils/paginationMeta";
  import modeloDialog from "@/views/apps/crm/modeloDialog.vue";
  import { can } from "@layouts/plugins/casl";

  if (!can("view", "crm_modelos_mensagens")) {
    setAlert(
      "Você não tem permissão para acessar esta página.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/");
  }

  import moment from "moment";
  const { setAlert } = useAlert();

  const userData = useCookie("userData").value;
  const userRole = userData.role;

  const router = useRouter();

  const route = useRoute();
  const loading = ref(false);
  const viewFilters = ref(false);

  // 👉 Store
  const searchQuery = ref("");

  // Data table options
  const itemsPerPage = ref(10);
  const page = ref(1);
  const sortBy = ref();
  const orderBy = ref();

  const updateOptions = (options) => {
    page.value = options.page;
    sortBy.value = options.sortBy[0]?.key;
    orderBy.value = options.sortBy[0]?.order;

    getTemplates();
  };

  // Headers
  const headers = [
    {
      title: "Nome",
      key: "name",
    },
    {
      title: "Criada em",
      key: "created_at",
    },
    {
      title: "Ações",
      key: "actions",
      sortable: false,
    },
  ];

  const templates = ref([]);
  const totalTemplates = ref(0);

  const getTemplates = async () => {
    loading.value = true;

    try {
      const res = await $api("/templates", {
        method: "GET",
        query: {
          type: 'mensagem',
          q: searchQuery.value,
          itemsPerPage: itemsPerPage.value,
          page: page.value,
          sortBy: sortBy.value,
          orderBy: orderBy.value,
        },
      });

      if (!res) return;

      console.log("templates ress", res);

      templates.value = res.templates;
      totalTemplates.value = res.totalTemplates;
    } catch (error) {
      console.error("Error fetching user data", error, error.response);

      templates.value = [];
      totalTemplates.value = 0;
    }
    loading.value = false;
  };

  getTemplates();

  const viewDialogModelo = ref(false);
  const selectedModelo = ref(null);

  const openDialogModelo = (item) => {
    selectedModelo.value = item;
    viewDialogModelo.value = true;
  };

  const closeDialogModelo = () => {
    selectedModelo.value = null;
    viewDialogModelo.value = false;
  };

  watch(
    () => viewDialogModelo.value,
    (newValue) => {
      if (!newValue) {
        selectedModelo.value = null;
      }
    }
  );

  const deleteUser = async (item) => {
    const confirmar = confirm(
      "Deseja realmente excluir esse modelo? Essa ação não poderá ser desfeita!"
    );

    if (!confirmar) return;

    let index = templates.value.findIndex((cliente) => cliente.id === item.id);
    templates.value[index].loadingTrash = true;
    try {
      const res = await $api(`/templates/delete/${item.id}`, {
        method: "DELETE",
      });

      if (!res) return;

      console.log("deleteUser", res);

      getTemplates();
      setAlert(
        "Modelo excluído com sucesso",
        "success",
        "tabler-alert-circle",
        3000
      );
    } catch (error) {
      console.error("Error fetching user data", error, error.response);
    }

    templates.value[index].loadingTrash = false;
  };
</script>

<template>
  <section>
    <!-- 👉 Widgets -->
    <div class="mb-6">
      <h2 class="text-h5 mb-0">Modelos Mensagens</h2>
      <p class="text-sm">
        Gerencie os modelos utilizados nas mensagens transacionais e de
        notificação enviadas através do WhatsApp.
      </p>
    </div>

    <VCard class="mb-6">
      <VCardText>
        <VRow>
          <!-- 👉 Search  -->
          <VCol cols="12">
            <AppTextField
              v-model="searchQuery"
              label="Pesquise um modelo"
              @update:model-value="getTemplates"
              placeholder="Pesquise por nome"
              density="compact"
            />
          </VCol>
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
          <VBtn prepend-icon="tabler-plus" @click="viewDialogModelo = true">
            Adicionar Modelo
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="templates"
        :items-length="totalTemplates"
        :headers="headers"
        class="text-no-wrap"
        @update:options="updateOptions"
        :loading="loading"
        loading-text="Carregando templates..."
        no-data-text="Nenhum modelo encontrado"
      >
        <!-- Slot: Created at -->
        <template #item.created_at="{ item }">
          {{ moment(item.created_at).format("DD/MM/YYYY HH:mm") }}
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn
            title="Editar segmentação"
            @click="openDialogModelo(item)"
            variant="tonal"
            color="warning"
            class="mr-2"
          >
            <VIcon
              :icon="item.isLoadingUser ? 'tabler-loader' : 'tabler-edit'"
            />
          </IconBtn>

          <IconBtn
            title="Excluir segmentação"
            @click="deleteUser(item)"
            variant="tonal"
            color="error"
          >
            <VIcon
              :icon="item.loadingTrash ? 'tabler-loader' : 'tabler-trash'"
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
              {{ paginationMeta({ page, itemsPerPage }, totalTemplates) }}
            </p>

            <VPagination
              v-model="page"
              :length="Math.ceil(totalTemplates / itemsPerPage)"
              :total-visible="
                $vuetify.display.xs
                  ? 1
                  : Math.ceil(totalTemplates / itemsPerPage) > 5
                  ? 5
                  : Math.ceil(totalTemplates / itemsPerPage)
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

    <modeloDialog
      :isDrawerOpen="viewDialogModelo"
      @update:isDrawerOpen="viewDialogModelo = $event"
      :modeloData="selectedModelo"
      @updateModelo="getTemplates"
    />
  </section>
</template>
