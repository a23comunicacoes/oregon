<script setup>
import { VDataTableServer } from "vuetify/labs/VDataTable";
import { paginationMeta } from "@api-utils/paginationMeta";
import EstoqueDialog from "@/views/apps/estoque/estoqueDialog.vue";
import { useAlert } from "@/composables/useAlert";
import moment from "moment";
import { can } from "@layouts/plugins/casl";

import { useFunctions } from "@/composables/useFunctions";
const { debounce } = useFunctions();

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

const setores = ref([]);
const searchSetoresQuery = ref("");
const getSetores = async () => {
  try {
    const res = await $api("/setores/list", {
      method: "GET",
      query: {
        q: searchSetoresQuery.value,
        ativo: true,
        itemsPerPage: 20,
      },
    });

    console.log("res setores", res);

    if (!res) return;
    setores.value = res.setores ?? [];
  } catch (err) {
    console.error("Error fetching setores data", err, err.response);

    setores.value = [];
  }

  loading.value = false;
};

onMounted(() => {
  getProdutos();
  getSetores();
});

// Store
const searchQuery = ref("");
const ativoFilter = ref(null);
const estoqueBaixoFilter = ref(false);
const setorFilter = ref(null);
const quantidadeFilter = ref([null, null]);

// Data table options
const itemsPerPage = ref(10);
const page = ref(1);
const sortBy = ref();
const orderBy = ref();

const updateOptions = (options) => {
  page.value = options.page;
  sortBy.value = options.sortBy[0]?.key;
  orderBy.value = options.sortBy[0]?.order;

  getProdutos();
};

// Headers
const headers = [
  {
    title: "Nome",
    key: "prod_nome",
  },
  {
    title: "Valor",
    key: "prod_valor",
  },
  {
    title: "Quantidade",
    key: "prod_quantidade",
  },
  {
    title: "Setor",
    key: "prod_setor_id",
  },
  {
    title: "Ações",
    key: "actions",
    sortable: false,
  },
];

const produtos = ref([]);
const totalProdutos = ref(0);

const getProdutos = async () => {
  loading.value = true;

  console.log("Fetching produtos with:", {
    q: searchQuery.value,
    ativo: ativoFilter.value,
    estoqueBaixo: estoqueBaixoFilter.value,
    quantidadeMin: quantidadeFilter.value?.[0] ?? null,
    quantidadeMax: quantidadeFilter.value?.[1] ?? null,
    itemsPerPage: itemsPerPage.value,
    page: page.value,
    sortBy: sortBy.value,
    orderBy: orderBy.value,
    setorId: setorFilter.value,
  });

  try {
    const res = await $api("/estoque/list", {
      method: "GET",
      query: {
        q: searchQuery.value,
        ativo: ativoFilter.value,
        estoqueBaixo: estoqueBaixoFilter.value,
        quantidadeMin: quantidadeFilter.value?.[0] ?? null,
        quantidadeMax: quantidadeFilter.value?.[1] ?? null,
        itemsPerPage: itemsPerPage.value,
        setorId: setorFilter.value,
        page: page.value,
        sortBy: sortBy.value,
        orderBy: orderBy.value,
      },
    });

    console.log("res produtos", res);

    produtos.value = res.produtos ?? [];
    totalProdutos.value = res?.totalProdutos ?? 0;
  } catch (err) {
    console.error("Error fetching produtos data", err, err.response);

    produtos.value = [];
    totalProdutos.value = 0;
  }

  loading.value = false;
};

const debouncedGetProdutos = debounce(getProdutos, 500);

const isAddNewProdutoDrawerVisible = ref(false);
const selectedProdutoData = ref({});

const editProduto = async (item) => {
  if (!can("edit", "estoque")) {
    setAlert(
      "Você não tem permissão para editar produtos.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  try {
    const res = await $api(`/estoque/get/${item.prod_id}`, {
      method: "GET",
    });

    if (!res) return;

    console.log("res edit", res);

    selectedProdutoData.value = res;
    isAddNewProdutoDrawerVisible.value = true;
  } catch (error) {
    console.error("Error fetching produto data", error, error.response);

    setAlert(
      error.response?._data?.message ||
        "Ocorreu um erro ao buscar os dados do produto, tente novamente!",
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

const formatDate = (date) => {
  if (!date) return "";
  return moment(date).format("DD/MM/YYYY");
};

const statusOptions = [
  { value: null, title: "Todos" },
  { value: 1, title: "Ativo" },
  { value: 0, title: "Inativo" },
];

const clearFilters = () => {
  searchQuery.value = "";
  ativoFilter.value = null;
  estoqueBaixoFilter.value = false;
  quantidadeFilter.value = [null, null];
  setorFilter.value = null;
  getProdutos();
};
</script>

<template>
  <h2 class="text-h5 mb-0">Estoque ({{ totalProdutos ?? 0 }})</h2>
  <p class="mb-0 text-sm ml-auto">
    Gerencie o estoque de produtos e configure alertas de estoque baixo.
  </p>

  <VCard class="mb-6 mt-6">
    <VCardText>
      <VRow class="align-center">
        <VCol cols="12" md="9">
          <AppTextField
            v-model="searchQuery"
            label="Pesquisar produtos"
            placeholder="Pesquise por nome, descrição ou valor"
            density="compact"
            clearable
            @update:model-value="debouncedGetProdutos"
          />
        </VCol>
        <VCol cols="12" md="3">
          <AppSelect
            v-model="setorFilter"
            :items="setores"
            label="Setor"
            placeholder="Filtrar por setor"
            item-title="set_nome"
            item-value="set_id"
            @update:model-value="debouncedGetProdutos"
            clearable
            @click:clear="getProdutos"
          />
        </VCol>
        <VCol cols="12" md="4">
          <AppSelect
            v-model="ativoFilter"
            :items="statusOptions"
            label="Status"
            placeholder="Filtrar por status"
            @update:model-value="debouncedGetProdutos"
            clearable
            @click:clear="getProdutos"
          />
        </VCol>
        <VCol cols="12" md="4">
          <label class="v-label mb-1 text-body-2 text-high-emphasis">
            Quantidade
          </label>
          <v-range-slider
            v-model="quantidadeFilter"
            strict
            :min="0"
            :max="1000"
            :step="1"
            @update:model-value="debouncedGetProdutos"
          >
            <template v-slot:prepend>
              <VTextField
                v-model="quantidadeFilter[0]"
                style="width: 70px"
                readonly
                placeholder="0"
              />
            </template>
            <template v-slot:append>
              <VTextField
                v-model="quantidadeFilter[1]"
                style="width: 70px"
                readonly
                placeholder="1000"
              />
            </template>
          </v-range-slider>
        </VCol>
        <VCol cols="12" md="3">
          <VSwitch
            v-model="estoqueBaixoFilter"
            label="Apenas estoque baixo"
            color="error"
            @update:model-value="debouncedGetProdutos"
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
        @click="isAddNewProdutoDrawerVisible = true"
        class="ml-auto"
      >
        <VIcon icon="tabler-plus" class="mr-2" />
        Adicionar Produto
      </VBtn>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="produtos"
      :items-length="totalProdutos"
      :headers="headers"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando produtos..."
    >
      <template #item.prod_nome="{ item }">
        <div class="d-flex align-center">
          <p class="mb-0 font-weight-medium">{{ item.prod_nome }}</p>
          <VIcon
            v-if="item.estoque_baixo"
            icon="tabler-alert-triangle-filled"
            color="error"
            size="16"
            class="ml-1"
          />

          <VTooltip activator="parent" v-if="item.estoque_baixo">
            Estoque do produto abaixo de {{ item.prod_limiar }}
          </VTooltip>
        </div>

        <p
          class="mb-0 text-truncate text-caption text-disabled"
          style="max-width: 200px"
        >
          {{ item.prod_descricao || "Sem descrição" }}
        </p>
      </template>

      <template #item.prod_valor="{ item }">
        {{ formatValor(item.prod_valor) }}
      </template>

      <template #item.prod_quantidade="{ item }">
        <div class="d-flex align-center">
          <span class="font-weight-medium">{{ item.prod_quantidade }}</span>
          <VIcon
            v-if="item.estoque_baixo"
            icon="tabler-alert-triangle"
            color="error"
            size="16"
            class="ml-1"
          />

          <VTooltip activator="parent" v-if="item.estoque_baixo">
            Estoque do produto abaixo de {{ item.prod_limiar }}
          </VTooltip>
        </div>
      </template>

      <template #item.prod_setor_id="{ item }">
        <p class="mb-0 text-truncate">
          {{ item.setor?.set_nome || "-" }}
        </p>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          title="Editar Produto"
          color="warning"
          @click="editProduto(item)"
        >
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
            {{ paginationMeta({ page, itemsPerPage }, totalProdutos) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalProdutos / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : totalProdutos > 100
                ? 4
                : Math.ceil(totalProdutos / itemsPerPage)
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

  <EstoqueDialog
    :isDrawerOpen="isAddNewProdutoDrawerVisible"
    @update:isDrawerOpen="isAddNewProdutoDrawerVisible = $event"
    :produtoData="selectedProdutoData"
    @updateProdutos="getProdutos"
  />
</template>
