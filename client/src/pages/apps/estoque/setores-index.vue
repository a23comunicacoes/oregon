<script setup>
import { VDataTableServer } from "vuetify/labs/VDataTable";
import { paginationMeta } from "@api-utils/paginationMeta";
import SetorDialog from "@/views/apps/estoque/setorDialog.vue";
import { useAlert } from "@/composables/useAlert";
import moment from "moment";
import { can } from "@layouts/plugins/casl";

const { setAlert } = useAlert();
const loading = ref(true);
const router = useRouter();

if (!can("view", "estoque")) {
  setAlert(
    "Você não tem permissão para acessar esta página.",
    "error",
    "tabler-alert-triangle",
    3000
  );
  router.push("/");
}

onMounted(() => {
  getSetores();
});

// Store
const searchQuery = ref("");
const ativoFilter = ref(null);

// Data table options
const itemsPerPage = ref(10);
const page = ref(1);
const sortBy = ref();
const orderBy = ref();

const updateOptions = (options) => {
  page.value = options.page;
  sortBy.value = options.sortBy[0]?.key;
  orderBy.value = options.sortBy[0]?.order;

  getSetores();
};

// Headers
const headers = [
  {
    title: "Nome",
    key: "set_nome",
  },
  {
    title: "Descrição",
    key: "set_descricao",
  },
  {
    title: "Total de Produtos",
    key: "total_produtos",
    sortable: false,
  },
  {
    title: "Status",
    key: "set_ativo",
  },
  {
    title: "Ações",
    key: "actions",
    sortable: false,
  },
];

const setores = ref([]);
const totalSetores = ref(0);

const getSetores = async () => {
  loading.value = true;

  try {
    const res = await $api("/setores/list", {
      method: "GET",
      query: {
        q: searchQuery.value,
        ativo: ativoFilter.value,
        itemsPerPage: itemsPerPage.value,
        page: page.value,
        sortBy: sortBy.value,
        orderBy: orderBy.value,
      },
    });

    setores.value = res.setores ?? [];
    totalSetores.value = res?.totalSetores ?? 0;
  } catch (err) {
    console.error("Error fetching setores data", err, err.response);

    setores.value = [];
    totalSetores.value = 0;
  }

  loading.value = false;
};

const isAddNewSetorDrawerVisible = ref(false);
const selectedSetorData = ref({});

const editSetor = async (item) => {
  if (!can("edit", "estoque")) {
    setAlert(
      "Você não tem permissão para editar setores.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  try {
    const res = await $api(`/setores/get/${item.set_id}`, {
      method: "GET",
    });

    if (!res) return;

    selectedSetorData.value = res;
    isAddNewSetorDrawerVisible.value = true;
  } catch (error) {
    console.error("Error fetching setor data", error, error.response);

    setAlert(
      error.response?._data?.message ||
        "Ocorreu um erro ao buscar os dados do setor, tente novamente!",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }
};

const statusOptions = [
  { value: null, title: "Todos" },
  { value: 1, title: "Ativo" },
  { value: 0, title: "Inativo" },
];

const clearFilters = () => {
  searchQuery.value = "";
  ativoFilter.value = null;
  getSetores();
};
</script>

<template>
  <h2 class="text-h5 mb-0">Setores ({{ totalSetores ?? 0 }})</h2>
  <p class="mb-0 text-sm ml-auto">
    Gerencie os setores do estoque para organizar seus produtos.
  </p>

  <VCard class="mb-6 mt-6">
    <VCardText>
      <VRow class="align-center">
        <VCol cols="12" md="9">
          <AppTextField
            v-model="searchQuery"
            label="Pesquisar setores"
            placeholder="Pesquise por nome ou descrição"
            density="compact"
            clearable
            @update:model-value="getSetores"
          />
        </VCol>
        <VCol cols="12" md="3">
          <AppSelect
            v-model="ativoFilter"
            :items="statusOptions"
            label="Status"
            placeholder="Filtrar por status"
            @update:model-value="getSetores"
            clearable
            @click:clear="getSetores"
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

      <VBtn
        v-if="can('create', 'estoque')"
        color="primary"
        @click="isAddNewSetorDrawerVisible = true"
        class="ml-auto"
      >
        <VIcon icon="tabler-plus" class="mr-2" />
        Adicionar Setor
      </VBtn>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="setores"
      :items-length="totalSetores"
      :headers="headers"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando setores..."
    >
      <template #item.set_nome="{ item }">
        <div class="d-flex align-center">
          <VIcon icon="tabler-building" class="mr-2" size="20" />
          <p class="mb-0 font-weight-medium">{{ item.set_nome }}</p>
        </div>
      </template>

      <template #item.set_descricao="{ item }">
        <p class="mb-0 text-truncate" style="max-width: 300px">
          {{ item.set_descricao || "Sem descrição" }}
        </p>
      </template>

      <template #item.total_produtos="{ item }">
        <VChip
          :color="item.total_produtos > 0 ? 'primary' : 'default'"
          size="small"
          variant="tonal"
        >
          {{ item.total_produtos }} produto(s)
        </VChip>
      </template>

      <template #item.set_ativo="{ item }">
        <VChip
          :color="item.set_ativo == 1 ? 'success' : 'error'"
          label
          size="small"
          variant="flat"
        >
          {{ item.set_ativo == 1 ? "Ativo" : "Inativo" }}
        </VChip>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn title="Editar Setor" color="warning" @click="editSetor(item)">
          <VIcon icon="tabler-edit" />
        </IconBtn>
      </template>

      <!-- pagination -->
      <template #bottom>
        <VDivider />
        <div
          class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
        >
          <p class="text-sm text-disabled mb-0">
            {{ paginationMeta({ page, itemsPerPage }, totalSetores) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalSetores / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : totalSetores > 100
                ? 4
                : Math.ceil(totalSetores / itemsPerPage)
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

  <SetorDialog
    :isDrawerOpen="isAddNewSetorDrawerVisible"
    @update:isDrawerOpen="isAddNewSetorDrawerVisible = $event"
    :setorData="selectedSetorData"
    @updateSetores="getSetores"
  />
</template>

