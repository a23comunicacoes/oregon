<script setup>
import { VDataTableServer } from "vuetify/labs/VDataTable";
import { paginationMeta } from "@api-utils/paginationMeta";
import segDialog from "@/views/apps/crm/segDialog.vue";

const router = useRouter();
const route = useRoute();

import { can } from "@layouts/plugins/casl";

if (!can("view", "crm_campanhas")) {
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

  getSeg();
};

// Headers
const headers = [
  {
    title: "Nome",
    key: "name",
  },
  {
    title: "Descrição",
    key: "description",
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

const segmentacoes = ref([]);
const totalSegmentacoes = ref(0);

const getSeg = async () => {
  loading.value = true;

  try {
    const res = await $api("/disparos/seg/list", {
      method: "GET",
      query: {
        q: searchQuery.value,
        itemsPerPage: itemsPerPage.value,
        page: page.value,
        sortBy: sortBy.value,
        orderBy: orderBy.value,
      },
    });

    if (!res) return;

    console.log("segmentacoes ress", res);

    segmentacoes.value = res.segmentacoes || [];
    totalSegmentacoes.value = res.totalSegmentacoes || 0;
  } catch (error) {
    console.error("Error fetching user data", error, error.response);

    segmentacoes.value = [];
    totalSegmentacoes.value = 0;
  }
  loading.value = false;
};

getSeg();

const selectedSegData = ref({});
const isViewSegDialog = ref(false);

const viewUser = async (item) => {
  let index = segmentacoes.value.findIndex((cliente) => cliente.id === item.id);
  segmentacoes.value[index].isLoadingUser = true;

  console.log("viewUser", item);
  try {
    const res = await $api(`/disparos/get-seg/${item.id}`, {
      method: "GET",
    });

    if (!res) return;

    console.log("selectedSegData", res);

    selectedSegData.value = res;
    isViewSegDialog.value = true;
  } catch (error) {
    console.error("Error fetching user data", error, error.response);
  }
};

watch(
  () => isViewSegDialog.value,
  (val) => {
    if (!val) {
      selectedSegData.value = {};
      for (let i = 0; i < segmentacoes.value.length; i++) {
        segmentacoes.value[i].isLoadingUser = false;
      }
    }
  }
);

const deleteUser = async (item) => {
  const confirmar = confirm(
    "Deseja realmente excluir essa segmentação? Essa ação não poderá ser desfeita!"
  );

  if (!confirmar) return;

  let index = segmentacoes.value.findIndex((cliente) => cliente.id === item.id);
  segmentacoes.value[index].loadingTrash = true;
  try {
    const res = await $api(`/disparos/seg/delete/${item.id}`, {
      method: "DELETE",
    });

    if (!res) return;

    console.log("deleteUser", res);

    getSeg();
    setAlert(
      "Segmentação excluída com sucesso",
      "success",
      "tabler-alert-circle",
      3000
    );
  } catch (error) {
    console.error("Error fetching user data", error, error.response);
  }

  segmentacoes.value[index].loadingTrash = false;
};

const formatValue = (value) => {
  if (!value) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};
</script>

<template>
  <h2 class="text-h5 mb-0">Segmentações ({{ totalSegmentacoes || 0 }})</h2>
  <p class="text-sm">Gerencie as segmentações de clientes. As segmentações são usadas para segmentar os clientes em campanhas.</p>

  <VCard class="mb-6">
    <VCardText>
      <AppTextField
        v-model="searchQuery"
        label="Pesquise uma segmentação"
        @update:model-value="getSeg"
        placeholder="Pesquise por nome ou campo"
        density="compact"
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

      <!-- 👉 Add user button -->
      <VBtn prepend-icon="tabler-plus" @click="isViewSegDialog = true">
        Adicionar segmentação
      </VBtn>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="segmentacoes"
      :items-length="totalSegmentacoes"
      :headers="headers"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando segmentacoes..."
      no-data-text="Nenhuma segmentação encontrada"
    >
      <template #item.description="{ item }">
        <p class="mb-0 text-truncate text-sm" style="max-width: 250px">
          {{ item.description }}
        </p>
      </template>

      <!-- Slot: Created at -->
      <template #item.created_at="{ item }">
        {{ moment(item.created_at).format("DD/MM/YYYY HH:mm") }}
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn
          title="Editar segmentação"
          @click="viewUser(item)"
          color="warning"
        >
          <VIcon :icon="item.isLoadingUser ? 'tabler-loader' : 'tabler-edit'" />
        </IconBtn>

        <IconBtn
          class="ms-2"
          title="Excluir segmentação"
          @click="deleteUser(item)"
          color="error"
        >
          <VIcon :icon="item.loadingTrash ? 'tabler-loader' : 'tabler-trash'" />
        </IconBtn>
      </template>

      <!-- pagination -->
      <template #bottom>
        <VDivider />
        <div
          class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
        >
          <p class="text-sm text-disabled mb-0">
            {{ paginationMeta({ page, itemsPerPage }, totalSegmentacoes) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalSegmentacoes / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : Math.ceil(totalSegmentacoes / itemsPerPage) > 5
                ? 5
                : Math.ceil(totalSegmentacoes / itemsPerPage)
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

  <segDialog
    :isDrawerOpen="isViewSegDialog"
    @update:isDrawerOpen="isViewSegDialog = $event"
    :segData="selectedSegData"
    @updateSeg="getSeg"
  />
</template>
