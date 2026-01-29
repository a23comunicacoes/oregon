<script setup>
  import { VDataTableServer } from "vuetify/labs/VDataTable";
  import { useConfirm } from "@/utils/confirm.js";
  import { paginationMeta } from "@api-utils/paginationMeta";
  import { useAlert } from "@/composables/useAlert";
  import DespesasDialog from "@/views/apps/pagamentos/DespesasDialog.vue";
  import { can } from "@layouts/plugins/casl";
  import moment from "moment";

  const { setAlert } = useAlert();

  const router = useRouter();
  const route = useRoute();

  if (!can("view", "financeiro_despesa")) {
    setAlert(
      "Você não tem permissão para acessar esta página.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/");
  }

  const despesas = ref([]);
  const loading = ref(true);

  // 👉 Store
  const searchQuery = ref("");
  const dataDeQuery = ref(moment().startOf("month").format("YYYY-MM-DD"));
  const dataAteQuery = ref(moment().endOf("month").format("YYYY-MM-DD"));
  const pagoQuery = ref(0);

  // Data table options
  const itemsPerPage = ref(10);
  const page = ref(1);
  const sortBy = ref();
  const orderBy = ref();
  const totalDespesas = ref(0);

  const widgetData = ref([
    {
      title: "Total de Despesas",
      value: 0,
      desc: `${moment(dataDeQuery.value).format("DD/MM/YYYY")} - ${moment(
        dataAteQuery.value
      ).format("DD/MM/YYYY")}`,
      icon: "tabler-receipt-refund",
      iconColor: "warning",
    },
    {
      title: "Total em Aberto",
      value: 0,
      desc: `${moment(dataDeQuery.value).format("DD/MM/YYYY")} - ${moment(
        dataAteQuery.value
      ).format("DD/MM/YYYY")}`,
      icon: "tabler-x",
      iconColor: "error",
    },
    {
      title: "Total Pago",
      value: 0,
      desc: `${moment(dataDeQuery.value).format("DD/MM/YYYY")} - ${moment(
        dataAteQuery.value
      ).format("DD/MM/YYYY")}`,
      icon: "tabler-check",
      iconColor: "success",
    },
    {
      title: "Total em Atraso",
      value: 0,
      desc: `${moment(dataDeQuery.value).format("DD/MM/YYYY")} - ${moment(
        dataAteQuery.value
      ).format("DD/MM/YYYY")}`,
      icon: "tabler-alert-triangle",
      iconColor: "error",
    },
  ]);

  const updateOptions = (options) => {
    console.log("Update: ", options);
    page.value = options.page;
    sortBy.value = options.sortBy[0]?.key;
    orderBy.value = options.sortBy[0]?.order;

    getDespesas();
  };

  // Headers
  const headers = [
    {
      title: "Descrição",
      key: "des_descricao",
    },
    {
      title: "Vencimento",
      key: "des_data",
    },
    {
      title: "Valor",
      key: "des_valor",
    },
    {
      title: "Tipo",
      key: "des_tipo",
    },
    {
      title: "Status",
      key: "des_pago",
    },
    {
      title: "Ações",
      key: "actions",
      sortable: false,
    },
  ];

  const isDespesaDrawerVisible = ref(false);
  const loadingDespesaData = ref(true);
  const DespesaData = ref({});

  const relatorios = ref({
    totalValorDespesas: 0,
    totalEmAberto: 0,
    totalPago: 0,
    totalEmAtraso: 0,
  });

  const getDespesas = async () => {
    if (!can("view", "financeiro_despesa")) {
      setAlert(
        "Você não tem permissão para acessar esta página.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      router.push("/");
      return;
    }

    loadingDespesaData.value = true;
    loading.value = true;

    try {
      const res = await $api("/pagamentos/list/despesas", {
        query: {
          page: page.value,
          itemsPerPage: itemsPerPage.value,
          q: searchQuery.value,
          sortBy: sortBy.value,
          orderBy: orderBy.value,
          dataDe: dataDeQuery.value,
          dataAte: dataAteQuery.value,
          status: pagoQuery.value,
        },
      });

      if (!res) return;

      console.log("despesas:", res);

      despesas.value = res.despesas;
      totalDespesas.value = res.totalDespesas;

      DespesaData.value = {};

      let descW = `${moment(dataDeQuery.value).format("DD/MM/YYYY")} - ${moment(
        dataAteQuery.value
      ).format("DD/MM/YYYY")}`;

      //Atualiza os dados do widget
      widgetData.value = [
        {
          title: "Total de Despesas",
          value: res.relatorios.totalValorDespesas,
          desc: descW,
          icon: "tabler-receipt-refund",
          iconColor: "warning",
        },
        {
          title: "Total em Aberto",
          value: res.relatorios.totalEmAberto,
          desc: descW,
          icon: "tabler-x",
          iconColor: "error",
        },
        {
          title: "Total Pago",
          value: res.relatorios.totalPago,
          desc: descW,
          icon: "tabler-check",
          iconColor: "success",
        },
        {
          title: "Total em Atraso",
          value: res.relatorios.totalEmAtraso,
          desc: descW,
          icon: "tabler-alert-triangle",
          iconColor: "error",
        },
      ];
    } catch (error) {
      console.error("Error getting produtos:", error, error.response);

      despesas.value = [];
    }

    loading.value = false;
  };

  onMounted(() => {
    getDespesas();
  });

  const editarDespesa = async (item) => {
    if (!can("edit", "financeiro_despesa")) {
      setAlert(
        "Você não tem permissão para editar despesas!",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    try {
      const res = await $api(`/pagamentos/get/despesas/${item}`, {
        method: "GET",
      });

      if (!res) return;

      console.log("Produto edit:", res);

      DespesaData.value = res;

      isDespesaDrawerVisible.value = true;
    } catch (error) {
      console.error("Error getting produto:", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao carregar despesa! Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }

    loadingDespesaData.value = false;
  };

  if (route.query.viewDespesa) {
    editarDespesa(route.query.viewDespesa);

    //Remove o parâmetro da URL
    router.replace({ query: { tab: "despesas" } });
  }

  const deletarDespesa = async (item) => {
    if (
      !(await useConfirm({
        message: `Você tem certeza que deseja deletar a despesa "${item.des_descricao}"? Esta ação não pode ser desfeita.`,
      }))
    ) {
      return;
    }

    try {
      const res = await $api(`/pagamentos/delete/despesas/${item.des_id}`, {
        method: "DELETE",
      });

      if (!res) return;

      setAlert(
        "Despesa deletada com sucesso!",
        "success",
        "tabler-trash",
        3000
      );

      getDespesas();
    } catch (error) {
      console.error("Error deleting produto:", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao deletar despesa! Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  watch(isDespesaDrawerVisible, (val) => {
    console.log("isDespesaDrawerVisible:", val);
    if (!val) {
      DespesaData.value = {};
    }
  });

  const formatValor = (valor) => {
    if (!valor) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const pagoSelect = [
    { value: 0, title: "Todos" },
    { value: 1, title: "Pago" },
    { value: 2, title: "Em aberto" },
    { value: 3, title: "Em atraso" },
  ];

  const checkDateStatus = (date) => {
    if (!date) return { status: "Em aberto", color: "info" };

    if (moment(date).isBefore(moment(), "day")) {
      return { status: "Em atraso", color: "error" };
    } else if (moment(date).isSame(moment(), "day")) {
      return { status: "Pagar hoje", color: "warning" };
    }

    return { status: "Em aberto", color: "info" };
  };
</script>
<template>
  <VCard class="mb-6">
    <VCardText>
      <VRow>
        <!-- 👉 Search  -->
        <VCol cols="12" sm="4">
          <AppTextField
            v-model="searchQuery"
            label="Pesquise uma despesa"
            placeholder="Pesquise pela descrição, data ou valor"
            density="compact"
            @input="getDespesas"
            @keyup="getDespesas"
            clearable
            @click:clear="getDespesas"
          />
        </VCol>

        <!-- 👉 Meses -->
        <VCol cols="12" sm="2">
          <AppTextField
            v-model="dataDeQuery"
            label="Data inicial"
            placeholder="Selecione uma data"
            type="date"
            @update:model-value="getDespesas"
          />
        </VCol>

        <!-- 👉 Ano -->
        <VCol cols="12" sm="2">
          <AppTextField
            v-model="dataAteQuery"
            label="Data final"
            placeholder="Selecione uma data"
            type="date"
            @update:model-value="getDespesas"
          />
        </VCol>

        <VCol cols="12" sm="4">
          <AppSelect
            v-model="pagoQuery"
            :items="pagoSelect"
            label="Status"
            placeholder="Selecione um status"
            density="compact"
            clearable
            @click:clear="getDespesas"
            @update:model-value="getDespesas"
          />
        </VCol>
      </VRow>
    </VCardText>
  </VCard>

  <VRow class="match-height mb-4">
    <template v-for="(data, id) in widgetData" :key="id">
      <VCol cols="12" md="3">
        <VCard>
          <VCardText>
            <div class="d-flex justify-space-between">
              <div class="d-flex flex-column gap-y-1">
                <span class="text-medium-emphasis">{{ data.title }}</span>
                <div>
                  <h5 class="text-h5">
                    {{ formatValor(data.value) }}
                  </h5>
                </div>
                <span class="text-caption">{{ data.desc }}</span>
              </div>
              <VAvatar
                :color="data.iconColor"
                variant="tonal"
                rounded
                size="30"
              >
                <VIcon :icon="data.icon" size="20" />
              </VAvatar>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </template>
  </VRow>

  <VCard>
    <VCardText class="d-flex flex-wrap py-4 gap-4">
      <VSpacer />

      <!-- 👉 Add user button -->
      <VBtn color="primary" @click="isDespesaDrawerVisible = true">
        <VIcon icon="tabler-plus" />
        Adicionar Despesa
      </VBtn>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="despesas"
      :items-length="totalDespesas"
      :headers="headers"
      class="text-no-wrap tabela-produtos"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando..."
    >
      <template v-slot:item.des_descricao="{ item }">
        <p
          class="mb-0 text-sm text-truncate cursor-pointer"
          style="max-width: 350px"
        >
          {{ item.des_descricao }}

          <VTooltip activator="parent">
            <span class="text-sm">
              {{ item.des_descricao }}
            </span>
          </VTooltip>
        </p>
      </template>

      <template v-slot:item.des_data="{ item }">
        {{ moment(item.des_data).format("DD/MM/YYYY") }}
      </template>

      <template v-slot:item.des_valor="{ item }">
        {{ formatValor(item.des_valor) }}
      </template>

      <template v-slot:item.des_tipo="{ item }">
        <p class="mb-0">
          {{ item.des_tipo && item.des_tipo != "null" ? item.des_tipo : "-" }}
        </p>
      </template>

      <template v-slot:item.des_pago="{ item }">
        <VChip color="success" v-if="item.des_pago == 1" label variant="flat"
          >Pago</VChip
        >
        <VChip
          :color="checkDateStatus(item.des_data).color"
          v-else
          label
          variant="flat"
        >
          {{ checkDateStatus(item.des_data).status }}
        </VChip>
      </template>

      <template v-slot:item.actions="{ item }">
        <IconBtn
          color="warning"
          @click="editarDespesa(item.des_id)"
          v-if="can('edit', 'financeiro_despesa')"
        >
          <VIcon icon="tabler-edit" />
        </IconBtn>

        <IconBtn
          :loading="item.excluindo"
          @click="deletarDespesa(item)"
          color="error"
          class="ml-3"
          v-if="can('delete', 'financeiro_despesa')"
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
          <p class="text-sm text-disabled mb-0" v-if="itemsPerPage != -1">
            {{ paginationMeta({ page, itemsPerPage }, totalDespesas) }}
          </p>
          <p class="text-sm text-disabled mb-0" v-if="itemsPerPage == -1">
            {{ "Exibindo " + totalDespesas + " resultados" }}
          </p>

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

          <VPagination
            v-model="page"
            :length="Math.ceil(totalDespesas / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : Math.ceil(totalDespesas / itemsPerPage) > 5
                ? 5
                : Math.ceil(totalDespesas / itemsPerPage)
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
  </VCard>

  <DespesasDialog
    :isDrawerOpen="isDespesaDrawerVisible"
    @update:isDrawerOpen="isDespesaDrawerVisible = $event"
    :DespesaData="DespesaData"
    @updateDespesas="getDespesas"
  />
</template>
