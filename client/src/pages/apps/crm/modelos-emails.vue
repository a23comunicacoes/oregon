<script setup>
import { VDataTableServer } from "vuetify/labs/VDataTable";
  import { paginationMeta } from "@api-utils/paginationMeta";
  import modeloDialog from "@/views/apps/crm/modeloDialogEmail.vue";
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
          type: "email",
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

  let refSelected = {
    name: "",
    content: {
      subject: "",
      html: null,
      json: null,
      css: null,
      inlinedHtml: null,
    },
  };

  const viewDialogModelo = ref(false);
  const selectedModelo = ref(refSelected);

  const openDialogModelo = (item) => {
    selectedModelo.value = item;
    viewDialogModelo.value = true;
  };

  const closeDialogModelo = () => {
    selectedModelo.value = refSelected;
    viewDialogModelo.value = false;
  };

  watch(
    () => viewDialogModelo.value,
    (newValue) => {
      if (!newValue) {
        selectedModelo.value = refSelected;
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

  const variaveisItens = ref([]);

  const getVariaveis = async () => {
    loading.value = true;

    try {
      const res = await $api("/disparos/variaveis", {
        method: "GET",
      });

      if (!res) return;

      console.log("variaveis ress", res);

      variaveisItens.value = res;
    } catch (error) {
      console.error("Error fetching user data", error, error.response);

      variaveisItens.value = [];
    }
    loading.value = false;
  };

  getVariaveis();

  const loadingSave = ref(false);

  const saveModelo = async () => {
    if (!selectedModelo.value.name) {
      setAlert(
        "Informe o nome do modelo",
        "error",
        "tabler-alert-circle",
        3000
      );
      return;
    }

    if (
      !selectedModelo.value.content?.html ||
      !selectedModelo.value.content?.json ||
      !selectedModelo.value.content?.inlinedHtml
    ) {
      setAlert(
        "Informe o conteúdo do modelo",
        "error",
        "tabler-alert-circle",
        3000
      );
      return;
    }

    if (!selectedModelo.value.content?.subject) {
      setAlert(
        "Informe o assunto do email",
        "error",
        "tabler-alert-circle",
        3000
      );
      return;
    }

    loadingSave.value = true;

    console.log("modelo save", selectedModelo.value);

    try {
      const res = await $api("/templates", {
        method: selectedModelo.value?.id ? "PUT" : "POST",
        body: {
          ...selectedModelo.value,
          type: "email",
        },
      });

      if (!res) return;

      console.log("modelo ress", res);

      setAlert(
        !selectedModelo.value?.id
          ? "Modelo cadastrado com sucesso!"
          : "Modelo editado com sucesso!",
        "success",
        "tabler-alert-circle",
        3000
      );

      closeDialogModelo();
      getTemplates();
    } catch (error) {
      console.error("Error saving modelo data", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao salvar o modelo. Tente novamente.",
        "error",
        "tabler-alert-circle",
        3000
      );
    }
    loadingSave.value = false;
  };
</script>

<template>
  <section>
    <!-- 👉 Widgets -->
    <div class="mb-6">
      <h2 class="text-h5 mb-0">Modelos de Emails</h2>
      <p class="text-sm">
        Gerencie os modelos utilizados nos emails transacionais e de notificação
        enviados aos clientes.
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
          <VBtn
            prepend-icon="tabler-plus"
            @click="openDialogModelo(refSelected)"
          >
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

    <VDialog
      v-model="viewDialogModelo"
      :persistent="selectedModelo"
      :max-width="selectedModelo?.viewContent ? '100%' : '700'"
    >
      <VCard v-if="selectedModelo">
        <VCardText>
          <AppDrawerHeaderSection
            customClass="pa-0"
            :title="selectedModelo?.id ? 'Editar Modelo' : 'Adicionar Modelo'"
            @cancel="closeDialogModelo"
          />

          <VRow class="mt-3">
            <VCol cols="12">
              <AppTextField
                v-model="selectedModelo.name"
                label="Nome do modelo"
                placeholder="Ex.: Confirmação de pedido"
                :rules="[requiredValidator]"
                required
              />
            </VCol>

            <VCol cols="12">
              <AppTextField
                v-model="selectedModelo.content.subject"
                label="Assunto do email"
                placeholder="Ex.: Seu pedido foi confirmado"
                :rules="[requiredValidator]"
                required
              />
            </VCol>

            <VCol cols="12">
              <label
                class="v-label mb-1 text-body-2 text-high-emphasis"
                for="app-text-field-Nome do modelo-e601o"
              >
                Conteúdo do modelo
              </label>

              <VBtn
                class="ml-2"
                variant="tonal"
                color="primary"
                @click="
                  selectedModelo.viewContent = !selectedModelo.viewContent
                "
              >
                {{
                  selectedModelo.viewContent ? "Fechar editor" : "Abrir editor"
                }}
              </VBtn>
            </VCol>
          </VRow>

          <div class="d-flex flex-row gap-3 justify-center align-center mt-4">
            <VBtn
              color="primary"
              variant="tonal"
              @click="closeDialogModelo"
              :disabled="loadingSave"
            >
              <VIcon icon="tabler-x" class="me-2" />
              Cancelar
            </VBtn>

            <VBtn @click="saveModelo" :loading="loadingSave">
              <VIcon icon="tabler-check" class="me-2" />
              Salvar
            </VBtn>
          </div>
        </VCardText>
      </VCard>

      <VDialog v-model="selectedModelo.viewContent" fullscreen>
        <modeloDialog
          :variables="variaveisItens"
          :modelJson="selectedModelo.content?.json"
          @save="
            selectedModelo.content = {
              ...selectedModelo.content,
              ...$event,
            };
            console.log($event);
            selectedModelo.viewContent = false;
          "
        />
      </VDialog>
    </VDialog>
  </section>
</template>
