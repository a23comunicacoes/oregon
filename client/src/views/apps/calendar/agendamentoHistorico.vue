<script setup>
import { temaAtual } from "@core/stores/config";
import moment from "moment";
const isMobile = window.innerWidth < 768;
import { paginationMeta } from "@api-utils/paginationMeta";

const loading = ref(false);
const { setAlert } = useAlert();

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  agendamento_id: {
    type: [String, Number],
    required: true,
  },
});

const emit = defineEmits(["update:isDrawerOpen"]);

const handleDrawerModelValueUpdate = (value) => {
  emit("update:isDrawerOpen", value);
};

const historicoAgendamento = ref([]);
const funcionarios = ref([]);

const orderByItens = [
  { title: "Mais recente", value: "date-desc" },
  { title: "Mais antigo", value: "date-asc" },
  { title: "A-Z", value: "title-asc" },
  { title: "Z-A", value: "title-desc" },
];

const orderBy = ref("date-desc");
const funcionarioQuery = ref(null);
const searchQuery = ref(null);
const page = ref(1);
const itemsPerPage = ref(10);

const getHistoricoAgendamento = async () => {
  orderBy.value = "date-desc";
  funcionarioQuery.value = null;

  loading.value = true;

  try {
    const response = await $api(
      `/agenda/getHistoricoAgendamento/${props.agendamento_id}`
    );

    if (!response || !Array.isArray(response)) {
      throw new Error("Dados inválidos");
    }

    console.log("Historico de agendamentoo", response);

    historicoAgendamento.value = response;

    funcionarios.value = [];

    for (let item of response) {
      if (
        !funcionarios.value.some((funcionario) => funcionario.title === item.feitoPor)
      ) {
        funcionarios.value.push({
          title: item.feitoPor,
          value: item.feitoPor,
        });
      }
    }

    funcionarios.value = funcionarios.value.sort(
      (a, b) => a.title?.localeCompare(b.title || "") || 0
    );

    funcionarios.value.unshift({
      title: "Todos",
      value: null,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar o histórico de agendamento",
      error,
      error.response
    );
    setAlert(
      error?.response?._data?.message ||
        "Ocorreu um erro ao buscar o histórico de agendamento",
      "error",
      "tabler-alert-triangle",
      3000
    );
  } finally {
    loading.value = false;
  }
};

const filteredHistoricoAgendamento = () => {
  let historico = historicoAgendamento.value;

  if (searchQuery.value) {
    historico = historico.filter((item) =>
      item.title?.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  if (funcionarioQuery.value) {
    historico = historico.filter(
      (item) => item.feitoPor === funcionarioQuery.value
    );
  }

  if (orderBy.value) {
    historico = historico.sort((a, b) => {
      if (orderBy.value === "date-desc") {
        return new Date(b.date) - new Date(a.date);
      }
    });
  }

  //Paginação
  return historico.slice(
    (page.value - 1) * itemsPerPage.value,
    page.value * itemsPerPage.value
  );
};

getHistoricoAgendamento();

watch(
  () => props.isDrawerOpen,
  (newVal) => {
    if (newVal) {
      getHistoricoAgendamento();
    }
  },
  { immediate: true }
);
</script>
<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    width="900"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <VCard flat :loading="loading">
      <VCardText class="pt-2">
        <AppDrawerHeaderSection @cancel="handleDrawerModelValueUpdate(false)">
          <template #title>
            <div>
              <h5 class="text-h5 font-weight-medium">
                {{ `Histórico do Agendamento #${props.agendamento_id}` }}
              </h5>
              <p class="text-caption mb-0">
                {{ historicoAgendamento.length }} registros -
                {{
                  paginationMeta(
                    { page, itemsPerPage },
                    historicoAgendamento.length || 0
                  )
                }}
              </p>
            </div>
          </template>
        </AppDrawerHeaderSection>

        <VCard>
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="searchQuery"
                  placeholder="Pesquisar histórico..."
                  clearable
                />
              </VCol>
              <VCol cols="12" md="3">
                <VSelect
                  v-model="orderBy"
                  :items="orderByItens"
                  placeholder="Ordenar por"
                />
              </VCol>
              <VCol cols="12" md="3">
                <VSelect
                  v-model="funcionarioQuery"
                  :items="funcionarios"
                  placeholder="Filtrar por funcionário"
                  clearable
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <div
          style="max-height: 550px; overflow-y: auto"
          v-if="filteredHistoricoAgendamento().length > 0"
          class="ml-4 pr-4"
        >
          <v-timeline side="end">
            <v-timeline-item
              v-for="(hist, index) in filteredHistoricoAgendamento()"
              :key="index"
              :dot-color="hist.color ?? 'primary'"
              :icon="hist.icon ?? undefined"
              fill-dot
            >
              <VCard
                :color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
                rounded="lg"
              >
                <VCardText class="py-3">
                  <p class="mb-0">
                    {{ hist.title }}
                  </p>
                  <p class="mb-1 text-sm">
                    {{ hist.description }}
                  </p>
                  <p class="mb-1 text-caption" style="opacity: 0.8">
                    <VIcon icon="tabler-calendar" class="mr-1" />
                    {{ moment(hist.date).format("DD/MM/YYYY HH:mm") }}
                  </p>
                  <p class="mb-0 text-caption" style="opacity: 0.8">
                    <VIcon icon="tabler-user" class="mr-1" />
                    {{ hist.feitoPor ?? "Sistema" }}
                  </p>
                </VCardText>
              </VCard>
            </v-timeline-item>
          </v-timeline>
        </div>

        <div v-else>
          <p class="text-center text-caption my-5">
            Nenhum registro encontrado
          </p>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
