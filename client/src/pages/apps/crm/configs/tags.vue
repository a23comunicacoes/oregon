<script setup>
import { VDataTableServer } from "vuetify/labs/VDataTable";
  import { paginationMeta } from "@api-utils/paginationMeta";
  import tagDialog from "@/views/apps/crm/tagDialog.vue";

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

    getTags();
  };

  // Headers
  const headers = [
    {
      title: "Tag",
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

  const tags = ref([]);
  const totalTags = ref(0);

  const getTags = async () => {
    loading.value = true;

    try {
      const res = await $api("/crm/list/tags", {
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

      console.log("tags ress", res);

      tags.value = res.tags;
      totalTags.value = res.totalTags;
    } catch (error) {
      console.error("Error fetching user data", error, error.response);

      tags.value = [];
      totalTags.value = 0;
    }
    loading.value = false;
  };

  getTags();

  const selectedtagData = ref({});
  const isViewTagDialog = ref(false);

  const viewUser = async (item) => {
    selectedtagData.value = { ...item };
    isViewTagDialog.value = true;
  };

  watch(
    () => isViewTagDialog.value,
    (val) => {
      if (!val) {
        selectedtagData.value = {};
        for (let i = 0; i < tags.value.length; i++) {
          tags.value[i].isLoadingUser = false;
        }
      }
    }
  );

  const deleteUser = async (item) => {
    const confirmar = confirm(
      "Deseja realmente excluir essa tag? Essa ação não poderá ser desfeita!"
    );

    if (!confirmar) return;

    let index = tags.value.findIndex((cliente) => cliente.id === item.id);
    tags.value[index].loadingTrash = true;

    try {
      const res = await $api(`/clientes/delete/tag/${item.id}`, {
        method: "DELETE",
      });

      if (!res) return;

      console.log("deleteUser", res);

      getTags();
      setAlert(
        "Tag excluída com sucesso",
        "success",
        "tabler-alert-circle",
        3000
      );
    } catch (error) {
      console.error("Error fetching user data", error, error.response);
    }

    tags.value[index].loadingTrash = false;
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
  <h2 class="text-h6 mb-1 mt-2">Tags</h2>
  <p class="text-sm">Gerencie as tags de clientes e negócios</p>

  <VCard class="mb-6">
    <VCardText>
      <VRow>
        <!-- 👉 Search  -->
        <VCol cols="12">
          <AppTextField
            v-model="searchQuery"
            label="Pesquise uma tag"
            @update:model-value="getTags"
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
        <VBtn prepend-icon="tabler-plus" @click="isViewTagDialog = true">
          Adicionar tag
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="tags"
      :items-length="totalTags"
      :headers="headers"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando tags..."
    >
      <!-- Slot: Tag -->
      <template #item.name="{ item }">
        <VChip
          size="small"
          :color="item.color ?? 'primary'"
          variant="flat"
          label
        >
          {{ item.name }}
        </VChip>
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
          :loading="item.isLoadingUser"
          color="warning"
          class="mr-2"
        >
          <VIcon icon="tabler-pencil" />
        </IconBtn>

        <IconBtn
          title="Excluir segmentação"
          @click="deleteUser(item)"
          :loading="loadingTrash"
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
            {{ paginationMeta({ page, itemsPerPage }, totalTags) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalTags / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : Math.ceil(totalTags / itemsPerPage) > 5
                ? 5
                : Math.ceil(totalTags / itemsPerPage)
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

  <tagDialog
    :isDrawerOpen="isViewTagDialog"
    @update:isDrawerOpen="isViewTagDialog = $event"
    :tagData="selectedtagData"
    @updateTag="getTags"
  />
</template>
