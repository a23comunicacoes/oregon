<script setup>
import { VDataTableServer } from "vuetify/labs/VDataTable";
import { paginationMeta } from "@api-utils/paginationMeta";
import OrdemRetiradaDialog from "@/views/apps/estoque/ordemRetiradaDialog.vue";
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
  getOrdens();
});

// Store
const searchQuery = ref("");
const dataDe = ref("");
const dataAte = ref("");
const funcionarioFilter = ref(null);
const lancadoPorFilter = ref(null);

const funcionarios = ref([]);
const searchFuncionarioQuery = ref("");
const getFuncionarios = async () => {
  try {
    const res = await $api("/users/list", {
      method: "GET",
      query: {
        q: searchFuncionarioQuery.value,
        itemsPerPage: 40,
      },
    });

    console.log("Users", res.users);

    funcionarios.value = res.users;
  } catch (error) {
    console.error("Error fetching users", error, error.response);
    funcionarios.value = [];
  }
};

getFuncionarios();
// Data table options
const itemsPerPage = ref(10);
const page = ref(1);
const sortBy = ref();
const orderBy = ref();

const updateOptions = (options) => {
  page.value = options.page;
  sortBy.value = options.sortBy[0]?.key;
  orderBy.value = options.sortBy[0]?.order;

  getOrdens();
};

// Headers
const headers = [
  {
    title: "Data",
    key: "or_data",
  },
  {
    title: "Produto",
    key: "prod_nome",
  },
  {
    title: "Quantidade",
    key: "or_quantidade",
  },
  {
    title: "Funcionário",
    key: "funcionario_nome",
  },
  {
    title: "Motivo",
    key: "or_motivo",
  },
  {
    title: "Criado em",
    key: "created_at",
  },
  {
    title: "Ações",
    key: "actions",
    sortable: false,
  },
];

const ordens = ref([]);
const totalOrdens = ref(0);

const getOrdens = async () => {
  loading.value = true;

  try {
    const res = await $api("/ordens-retirada/list", {
      method: "GET",
      query: {
        q: searchQuery.value,
        dataDe: dataDe.value,
        dataAte: dataAte.value,
        funcionario: funcionarioFilter.value,
        lancadoPor: lancadoPorFilter.value,
        itemsPerPage: itemsPerPage.value,
        page: page.value,
        sortBy: sortBy.value,
        orderBy: orderBy.value,
      },
    });

    ordens.value = res.ordens ?? [];
    totalOrdens.value = res?.totalOrdens ?? 0;
  } catch (err) {
    console.error("Error fetching ordens data", err, err.response);

    ordens.value = [];
    totalOrdens.value = 0;
  }

  loading.value = false;
};

const isAddNewOrdemDrawerVisible = ref(false);
const selectedOrdemData = ref({});

const editOrdem = async (item) => {
  if (!can("edit", "estoque")) {
    setAlert(
      "Você não tem permissão para editar ordens.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  try {
    const res = await $api(`/ordens-retirada/get/${item.or_id}`, {
      method: "GET",
    });

    if (!res) return;

    selectedOrdemData.value = res;
    isAddNewOrdemDrawerVisible.value = true;
  } catch (error) {
    console.error("Error fetching ordem data", error, error.response);

    setAlert(
      error.response?._data?.message ||
        "Ocorreu um erro ao buscar os dados da ordem, tente novamente!",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }
};

const formatDate = (date) => {
  if (!date) return "";
  return moment(date).format("DD/MM/YYYY");
};

const clearFilters = () => {
  searchQuery.value = "";
  dataDe.value = "";
  dataAte.value = "";
  getOrdens();
};
</script>

<template>
  <h2 class="text-h5 mb-0">Ordens de Retirada ({{ totalOrdens ?? 0 }})</h2>
  <p class="mb-0 text-sm ml-auto">
    Gerencie as retiradas de produtos do estoque.
  </p>

  <VCard class="mb-6 mt-6">
    <VCardText>
      <VRow class="align-center">
        <VCol cols="12">
          <AppTextField
            v-model="searchQuery"
            label="Pesquisar"
            placeholder="Pesquise por produto, funcionário ou motivo"
            density="compact"
            clearable
            @update:model-value="getOrdens"
          />
        </VCol>
        <VCol cols="12" md="3">
          <AppSelect
            v-model="funcionarioFilter"
            :items="funcionarios"
            label="Funcionário"
            placeholder="Filtrar por funcionário"
            item-title="fullName"
            item-value="id"
            @update:model-value="getOrdens"
            clearable
          >
            <template #prepend-item>
              <VTextField
                v-model="searchFuncionarioQuery"
                class="mx-2"
                placeholder="Pesquisar funcionário..."
                density="compact"
                clearable
                @update:model-value="getFuncionarios"
              />
            </template>
          </AppSelect>
        </VCol>
        <VCol cols="12" md="3">
          <AppSelect
            v-model="lancadoPorFilter"
            :items="funcionarios"
            label="Lançado por"
            placeholder="Filtrar por lançado por"
            item-title="fullName"
            item-value="id"
            @update:model-value="getOrdens"
            clearable
          >
            <template #prepend-item>
              <VTextField
                v-model="searchLancadoPorQuery"
                class="mx-2"
                placeholder="Pesquisar lançado por..."
                density="compact"
                clearable
                @update:model-value="getFuncionarios"
              />
            </template>
          </AppSelect>
        </VCol>
        <VCol cols="12" md="3">
          <AppTextField
            v-model="dataDe"
            label="Data De"
            type="date"
            density="compact"
            @update:model-value="getOrdens"
            clearable
          />
        </VCol>
        <VCol cols="12" md="3">
          <AppTextField
            v-model="dataAte"
            label="Data Até"
            type="date"
            density="compact"
            @update:model-value="getOrdens"
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

      <VBtn
        v-if="can('create', 'estoque')"
        color="error"
        @click="isAddNewOrdemDrawerVisible = true"
        class="ml-auto"
      >
        <VIcon icon="tabler-minus" class="mr-2" />
        Nova Ordem de Retirada
      </VBtn>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="ordens"
      :items-length="totalOrdens"
      :headers="headers"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando ordens..."
    >
      <template #item.or_data="{ item }">
        <div class="d-flex align-center">
          <VIcon icon="tabler-calendar" class="mr-2" size="18" />
          {{ formatDate(item.or_data) }}
        </div>
      </template>

      <template #item.prod_nome="{ item }">
        <div>
          <p class="mb-0 font-weight-medium">{{ item.prod_nome }}</p>
          <p class="mb-0 text-caption text-disabled" v-if="item.prod_sku">
            SKU: {{ item.prod_sku }}
          </p>
        </div>
      </template>

      <template #item.or_quantidade="{ item }">
        <VChip color="error" size="small" variant="tonal">
          -{{ item.or_quantidade }}
        </VChip>
      </template>

      <template #item.funcionario_nome="{ item }">
        <div class="d-flex align-center" v-if="item.funcionario_nome">
          <VIcon icon="tabler-user" class="mr-2" size="18" />
          {{ item.funcionario_nome }}
        </div>
        <span v-else class="text-disabled">-</span>
      </template>

      <template #item.or_motivo="{ item }">
        <p class="mb-0 text-truncate" style="max-width: 250px">
          {{ item.or_motivo || "-" }}
        </p>
      </template>

      <template #item.created_at="{ item }">
        <p class="mb-0 text-sm">
          <VIcon icon="tabler-calendar" class="mr-1" />
          {{ moment(item.created_at).format("DD/MM/YYYY HH:mm") }}
        </p>
          <p class="mb-0 text-sm" v-if="item.usuario">
            <VIcon icon="tabler-user" class="mr-1" />
            {{ item.usuario.fullName }}
          </p>
       
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn title="Ver Detalhes" color="info" @click="editOrdem(item)">
          <VIcon icon="tabler-eye" />
        </IconBtn>
      </template>

      <!-- pagination -->
      <template #bottom>
        <VDivider />
        <div
          class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
        >
          <p class="text-sm text-disabled mb-0">
            {{ paginationMeta({ page, itemsPerPage }, totalOrdens) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalOrdens / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : totalOrdens > 100
                ? 4
                : Math.ceil(totalOrdens / itemsPerPage)
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

  <OrdemRetiradaDialog
    :isDrawerOpen="isAddNewOrdemDrawerVisible"
    @update:isDrawerOpen="isAddNewOrdemDrawerVisible = $event"
    :ordemData="selectedOrdemData"
    @updateOrdens="getOrdens"
  />
</template>

