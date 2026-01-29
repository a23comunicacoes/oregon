<script setup>
import { temaAtual } from "@core/stores/config";
import { can } from "@layouts/plugins/casl";
import { useFunctions } from "@/composables/useFunctions";
import moment from "moment";

const { formatDateAgendamento, escreverEndereco, formatValue } = useFunctions();
const router = useRouter();

const userData = useCookie("userData").value;
const userName = userData.fullName;

const actions = [
  {
    title: "Agendamentos",
    icon: { icon: "tabler-calendar" },
    to: "agendamento",
    show: can("view", "agendamento") || can("view-all", "agendamento"),
  },
  {
    title: "Relatórios",
    icon: { icon: "tabler-dashboard" },
    to: "relatorios",
    show:
      can("view", "relatorio_agendamentos") ||
      can("view", "relatorio_clientes") ||
      can("view", "relatorio_servicos") ||
      can("view", "relatorio_financeiro") ||
      can("view", "relatorio_crm"),
  },
  {
    title: "Serviços",
    icon: { icon: "tabler-tools" },
    to: "servicos",
    show: can("view", "servico"),
  },
  {
    title: "Clientes",
    icon: { icon: "tabler-users-group" },
    to: "clientes",
    show: can("view", "cliente"),
  },
  {
    title: "Lembretes",
    icon: { icon: "tabler-bell" },
    to: "lembretes",
    show: true,
  },
  {
    title: "Comissões",
    icon: { icon: "tabler-gift-card" },
    to: "comissoes",
    show: can("view", "financeiro_comissao"),
  },
  {
    title: "Pagamentos",
    icon: { icon: "tabler-coin" },
    to: "pagamentos",
    show:
      can("view", "financeiro_comissao") || can("view", "financeiro_despesa"),
  },
  {
    title: "Usuários",
    icon: { icon: "tabler-users" },
    to: "/apps/user/list",
    show: can("manage", "config_user"),
  },
  {
    title: "Configurações",
    icon: { icon: "tabler-settings" },
    to: "configuracoes",
    show: can("manage", "config_gerais"),
  },
];

//Calcular bom dia, boa tarde ou boa noite
const date = new Date();
const hour = date.getHours();

let greeting = "bom dia"; // Valor padrão

if (hour >= 12 && hour < 18) {
  greeting = "boa tarde";
} else if (hour >= 18 || hour < 6) {
  greeting = "boa noite";
}

const agendamentosDia = ref([]);
const totalAgendamentosDia = ref(0);
const loadingAgendamentosDia = ref(false);

const widgetAgendamentos = ref([
  {
    title: "/Dia",
    periodo: "dia",
    icon: "tabler-calendar",
    color: "warning",
    total: 0,
  },
  {
    title: "/Semana",
    periodo: "semana",
    icon: "tabler-calendar-week",
    color: "primary",
    total: 0,
  },
  {
    title: "/Mês",
    periodo: "mes",
    icon: "tabler-calendar-month",
    color: "info",
    total: 0,
  },
]);

const getAgendamentosDia = async () => {
  if (!can("view", "agendamento") && !can("view-all", "agendamento")) {
    console.log("Não tem permissão para ver agendamentos");
    return;
  }

  loadingAgendamentosDia.value = true;

  try {
    const res = await $api("/agenda/agendamentos", {
      method: "GET",
      query: {
        notBloqueio: true,
        start: moment().format("YYYY-MM-DD"),
        end: moment().format("YYYY-MM-DD"),
        fun_id: !can("view-all", "agendamento") ? userData.id : null,
      },
    });

    if (!res) throw new Error("Erro ao obter agendamentos");

    console.log("Agendamentos obtidos:", res);

    agendamentosDia.value = res.slice(0, 5);
    totalAgendamentosDia.value = res.length;

    for (let widget of widgetAgendamentos.value) {
      widget.total = await getTotalAgendamentos(widget.periodo);
    }
  } catch (error) {
    console.error("Error fetching agendamentos dia:", error, error.response);
    totalAgendamentosDia.value = 0;
    agendamentosDia.value = [];
  } finally {
    loadingAgendamentosDia.value = false;
  }
};

const getTotalAgendamentos = async (periodo = "dia") => {
  let dataInicio = moment().format("YYYY-MM-DD");
  let dataFim = moment().format("YYYY-MM-DD");

  if (periodo == "dia") {
    dataInicio = moment().format("YYYY-MM-DD");
    dataFim = moment().format("YYYY-MM-DD");
  } else if (periodo == "semana") {
    dataInicio = moment().startOf("week").format("YYYY-MM-DD");
    dataFim = moment().endOf("week").format("YYYY-MM-DD");
  } else if (periodo == "mes") {
    dataInicio = moment().startOf("month").format("YYYY-MM-DD");
    dataFim = moment().endOf("month").format("YYYY-MM-DD");
  }

  try {
    const res = await $api("/agenda/agendamentos", {
      method: "GET",
      query: {
        notBloqueio: true,
        onlyCount: true,
        start: dataInicio,
        end: dataFim,
        fun_id: !can("view-all", "agendamento") ? userData.id : null,
      },
    });

    console.log("Total agendamentos:", res);

    return res?.total || 0;
  } catch (error) {
    console.error("Error fetching total agendamentos:", error, error.response);
    return 0;
  }
};

const dataDeQuery = ref(moment().startOf("month").format("YYYY-MM-DD"));
const dataAteQuery = ref(moment().endOf("month").format("YYYY-MM-DD"));

const widgetData = ref([
  {
    title: "Total a Pagar",
    value: 0,
    desc: `${moment(dataDeQuery.value).format("DD/MM/YYYY")} - ${moment(
      dataAteQuery.value
    ).format("DD/MM/YYYY")}`,
    icon: "tabler-credit-card",
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

const loadingDespesa = ref(false);

const getPagar = async () => {
  if (
    !can("view", "financeiro_despesa") ||
    !can("view", "financeiro_comissao")
  ) {
    return;
  }

  if (!dataDeQuery.value || !dataAteQuery.value) {
    return;
  }

  loadingDespesa.value = true;

  let queryPagar = {
    itemsPerPage: 10000,
    dataDe: dataDeQuery.value,
    dataAte: dataAteQuery.value,
  };

  if (
    can("view", "financeiro_comissao") &&
    !can("view", "financeiro_despesa")
  ) {
    queryPagar.tipo = "Comissão";
  } else if (
    can("view", "financeiro_despesa") &&
    !can("view", "financeiro_comissao")
  ) {
    queryPagar.tipo = "Despesa";
  }

  try {
    const res = await $api("/pagamentos/list/pagar", {
      query: queryPagar,
    });

    if (!res) return;

    console.log("pagar:", res);

    let descW = `${moment(dataDeQuery.value).format("DD/MM/YYYY")} - ${moment(
      dataAteQuery.value
    ).format("DD/MM/YYYY")}`;

    //Atualizar widgets
    widgetData.value = [
      {
        title: "Total a Pagar",
        value: res.relatorios.totalaPagar,
        desc: descW,
        icon: "tabler-credit-card",
        iconColor: "warning",
        typesText: `${res.relatorios.countAPagar?.despesas ?? 0} Despesas e ${
          res.relatorios.countAPagar?.comissoes ?? 0
        } Comissões`,
      },
      {
        title: "Total em Aberto",
        value: res.relatorios.totalEmAberto,
        desc: descW,
        icon: "tabler-x",
        iconColor: "error",
        typesText: `${res.relatorios.countEmAberto?.despesas ?? 0} Despesas e ${
          res.relatorios.countEmAberto?.comissoes ?? 0
        } Comissões`,
      },
      {
        title: "Total Pago",
        value: res.relatorios.totalPago,
        desc: descW,
        icon: "tabler-check",
        iconColor: "success",
        typesText: `${res.relatorios.countPago?.despesas ?? 0} Despesas e ${
          res.relatorios.countPago?.comissoes ?? 0
        } Comissões`,
      },
      {
        title: "Total em Atraso",
        value: res.relatorios.totalEmAtraso,
        desc: descW,
        icon: "tabler-alert-triangle",
        iconColor: "error",
        typesText: `${res.relatorios.countEmAtraso?.despesas ?? 0} Despesas e ${
          res.relatorios.countEmAtraso?.comissoes ?? 0
        } Comissões`,
      },
    ];
  } catch (error) {
    console.error("Error getting produtos:", error, error.response);
  }

  loadingDespesa.value = false;
};

getAgendamentosDia();
getPagar();
</script>

<template>
  <p class="text-center mb-0">Olá, {{ greeting }}, {{ userName }}.</p>
  <h2 class="text-center text-h4 mb-8">Bem Vindo ao Sistema Oregon</h2>

  <VRow class="justify-center">
    <VCol cols="12" md="6" v-if="can('view', 'agendamento')">
      <VRow dense class="mb-5">
        <VCol
          cols="12"
          md="4"
          v-for="widget in widgetAgendamentos"
          :key="widget.title"
        >
          <VCard class="mx-2 text-center">
            <VCardText class="pa-3">
              <div class="d-flex flex-row align-center justify-center gap-4">
                <VAvatar :color="widget.color" variant="tonal">
                  <VIcon :icon="widget.icon" />
                </VAvatar>

                <div>
                  <p class="mb-0 text-h5">
                    {{ widget.total }}
                    <span class="text-caption">
                      {{ widget.title }}
                    </span>
                  </p>
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <p class="mb-0 text-center text-sm" :class="{ 'mb-3': totalAgendamentosDia <= 5 }">
        <VIcon icon="tabler-calendar" />
        Agendamentos do dia
      </p>

      <p v-if="totalAgendamentosDia > 5" class="text-caption text-disabled text-center mb-3">
        (Exibindo 5 de {{ totalAgendamentosDia }})
      </p>

      <div
        class="d-flex flex-column gap-3"
        style="max-height: 250px; min-height: 250px; overflow-y: auto"
      >
        <VCard
          :color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
          v-for="agendamentoSelected in agendamentosDia"
          :key="agendamentoSelected.age_id"
          class="text-sm py-3 px-4"
          rounded="xl"
          @click="
            router.push(
              `/agendamento/?viewAgendamento=${agendamentoSelected.age_id}`
            )
          "
          style="min-height: fit-content; height: fit-content"
        >
          <div class="linha-flex mb-1">
            <p
              class="mb-0"
              :style="`${
                agendamentoSelected?.bkColor
                  ? `color: ${agendamentoSelected?.bkColor} !important`
                  : ''
              }`"
            >
              <VIcon icon="tabler-list-details" class="mr-1" />
              {{ agendamentoSelected?.status }}
            </p>

            <p class="mb-0">
              <VIcon icon="tabler-clock" class="mr-1" />
              {{
                moment(agendamentoSelected?.age_horaInicio, 'HH:mm:ss').format("HH:mm") +
                " - " +
                moment(agendamentoSelected?.age_horaFim, 'HH:mm:ss').format("HH:mm")
              }}
            </p>

            
          <p class="mb-0">
            <VIcon icon="tabler-tools" class="mr-1" />
            {{ agendamentoSelected?.servicos?.length }}
          </p>
          </div>

          <p class="mb-0" v-if="agendamentoSelected?.age_dataFim">
            <VIcon icon="tabler-calendar-x" class="mr-1" />
            {{
              formatDateAgendamento(
                agendamentoSelected?.age_dataFim,
                agendamentoSelected?.age_horaInicioFim,
                agendamentoSelected?.age_horaFimFim
              )
            }}
          </p>

          <p class="mb-0 text-truncate" v-if="agendamentoSelected?.cliente?.[0]">
            <VIcon icon="tabler-users" class="mr-1" />
            {{ agendamentoSelected?.cliente[0]?.cli_nome }}
          </p>

          <p class="mb-0 text-truncate" v-if="agendamentoSelected?.endereco?.[0]">
            <VIcon icon="tabler-map-pin" class="mr-1" />
            {{ escreverEndereco(agendamentoSelected?.endereco[0]) }}
          </p>
        </VCard>

        <div class="d-flex justify-center" v-if="agendamentosDia.length === 0">
          <p class="mb-0 text-sm text-medium-emphasis">
            Nenhum agendamento encontrado
          </p>
        </div>
      </div>
      <VBtn
        @click="router.push('/agendamento')"
        rounded="lg"
        variant="text"
        class="w-100"
      >
        Ver todos
        <VIcon icon="tabler-chevron-right" />
      </VBtn>
    </VCol>

    <VCol
      cols="12"
      md="6"
      v-if="
        can('view', 'financeiro_comissao') || can('view', 'financeiro_despesa')
      "
    >
      <p class="mb-3 text-center">
        <VIcon icon="tabler-credit-card" />
        Resumo Financeiro
      </p>

      <VRow class="match-height" dense>
        <template v-for="(data, id) in widgetData" :key="id">
          <VCol cols="12" md="6">
            <VCard :loading="loadingDespesa">
              <VCardText class="py-3">
                <div class="d-flex justify-space-between">
                  <div class="d-flex flex-column gap-y-1">
                    <span class="text-medium-emphasis">{{ data.title }}</span>
                    <div>
                      <h5 class="text-h5">
                        {{ formatValue(data.value) }}
                      </h5>
                    </div>
                    <span class="text-caption">{{ data.desc }}</span>
                    <span class="text-caption">{{ data.typesText }}</span>
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
    </VCol>
  </VRow>

  <div class="d-flex flex-row gap-3 mt-5 justify-center">
    <v-slide-group class="pa-4" center-active show-arrows>
      <v-slide-group-item
        v-for="(action, index) in actions.filter((ac) => ac.show)"
        :key="index"
      >
        <VCard
          class="full-gradiente mx-2"
          style="border-radius: 20px; max-width: 150px; min-width: 150px"
          @click="router.push(action.to)"
        >
          <VCardText
            class="text-center d-flex flex-column align-center justify-center"
          >
            <VIcon :icon="action.icon.icon" size="35" class="mb-4" />
            <p class="text-h6 mb-0">{{ action.title }}</p>
          </VCardText>
        </VCard>
      </v-slide-group-item>
    </v-slide-group>
  </div>
</template>
