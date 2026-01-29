<script setup>
import { VDataTableServer } from "vuetify/labs/VDataTable";
import { paginationMeta } from "@api-utils/paginationMeta";
import { socket } from "@/composables/useSocket";
import moment from "moment";
import { can } from "@layouts/plugins/casl";

import relatoriosDialog from "@/views/apps/crm/relatoriosCampanhaDialog.vue";

const { setAlert } = useAlert();

const router = useRouter();
const loading = ref(false);

if (!can("view", "crm_modelos_mensagens")) {
  setAlert(
    "Você não tem permissão para acessar esta página.",
    "error",
    "tabler-alert-triangle",
    3000
  );
  router.push("/");
}

// 👉 Store
const searchQuery = ref("");

const dataEnvioDeQuery = ref(null);
const dataEnvioAteQuery = ref(null);

const segmentacaoQuery = ref(null);
const segmentacoesItens = ref([]);

// Data table options
const itemsPerPage = ref(10);
const page = ref(1);
const sortBy = ref();
const orderBy = ref();

const updateOptions = (options) => {
  page.value = options.page;
  sortBy.value = options.sortBy[0]?.key;
  orderBy.value = options.sortBy[0]?.order;

  getCampanhas();
};

// Headers
const headers = [
  {
    title: "Nome",
    key: "name",
  },
  {
    title: "Status",
    key: "status",
  },
  {
    title: "Envio",
    key: "data_envio",
  },
  {
    title: "Segmentação",
    key: "segmentacao",
    sortable: false,
  },
  {
    title: "Ações",
    key: "actions",
    sortable: false,
  },
];

const campanhas = ref([]);
const totalCampanhas = ref(0);

const getCampanhas = async () => {
  loading.value = true;

  try {
    const res = await $api("/disparos/campanhas/list", {
      method: "GET",
      query: {
        q: searchQuery.value,
        dataDe: dataEnvioDeQuery.value,
        dataAte: dataEnvioAteQuery.value,
        segmentacao: segmentacaoQuery.value,
        itemsPerPage: itemsPerPage.value,
        page: page.value,
        sortBy: sortBy.value,
        orderBy: orderBy.value,
      },
    });

    if (!res) return;

    console.log("campanhas ress", res);

    campanhas.value = res.campanhas;
    totalCampanhas.value = res.totalCampanhas;
    segmentacoesItens.value = res.allSegmentacoes.map((item) => ({
      value: item.id,
      title: item.name,
    }));
  } catch (error) {
    console.error("Error fetching user data", error, error.response);

    campanhas.value = [];
    totalCampanhas.value = 0;
  }
  loading.value = false;
};

getCampanhas();

const viewUser = async (item) => {
  let index = campanhas.value.findIndex((cliente) => cliente.id === item.id);
  campanhas.value[index].isLoadingUser = true;

  router.push(`/crm/campanha/${item.id}`);

  campanhas.value[index].isLoadingUser = false;
};

const deleteUser = async (item) => {
  const confirmar = confirm(
    "Deseja realmente excluir essa campanha? Essa ação não poderá ser desfeita!"
  );

  if (!confirmar) return;

  let index = campanhas.value.findIndex((cliente) => cliente.id === item.id);
  campanhas.value[index].loadingTrash = true;
  try {
    const res = await $api(`/disparos/campanhas/delete/${item.id}`, {
      method: "DELETE",
    });

    if (!res) return;

    console.log("deleteUser", res);

    getCampanhas();
    setAlert(
      "Campanha excluída com sucesso",
      "success",
      "tabler-alert-circle",
      3000
    );
  } catch (error) {
    console.error("Error fetching user data", error, error.response);
  }
};

const duplicarCampanha = async (item) => {
  let index = campanhas.value.findIndex((cliente) => cliente.id === item.id);
  campanhas.value[index].isLoadingCopy = true;

  try {
    const res = await $api(`/disparos/campanhas/duplicate/${item.id}`, {
      method: "GET",
    });

    if (!res) return;

    console.log("duplicarCampanha", res);

    setAlert(
      "Campanha duplicada com sucesso",
      "success",
      "tabler-alert-circle",
      3000
    );
    router.push(`/crm/campanha/${res.id}`);
  } catch (error) {
    console.error("Error duplicating campaign", error, error.response);
  } finally {
    campanhas.value[index].isLoadingCopy = false;
  }
};

const formatValue = (value) => {
  if (!value) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

onMounted(() => {
  socket.on("atualizacampanha", async (campanha) => {
    console.log("atualizacampanha", campanha);

    let id = campanha.id;

    let index = campanhas.value.findIndex((cliente) => cliente.id === id);

    //Se não encontrar o cliente, não faz nada
    if (index === -1) {
      return;
    }

    const res = await $api("/disparos/campanhas/list", {
      method: "GET",
      query: {
        i: id,
      },
    });

    if (!res) return;

    console.log("campanhas res socket", res);

    campanhas.value[index] = res.campanhas[0];
  });
});

onUnmounted(() => {
  socket.off("atualizacampanha");
});

const isViewRelatorioDialog = ref(false);
const selectedDataLog = ref({});

const viewRelatorios = (item) => {
  console.log("viewRelatorios", item);

  let dataLog = item.dataLog || [];
  dataLog.enviosSucesso = dataLog.messagesLog.filter(
    (msg) => msg.sucesso == 1
  ).length;
  dataLog.enviosErro = dataLog.messagesLog.filter(
    (msg) => msg.sucesso == 0
  ).length;
  dataLog.totalMsgs = dataLog.messagesLog.length;
  dataLog.name = item.name;
  /*  let selected = {
      enviosSucesso: dataLog.messagesLog.filter((msg) => msg.sucesso == true)
        .length,
      enviosErro: dataLog.messagesLog.filter((msg) => msg.sucesso == false).length,
      totalMsgs: dataLog.messagesLog.length,
      name:  item.name,
    }; */
  /* selectedDataLog.value = item.dataLog;
    selectedDataLog.value.name = item.name; */
  selectedDataLog.value = {
    dataLog,
    campanha: item,
  };
  isViewRelatorioDialog.value = true;
};

watch(
  () => isViewRelatorioDialog,
  (newVal) => {
    if (!newVal) {
      selectedDataLog.value = {};
    }
  }
);

const handlePlay = async (item) => {
  let index = campanhas.value.findIndex((cliente) => cliente.id === item.id);
  campanhas.value[index].isLoadingPlay = true;

  try {
    const res = await $api(`/disparos/campanhas/handlePlay/${item.id}`, {
      method: "PUT",
    });

    if (!res) return;

    console.log("handlePlay", res);

    setAlert(
      `Campanha ${item.play ? "pausada" : "retomada"} com sucesso`,
      "success",
      "tabler-alert-circle",
      3000
    );
    getCampanhas();
  } catch (error) {
    console.error("Error handling play campaign", error, error.response);
  } finally {
    campanhas.value[index].isLoadingPlay = false;
  }
};
</script>

<template>
  <section>
    <!-- 👉 Widgets -->
    <div class="mb-6">
      <h2 class="text-h4 mb-0">Campanhas</h2>
      <p class="text-muted">
        Campanhas de disparo, gerencie, crie ou visualize campanhas criadas.
      </p>
    </div>

    <VCard class="mb-6">
      <VCardText>
        <VRow>
          <!-- 👉 Search  -->
          <VCol cols="12" sm="8">
            <AppTextField
              v-model="searchQuery"
              label="Pesquise uma campanha"
              @update:model-value="getCampanhas"
              placeholder="Pesquise por nome"
              density="compact"
            />
          </VCol>

          <!-- 👉 Segmentação  -->
          <VCol cols="12" sm="4">
            <AppSelect
              v-model="segmentacaoQuery"
              label="Segmentação"
              :items="segmentacoesItens"
              @update:model-value="getCampanhas"
              placeholder="Selecione uma segmentação"
              density="compact"
            />
          </VCol>

          <!-- 👉 Data Envio  -->
          <VCol cols="12" sm="6">
            <AppTextField
              v-model="dataEnvioDeQuery"
              label="Data do disparo de"
              placeholder="Digite a data de envio"
              density="compact"
              clearable
              type="date"
              @update:model-value="getCampanhas"
            />
          </VCol>

          <VCol cols="12" sm="6">
            <AppTextField
              v-model="dataEnvioAteQuery"
              label="Data do disparo até"
              placeholder="Digite a data de envio"
              density="compact"
              clearable
              type="date"
              @update:model-value="getCampanhas"
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
            @click="router.push('/crm/campanha')"
            color="primary"
          >
            Adicionar campanha
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="campanhas"
        :items-length="totalCampanhas"
        :headers="headers"
        class="text-no-wrap"
        @update:options="updateOptions"
        :loading="loading"
        loading-text="Carregando campanhas..."
      >
        <template #item.name="{ item }">
          <p
            class="mb-0 font-weight-bold text-truncate"
            style="max-width: 300px"
          >
            {{ item.name }}
          </p>
          <p
            v-if="item.description && item.description != ''"
            class="mb-0 text-sm text-truncate"
            style="max-width: 300px"
          >
            {{ item.description }}
          </p>
        </template>

        <!-- Slot: Status -->
        <template #item.status="{ item }">
          <VChip
            :color="
              item?.status?.includes('Realizando')
                ? 'info'
                : item?.status?.includes('Erro')
                ? 'error'
                : item?.status?.includes('Concluído')
                ? 'success'
                : item?.status?.includes('Rascunho')
                ? 'secondary'
                : 'warning'
            "
            label
          >
            <VIcon
              :icon="
                item?.status?.includes('Realizando')
                  ? 'tabler-loader'
                  : item?.status?.includes('Erro')
                  ? 'tabler-alert-triangle'
                  : item?.status?.includes('Concluído')
                  ? 'tabler-check'
                  : item?.status?.includes('Rascunho')
                  ? 'tabler-pencil'
                  : 'tabler-clock'
              "
              spin
              class="mr-1"
            />
            {{ item.status }}
          </VChip>
        </template>

        <!-- Slot: Created at -->
        <template #item.data_envio="{ item }">
          {{
            moment(item.data_envio + " " + item.hora_envio).format(
              "DD/MM/YYYY HH:mm"
            )
          }}
        </template>

        <!-- Slot: Segmentação -->
        <template #item.segmentacao="{ item }">
          <p class="mb-0 mt-1 text-sm font-weight-bold">
            {{ item.segmentacao.name }}
          </p>
          <p class="mb-1 text-sm">
            <VIcon icon="tabler-users" class="mr-1" />
            {{ item.segmentacao.totalUsers?.total || 0 }}
            <VIcon icon="tabler-brand-whatsapp" class="mx-1" />
            {{ item.segmentacao.totalUsers?.totalWhatsapp || 0 }}
            <VIcon icon="tabler-mail" class="ml-1" />
            {{ item.segmentacao.totalUsers?.totalEmails || 0 }}
          </p>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-2 flex-row align-center">
            <IconBtn
              @click="viewRelatorios(item)"
              v-if="item.dataLog"
              color="info"
            >
              <VIcon
                :icon="
                  item.isLoadingRelatorios
                    ? 'tabler-loader'
                    : 'tabler-chart-bar'
                "
              />

              <VTooltip activator="parent">
                <span>Relatórios da Campanha</span>
              </VTooltip>
            </IconBtn>

            <IconBtn
              @click="viewUser(item)"
              v-if="!item?.status?.includes('Realizando')"
              color="warning"
            >
              <VIcon
                :icon="item.isLoadingUser ? 'tabler-loader' : 'tabler-edit'"
              />

              <VTooltip activator="parent">
                <span>Editar Campanha</span>
              </VTooltip>
            </IconBtn>

            <IconBtn
              @click="handlePlay(item)"
              v-if="
                item?.status?.includes('Realizando') ||
                item?.status?.includes('Pausada')
              "
              :color="item.play ? 'error' : 'success'"
            >
              <VIcon
                :icon="
                  item.isLoadingPlay
                    ? 'tabler-loader'
                    : item.play
                    ? 'tabler-pause'
                    : 'tabler-play'
                "
              />

              <VTooltip activator="parent">
                <span>
                  {{ item.play ? "Pausar Campanha" : "Retomar Campanha" }}
                </span>
              </VTooltip>
            </IconBtn>

            <IconBtn @click="duplicarCampanha(item)" color="primary">
              <VIcon
                :icon="item.isLoadingCopy ? 'tabler-loader' : 'tabler-copy'"
              />

              <VTooltip activator="parent">
                <span>Duplicar Campanha</span>
              </VTooltip>
            </IconBtn>

            <IconBtn
              @click="deleteUser(item)"
              v-if="!item?.status?.includes('Realizando')"
              color="error"
            >
              <VIcon
                :icon="item.loadingTrash ? 'tabler-loader' : 'tabler-trash'"
              />

              <VTooltip activator="parent">
                <span>Excluir Campanha</span>
              </VTooltip>
            </IconBtn>
          </div>
        </template>

        <!-- pagination -->
        <template #bottom>
          <VDivider />
          <div
            class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
          >
            <p class="text-sm text-disabled mb-0">
              {{ paginationMeta({ page, itemsPerPage }, totalCampanhas) }}
            </p>

            <VPagination
              v-model="page"
              :length="Math.ceil(totalCampanhas / itemsPerPage)"
              :total-visible="
                $vuetify.display.xs
                  ? 1
                  : Math.ceil(totalCampanhas / itemsPerPage) > 5
                  ? 5
                  : Math.ceil(totalCampanhas / itemsPerPage)
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

    <relatoriosDialog
      :isDrawerOpen="isViewRelatorioDialog"
      @update:isDrawerOpen="isViewRelatorioDialog = $event"
      :dataLog="selectedDataLog?.dataLog ?? {}"
      :campanha="selectedDataLog?.campanha ?? {}"
    />
  </section>
</template>
