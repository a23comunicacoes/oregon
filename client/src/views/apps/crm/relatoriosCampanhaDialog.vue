<script setup>
  import { paginationMeta } from "@api-utils/paginationMeta";
  import { useAlert } from "@/composables/useAlert";
  import { watch } from "vue";
  import moment from "moment";
  import "moment/dist/locale/pt-br";

  const loading = ref(false);

  const props = defineProps({
    isDrawerOpen: {
      type: Boolean,
      required: true,
    },
    dataLog: Object,
    campanha: Object,
  });

  const emit = defineEmits(["update:isDrawerOpen", "closeDrawer"]);

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
  };

  const formatValue = (value) => {
    if (!value) return "R$ 0,00";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const { setAlert } = useAlert();

  const atualUser = useCookie("userData").value;

  const log = ref({});

  const limparSeg = () => {
    log.value = null;
    searchQuery.value = "";
    messages.value = [];
  };

  const closeNavigationDrawer = () => {
    emit("update:isDrawerOpen", false);
    limparSeg();
  };

  const handleDrawerModelValueUpdate = (val) => {
    emit("update:isDrawerOpen", val);
  };

  const widgetData = ref([
    {
      title: "Total de Clientes",
      value: log?.value?.qtdClientes ? log?.value?.qtdClientes : 0,
      icon: "tabler-users",
      iconColor: "primary",
    },
    {
      title: "Mensagens Enviadas",
      value: log?.value?.totalMsgs ? log?.value?.totalMsgs : 0,
      icon: "tabler-send",
      iconColor: "info",
    },
    {
      title: "Mensagens Sucesso",
      value: log?.value?.enviosSucesso ? log?.value?.enviosSucesso : 0,
      icon: "tabler-message-check",
      iconColor: "success",
    },
    {
      title: "Mensagens Erro",
      value: log?.value?.enviosErro ? log?.value?.enviosErro : 0,
      icon: "tabler-message-x",
      iconColor: "error",
    },
  ]);

  const searchQuery = ref("");
  const messages = ref([]);
  const allMessages = ref([]);

  // Data table options
  const itemsPerPage = ref(20);
  const page = ref(1);
  const sortBy = ref();
  const orderBy = ref();

  const filterMessages = async () => {
    if (!log?.value?.messagesLog) {
      console.log("No messages log found");
      messages.value = [];
      return;
    }

    const offset = (page.value - 1) * itemsPerPage.value;
    let msgs = [];
    if (searchQuery.value) {
      msgs = allMessages.value.filter((msg) => {
        return (
          msg.cliente.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          msg.phone.includes(searchQuery.value)
        );
      });
    } else {
      msgs = allMessages.value;
    }

    // Apply sorting
    if (sortBy.value && orderBy.value) {
      msgs.sort((a, b) => {
        const aValue = a[sortBy.value];
        const bValue = b[sortBy.value];

        if (aValue < bValue) return orderBy.value === "asc" ? -1 : 1;
        if (aValue > bValue) return orderBy.value === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      // Default sorting by date if no sortBy is provided
      msgs.sort((a, b) => new Date(b.data) - new Date(a.data));
    }

    messages.value = msgs.slice(offset, offset + itemsPerPage.value);
  };

  const updateOptions = (options) => {
    page.value = options.page;
    sortBy.value = options.sortBy[0]?.key;
    orderBy.value = options.sortBy[0]?.order;

    filterMessages();
  };

  // Headers
  const headers = [
    {
      title: "Cliente",
      key: "cliente",
      width: "150px",
    },
    {
      title: "Telefone",
      key: "phone",
      width: "150px",
    },
    {
      title: "Mensagem",
      key: "message",
      width: "250px",
      sortable: false,
    },
    {
      title: "Status",
      key: "sucesso",
      width: "80px",
    },
    {
      title: "Enviado em",
      key: "data",
      width: "200px",
    },
  ];

  watch(
    () => props.dataLog,
    async (newVal) => {
      if (newVal) {
        console.log("New log data w:", newVal);
        log.value = newVal;
        allMessages.value = newVal.messagesLog;

        let arr = [
          {
            title: "Total de Clientes",
            value: log?.value?.qtdClientes ? log?.value?.qtdClientes : 0,
            icon: "tabler-users",
            iconColor: "primary",
          },
        ];

        if (!props.campanha?.status?.includes("Conclu")) {
          arr.push({
            title: "Mensagens Restantes",
            value:
              (log?.value?.qtdClientes ?? 0) -
              (log?.value?.enviosSucesso ?? 0) -
              (log?.value?.enviosErro ?? 0),
            icon: "tabler-clock",
            iconColor: "warning",
          });
        }

        arr.push(
          {
            title: "Mensagens Enviadas",
            value: log?.value?.totalMsgs ? log?.value?.totalMsgs : 0,
            icon: "tabler-send",
            iconColor: "info",
          },
          {
            title: "Mensagens Sucesso",
            value: log?.value?.enviosSucesso ? log?.value?.enviosSucesso : 0,
            icon: "tabler-message-check",
            iconColor: "success",
          },
          {
            title: "Mensagens Erro",
            value: log?.value?.enviosErro ? log?.value?.enviosErro : 0,
            icon: "tabler-message-x",
            iconColor: "error",
          }
        );

        widgetData.value = arr;

        filterMessages();
      }
    }
  );

  if (props.dataLog) {
    console.log("New log data:", props.dataLog);
    log.value = props.dataLog;
    allMessages.value = props.dataLog.messagesLog;

    let arr = [
      {
        title: "Total de Clientes",
        value: log?.value?.qtdClientes ? log?.value?.qtdClientes : 0,
        icon: "tabler-users",
        iconColor: "primary",
      },
    ];

    if (!props.campanha?.status?.includes("Conclu")) {
      arr.push({
        title: "Mensagens Restantes",
        value:
          (log?.value?.qtdClientes ?? 0) -
          (log?.value?.enviosSucesso ?? 0) -
          (log?.value?.enviosErro ?? 0),
        icon: "tabler-clock",
        iconColor: "warning",
      });
    }

    arr.push(
      {
        title: "Mensagens Enviadas",
        value: log?.value?.totalMsgs ? log?.value?.totalMsgs : 0,
        icon: "tabler-send",
        iconColor: "info",
      },
      {
        title: "Mensagens Sucesso",
        value: log?.value?.enviosSucesso ? log?.value?.enviosSucesso : 0,
        icon: "tabler-message-check",
        iconColor: "success",
      },
      {
        title: "Mensagens Erro",
        value: log?.value?.enviosErro ? log?.value?.enviosErro : 0,
        icon: "tabler-message-x",
        iconColor: "error",
      }
    );

    widgetData.value = arr;

    filterMessages();
  }

  watch(
    () => props.isDrawerOpen,
    (newVal) => {
      if (!newVal) {
        limparSeg();
      } else {
        if (props.dataLog) {
          console.log("New log data:", props.dataLog);
          log.value = props.dataLog;
          messages.value = props.dataLog.messagesLog;

          let arr = [
            {
              title: "Total de Clientes",
              value: log?.value?.qtdClientes ? log?.value?.qtdClientes : 0,
              icon: "tabler-users",
              iconColor: "primary",
            },
          ];

          if (!props.campanha?.status?.includes("Conclu")) {
            arr.push({
              title: "Mensagens Restantes",
              value:
                (log?.value?.qtdClientes ?? 0) -
                (log?.value?.enviosSucesso ?? 0) -
                (log?.value?.enviosErro ?? 0),
              icon: "tabler-clock",
              iconColor: "warning",
            });
          }

          arr.push(
            {
              title: "Mensagens Enviadas",
              value: log?.value?.totalMsgs ? log?.value?.totalMsgs : 0,
              icon: "tabler-send",
              iconColor: "info",
            },
            {
              title: "Mensagens Sucesso",
              value: log?.value?.enviosSucesso ? log?.value?.enviosSucesso : 0,
              icon: "tabler-message-check",
              iconColor: "success",
            },
            {
              title: "Mensagens Erro",
              value: log?.value?.enviosErro ? log?.value?.enviosErro : 0,
              icon: "tabler-message-x",
              iconColor: "error",
            }
          );

          widgetData.value = arr;

          filterMessages();
        }
      }
    }
  );

  function formatHtmlMensagem(mensagem) {
    if (!mensagem) return "";

    return (
      mensagem
        /* .replace(/<strong>(.*?)<\/strong>/g, "*$1*") // <strong>negrito</strong>
      .replace(/<em>(.*?)<\/em>/g, "_$1_") // <em>itálico</em>
      .replace(/<s>(.*?)<\/s>/g, "~$1~") // <s>riscado</s>
      .replace(/\n/g, "<br>"); // <br> quebras de linha */

        .replace(/\n/g, "<br>") // <br> quebras de linha
        .replace(/\*(.*?)\*/g, "<strong>$1</strong>") // **negrito**
        .replace(/__(.*?)__/g, "<em>$1</em>") // __itálico__
        .replace(/~~(.*?)~~/g, "<s>$1</s>")
    ); // ~~riscado~~
  }

  function getDuracaoEnvio() {
    const restam =
      (log?.value?.qtdClientes ?? 0) -
      (log?.value?.enviosSucesso ?? 0) -
      (log?.value?.enviosErro ?? 0);

    if (!restam || restam <= 0) {
      return null;
    }

    const minutos = Math.ceil((restam * props.campanha.intervalo) / 60);
    const duracao = moment.duration(minutos, "minutes");

    let texto = "";
    if (duracao.asDays() >= 1) {
      texto = `${Math.floor(duracao.asDays())} dia${
        Math.floor(duracao.asDays()) > 1 ? "s" : ""
      }`;
      const horasRestantes = duracao.hours();
      if (horasRestantes)
        texto += ` e ${horasRestantes} hora${horasRestantes > 1 ? "s" : ""}`;
    } else if (duracao.asHours() >= 1) {
      texto = `${Math.floor(duracao.asHours())} hora${
        Math.floor(duracao.asHours()) > 1 ? "s" : ""
      }`;
      const minutosRestantes = duracao.minutes();
      if (minutosRestantes)
        texto += ` e ${minutosRestantes} minuto${
          minutosRestantes > 1 ? "s" : ""
        }`;
    } else {
      texto = `${duracao.minutes()} minuto${duracao.minutes() > 1 ? "s" : ""}`;
    }

    return texto;
  }

  function terminoEstimado() {
    if (!log?.value?.dataInicio || !log?.value?.qtdClientes) return null;

    const restam =
      (log.value.qtdClientes ?? 0) -
      (log.value.enviosSucesso ?? 0) -
      (log.value.enviosErro ?? 0);

    if (restam <= 0) return null;

    const termino = moment(log.value.dataInicio)
      .add(restam * props.campanha.intervalo, "seconds")
      .format("DD/MM/YYYY HH:mm");

    return termino;
  }
</script>
<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <VCard flat>
      <VCardText class="pt-2">
        <!-- 👉 Title -->
        <AppDrawerHeaderSection
          :title="`Relatório da campanha ${
            log && log.name ? ' - ' + log.name : ''
          }`"
          @cancel="closeNavigationDrawer"
        />

        <VDivider class="mb-3" />

        <p class="mb-0">
          <strong>Início: </strong>
          {{ moment(log?.dataInicio).format("DD/MM/YYYY HH:mm") }} •
          <span
            v-if="
              props.campanha.status?.includes('Conclu') ||
              props.campanha.status == 'Pausada'
            "
          >
            <strong>Fim: </strong>
            {{ moment(log?.dataFim).format("DD/MM/YYYY HH:mm") }} •
          </span>
          <strong>Duração: </strong>
          {{
            moment
              .duration(moment(log?.dataFim).diff(moment(log?.dataInicio)))
              .humanize()
          }}
        </p>

        <p
          class="mb-0"
          v-if="
            !props.campanha?.status?.includes('Conclu') && getDuracaoEnvio()
          "
        >
          <strong>Duração restante estimada: </strong>
          {{ getDuracaoEnvio() }}
        </p>

        <p
          class="mb-0"
          v-if="
            !props.campanha?.status?.includes('Conclu') && terminoEstimado()
          "
        >
          <strong>Término estimado: </strong>
          {{ terminoEstimado() }}
        </p>

        <!-- 👉 Widgets -->
        <div class="d-flex mt-2 mb-4">
          <VRow
            class="match-height"
            :class="{ 'justify-center': widgetData.length > 4 }"
          >
            <template v-for="(data, id) in widgetData" :key="id">
              <VCol cols="12" :md="widgetData.length > 4 ? 4 : 3">
                <VCard>
                  <VCardText>
                    <div class="d-flex justify-space-between">
                      <div class="d-flex flex-column gap-y-1">
                        <span class="text-body-1 text-medium-emphasis">{{
                          data.title
                        }}</span>
                        <div>
                          <h4
                            class="text-h4"
                            v-if="data.title !== 'Produto mais Comprado'"
                          >
                            {{ data.value }}
                          </h4>
                          <p class="mb-0 font-weight-bold text-h5" v-else>
                            {{ data.value }}
                          </p>
                        </div>
                      </div>
                      <VAvatar
                        :color="data.iconColor"
                        variant="tonal"
                        rounded
                        size="38"
                      >
                        <VIcon :icon="data.icon" size="26" />
                      </VAvatar>
                    </div>
                  </VCardText>
                </VCard>
              </VCol>
            </template>
          </VRow>
        </div>

        <p class="font-weight-bold mb-4 mt-10">Log de mensagens:</p>
        <AppTextField
          v-model="searchQuery"
          label="Pesquise um cliente"
          @update:model-value="filterMessages"
          placeholder="Pesquise por nome ou telefone"
          class="mb-8"
        />

        <VDivider class="mb-4" />

        <!-- SECTION datatable -->
        <VDataTableServer
          v-model:items-per-page="itemsPerPage"
          v-model:page="page"
          :items="messages"
          :items-length="allMessages.length"
          :headers="headers"
          @update:options="updateOptions"
          :loading="loading"
          loading-text="Carregando..."
        >
          <template #item.cliente="{ item }">
            <p class="text-truncate mb-0" style="max-width: 150px">
              {{ item.cliente }}

              <VTooltip activator="parent">
                <p class="mb-0">{{ item.cliente }}</p>
              </VTooltip>
            </p>
          </template>

          <template #item.phone="{ item }">
            <p class="text-truncate mb-0" style="max-width: 150px">
              {{ item.phone }}
            </p>
          </template>

          <template #item.message="{ item }">
            <p class="text-truncate my-2" style="max-width: 250px">
              {{ item.message }}

              <VTooltip activator="parent">
                <p
                  class="mb-0"
                  v-html="formatHtmlMensagem(item.message)"
                  style="max-width: 500px"
                />
              </VTooltip>
            </p>
          </template>

          <template #item.sucesso="{ item }">
            <VChip :color="item.sucesso ? 'success' : 'error'" label>
              {{ item.sucesso ? "Enviado" : "Erro" }}
            </VChip>
          </template>
          <template #item.data="{ item }">
            <p class="mb-0">
              {{ moment(item.data).format("DD/MM/YYYY HH:mm:ss") }}
            </p>
          </template>

          <!-- pagination -->
          <template #bottom>
            <VDivider />
            <div
              class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
            >
              <p class="text-sm text-disabled mb-0">
                {{ paginationMeta({ page, itemsPerPage }, allMessages.length) }}
              </p>

              <VPagination
                v-model="page"
                :length="Math.ceil(allMessages.length / itemsPerPage)"
                :total-visible="
                  $vuetify.display.xs
                    ? 1
                    : Math.ceil(allMessages.length / itemsPerPage) > 5
                    ? 5
                    : Math.ceil(allMessages.length / itemsPerPage)
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
      </VCardText>
    </VCard>
  </VDialog>
</template>
