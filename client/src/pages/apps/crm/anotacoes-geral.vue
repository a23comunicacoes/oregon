<script setup>
import moment from "moment";
import { temaAtual } from "@core/stores/config";
import { useFunctions } from "@/composables/useFunctions";
import { can } from "@layouts/plugins/casl";

const { tratarHtml } = useFunctions();
const router = useRouter();
const { setAlert } = useAlert();
const userData = useCookie("userData").value;

if (!can("view", "crm_funil_vendas") && !can("view", "crm_clientes")) {
  setAlert(
    "Você não tem permissão para acessar esta página.",
    "error",
    "tabler-alert-triangle",
    3000
  );
  router.push("/");
}

const loading = ref(true);
const anotacoes = ref([]);
const totalAnotacoes = ref(0);

const searchQuery = ref("");
const searchType = ref("");
const searchRefId = ref("");
const dataInicio = ref(null);
const dataFim = ref(null);
const funcionarioId = ref(null);
const page = ref(1);
const itemsPerPage = ref(20);

const typeOptions = [
  { value: "", label: "Todos" },
  { value: "cliente", label: "Cliente" },
  { value: "negocio", label: "Negócio" },
];

const getAnotacoes = async () => {
  loading.value = true;
  try {
    const res = await $api("/crm/list/all-anotacoes", {
      method: "GET",
      query: {
        q: searchQuery.value,
        searchType: searchType.value,
        searchRefId: searchRefId.value,
        dataInicio: dataInicio.value,
        dataFim: dataFim.value,
        funcionarioId: funcionarioId.value,
        page: page.value,
        itemsPerPage: itemsPerPage.value,
      },
    });

    if (!res) throw new Error("Erro ao buscar anotações");

    console.log("Anotações carregadas:", res);

    anotacoes.value = res.anotacoes || [];
    totalAnotacoes.value = res.totalAnotacoes || 0;
  } catch (error) {
    console.error("Erro ao buscar anotações:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        "Erro ao buscar anotações. Tente novamente mais tarde.",
      "error",
      "tabler-alert-triangle",
      7000
    );

    anotacoes.value = [];
    totalAnotacoes.value = 0;
  } finally {
    loading.value = false;
  }
};

const funcionarios = ref([]);

const getFuncionarios = async () => {
  try {
    const res = await $api("/users/list", {
      method: "GET",
      query: {
        itemsPerPage: 1000,
      },
    });

    if (!res) return;

    console.log("Funcionários carregados:", res);

    funcionarios.value = res.users;

    //Adicionar todos os funcionários
    funcionarios.value.unshift({
      id: null,
      fullName: "Todos",
    });

    if (funcionarios.value.find((f) => f.id == userData.id)) {
      let index = funcionarios.value.findIndex((f) => f.id == userData.id);
      funcionarios.value[index].fullName =
        funcionarios.value[index].fullName + " (Você)";
    }
  } catch (error) {
    console.error("Error fetching funcionarios", error);
  }
};

const viewFilters = ref(false);

const goToRef = (anotacao) => {
  if (anotacao.refType === "cliente") {
    router.push(`/cliente/${anotacao.refId}`);
  } else if (anotacao.refType === "negocio") {
    router.push(`/crm/funis/negocio/${anotacao.refId}`);
  }
};

watch([searchQuery, searchType, dataInicio, dataFim, funcionarioId, page], () => {
  getAnotacoes();
});

onMounted(async () => {
  await getFuncionarios();
  await getAnotacoes();
});
</script>

<template>
  <div>
    <div class="linha-flex w-100 justify-space-between mb-4">
      <div>
        <h2 class="text-h5 mb-0">Anotações Gerais</h2>
        <p class="text-sm mb-0">
          Visualize todas as anotações de clientes e negócios em um só lugar.
        </p>
      </div>

      <VBtn variant="text" @click="router.push('/crm/funis')">
        <VIcon icon="tabler-chevron-left" class="mr-2" />
        Voltar
      </VBtn>
    </div>

    <VCard rounded="xl" class="mb-4">
      <VCardText>
        <VRow>
          <VCol cols="12" md="6" class="d-flex flex-row gap-3 align-end">
            <AppTextField
              v-model="searchQuery"
              label="Buscar"
              placeholder="Buscar por conteúdo, cliente ou negócio"
              clearable
              prepend-inner-icon="tabler-search"
            />
          </VCol>

          <VCol cols="12" md="6" class="d-flex justify-end align-end">
            <VBtn @click="viewFilters = !viewFilters">
              <VIcon
                :icon="!viewFilters ? 'tabler-filter' : 'tabler-filter-off'"
                class="me-2"
              />
              {{ viewFilters ? "Ocultar Filtros" : "Mostrar Filtros" }}
            </VBtn>
          </VCol>

          <template v-if="viewFilters">
            <VCol cols="12" md="3">
              <AppSelect
                v-model="searchType"
                :items="typeOptions"
                item-value="value"
                item-title="label"
                label="Tipo de Referência"
                clearable
              />
            </VCol>

            <VCol cols="12" md="3">
              <AppSelect
                v-model="funcionarioId"
                :items="funcionarios"
                item-value="id"
                item-title="fullName"
                label="Funcionário"
                clearable
              />
            </VCol>

            <VCol cols="12" md="3">
              <AppTextField
                v-model="dataInicio"
                label="Data Início"
                type="date"
                clearable
              />
            </VCol>

            <VCol cols="12" md="3">
              <AppTextField
                v-model="dataFim"
                label="Data Fim"
                type="date"
                clearable
              />
            </VCol>
          </template>
        </VRow>
      </VCardText>
    </VCard>

    <VCard rounded="xl" v-if="!loading && anotacoes.length > 0">
      <VCardText>
        <div class="mb-2">
          <p class="text-sm mb-0">
            <strong>{{ totalAnotacoes }}</strong> anotação(ões) encontrada(s)
          </p>
        </div>

        <v-timeline side="end">
          <v-timeline-item
            v-for="(anotacao, index) in anotacoes"
            :key="index"
            fill-dot
            dot-color="#fff6d6"
          >
            <template v-slot:icon>
              <VIcon icon="tabler-note" color="secondary" />
            </template>
            <VCard color="#fff6d6">
              <VCardText
                class="pa-3 d-flex flex-row justify-space-between align-start"
              >
                <div class="w-100">
                  <div class="d-flex flex-row justify-space-between align-start mb-3">
                    <div class="flex-grow-1 mr-4">
                      <p class="mb-2 text-sm">
                        <VIcon
                          :icon="
                            anotacao.refType === 'cliente'
                              ? 'tabler-user'
                              : 'tabler-briefcase'
                          "
                          class="mr-1"
                        />
                        <strong>{{ anotacao.refType === "cliente" ? "Cliente" : "Negócio" }}:</strong>
                        {{ anotacao.refNome }}
                      </p>

                      <p
                        class="mb-2 text-sm"
                        v-if="anotacao.refType === 'negocio' && anotacao.clienteNome"
                      >
                        <VIcon icon="tabler-user" class="mr-1" />
                        <strong>Cliente:</strong>
                        {{ anotacao.clienteNome }}
                      </p>

                      <div class="d-flex flex-wrap mb-2">
                        <div
                          v-html="
                            tratarHtml(
                              anotacao.content.length > 200 && !anotacao.viewComplete
                                ? anotacao.content.substring(0, 200) + '...'
                                : anotacao.content
                            )
                          "
                          class="content-html"
                        />
                        <span
                          v-if="anotacao.content.length > 200"
                          class="text-primary text-sm cursor-pointer"
                          :class="{ 'ml-2': !anotacao.viewComplete }"
                          @click="anotacao.viewComplete = !anotacao.viewComplete"
                        >
                          {{ anotacao.viewComplete ? "Ver menos" : "Ver mais" }}
                        </span>
                      </div>

                      <p class="mb-1 text-caption" style="opacity: 0.8">
                        <VIcon icon="tabler-calendar" class="mr-1" />
                        {{ moment(anotacao.created_at).format("DD/MM/YYYY HH:mm") }}
                      </p>
                      <p class="mb-0 text-caption" style="opacity: 0.8">
                        <VIcon icon="tabler-user" class="mr-1" />
                        {{ anotacao?.feitoPor?.fullName ?? "Sistema" }}
                      </p>
                    </div>

                    <VBtn
                      size="small"
                      variant="tonal"
                      color="primary"
                      @click="goToRef(anotacao)"
                    >
                      <VIcon icon="tabler-external-link" class="mr-2" />
                      Ver {{ anotacao.refType === "cliente" ? "Cliente" : "Negócio" }}
                    </VBtn>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </v-timeline-item>
        </v-timeline>

        <VPagination
          v-model="page"
          :total-visible="5"
          :length="Math.ceil(totalAnotacoes / itemsPerPage)"
          class="mt-4"
        />
      </VCardText>
    </VCard>

    <VCard rounded="xl" v-else-if="!loading && anotacoes.length === 0">
      <VCardText>
        <p class="text-center text-sm my-6">Nenhuma anotação encontrada.</p>
      </VCardText>
    </VCard>

    <VCard rounded="xl" v-else-if="loading">
      <VCardText>
        <div class="d-flex justify-center align-center my-6">
          <VProgressCircular indeterminate color="primary" />
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

