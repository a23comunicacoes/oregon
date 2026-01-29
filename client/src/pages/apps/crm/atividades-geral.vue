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
const atividades = ref([]);
const totalAtividades = ref(0);

const searchQuery = ref("");
const searchType = ref("");
const searchRefId = ref("");
const typeAtividade = ref("");
const dataInicio = ref(null);
const dataFim = ref(null);
const funcionarioId = ref(null);
const concluido = ref("");
const page = ref(1);
const itemsPerPage = ref(20);

const typesAtividades = [
  { value: "", label: "Todos" },
  { value: "Ligação", label: "Ligação", icon: "tabler-phone" },
  { value: "Reunião", label: "Reunião", icon: "tabler-calendar-event" },
  { value: "E-mail", label: "E-mail", icon: "tabler-mail" },
  { value: "Tarefa", label: "Tarefa", icon: "tabler-check" },
  { value: "Outro", label: "Outro", icon: "tabler-dots" },
];

const statusOptions = [
  { value: "", label: "Todos" },
  { value: "true", label: "Concluído" },
  { value: "false", label: "Pendente" },
];

const typeOptions = [
  { value: "", label: "Todos" },
  { value: "cliente", label: "Cliente" },
  { value: "negocio", label: "Negócio" },
];

const getAtividades = async () => {
  loading.value = true;
  try {
    const res = await $api("/crm/list/all-atividades", {
      method: "GET",
      query: {
        q: searchQuery.value,
        searchType: searchType.value,
        searchRefId: searchRefId.value,
        typeAtividade: typeAtividade.value,
        dataInicio: dataInicio.value,
        dataFim: dataFim.value,
        funcionarioId: funcionarioId.value,
        concluido: concluido.value,
        page: page.value,
        itemsPerPage: itemsPerPage.value,
      },
    });

    if (!res) throw new Error("Erro ao buscar atividades");

    console.log("Atividades carregadas:", res);

    atividades.value = res.atividades || [];
    totalAtividades.value = res.totalAtividades || 0;
  } catch (error) {
    console.error("Erro ao buscar atividades:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        "Erro ao buscar atividades. Tente novamente mais tarde.",
      "error",
      "tabler-alert-triangle",
      7000
    );

    atividades.value = [];
    totalAtividades.value = 0;
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

const goToRef = (atividade) => {
  if (atividade.refType === "cliente") {
    router.push(`/cliente/${atividade.refId}`);
  } else if (atividade.refType === "negocio") {
    router.push(`/crm/funis/negocio/${atividade.refId}`);
  }
};

watch([searchQuery, searchType, typeAtividade, dataInicio, dataFim, funcionarioId, concluido, page], () => {
  getAtividades();
});

onMounted(async () => {
  await getFuncionarios();
  await getAtividades();
});
</script>

<template>
  <div>
    <div class="linha-flex w-100 justify-space-between mb-4">
      <div>
        <h2 class="text-h5 mb-0">Atividades Gerais</h2>
        <p class="text-sm mb-0">
          Visualize todas as atividades de clientes e negócios em um só lugar.
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
              placeholder="Buscar por título, descrição, cliente ou negócio"
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
                v-model="typeAtividade"
                :items="typesAtividades"
                item-value="value"
                item-title="label"
                label="Tipo de Atividade"
                clearable
              />
            </VCol>

            <VCol cols="12" md="3">
              <AppSelect
                v-model="concluido"
                :items="statusOptions"
                item-value="value"
                item-title="label"
                label="Status"
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

    <VCard rounded="xl" v-if="!loading && atividades.length > 0">
      <VCardText>
        <div class="mb-2">
          <p class="text-sm mb-0">
            <strong>{{ totalAtividades }}</strong> atividade(s) encontrada(s)
          </p>
        </div>

        <v-timeline side="end">
          <v-timeline-item
            v-for="(atividade, index) in atividades"
            :key="index"
            fill-dot
          >
            <template v-slot:icon>
              <VIcon
                :icon="
                  atividade.type
                    ? typesAtividades.find((t) => t.value === atividade.type)
                        ?.icon
                    : 'tabler-dots'
                "
                color="primary"
              />
            </template>
            <VCard>
              <VCardText
                class="pt-3 d-flex flex-row justify-space-between align-center"
                :class="atividade.description ? 'pb-1' : 'pb-3'"
              >
                <div class="w-100">
                  <div class="d-flex flex-row justify-space-between align-start mb-2">
                    <p class="mb-0 text-h6">
                      <VChip
                        size="small"
                        label
                        :color="
                          atividade.concluido
                            ? 'success'
                            : moment(atividade.date).isBefore(moment(), 'day')
                            ? 'error'
                            : moment(atividade.date).isSame(moment(), 'day')
                            ? 'info'
                            : 'primary'
                        "
                        variant="flat"
                        class="mr-2"
                        v-if="
                          atividade.concluido ||
                          moment(atividade.date).isBefore(moment(), 'day') ||
                          moment(atividade.date).isSame(moment(), 'day')
                        "
                      >
                        {{
                          atividade.concluido
                            ? "Concluído"
                            : moment(atividade.date).isBefore(moment(), "day")
                            ? "Atrasado"
                            : "Hoje"
                        }}
                      </VChip>
                      {{ atividade.title }}
                    </p>

                    <VBtn
                      size="small"
                      variant="tonal"
                      color="primary"
                      @click="goToRef(atividade)"
                    >
                      <VIcon icon="tabler-external-link" class="mr-2" />
                      Ver {{ atividade.refType === "cliente" ? "Cliente" : "Negócio" }}
                    </VBtn>
                  </div>

                  <p class="mb-1 text-sm">
                    <VIcon
                      :icon="
                        atividade.refType === 'cliente'
                          ? 'tabler-user'
                          : 'tabler-briefcase'
                      "
                      class="mr-1"
                    />
                    <strong>{{ atividade.refType === "cliente" ? "Cliente" : "Negócio" }}:</strong>
                    {{ atividade.refNome }}
                  </p>

                  <p
                    class="mb-1 text-sm"
                    v-if="atividade.refType === 'negocio' && atividade.clienteNome"
                  >
                    <VIcon icon="tabler-user" class="mr-1" />
                    <strong>Cliente:</strong>
                    {{ atividade.clienteNome }}
                  </p>

                  <p class="mb-1 text-sm" style="opacity: 0.8">
                    <span>
                      <VIcon icon="tabler-calendar" class="mr-1" />
                      {{
                        atividade.hora
                          ? moment(atividade.date + " " + atividade.hora).format(
                              "DD/MM/YYYY HH:mm"
                            )
                          : moment(atividade.date).format("DD/MM/YYYY")
                      }}
                    </span>
                    <span v-if="atividade.horaAte || atividade.dateAte">
                      -
                      {{
                        atividade.horaAte
                          ? moment(
                              atividade.dateAte + " " + atividade.horaAte
                            ).format("DD/MM/YYYY HH:mm")
                          : atividade.dateAte
                          ? moment(atividade.dateAte).format("DD/MM/YYYY")
                          : ""
                      }}
                    </span>
                  </p>
                  <p class="mb-2 text-caption" style="opacity: 0.8">
                    <VIcon icon="tabler-user" class="mr-1" />
                    {{ atividade?.funcionario?.fullName ?? "Sistema" }}
                  </p>
                </div>
              </VCardText>
            </VCard>
            <VCard v-if="atividade.description" color="#fff6d6">
              <VCardText class="pt-2 pb-3">
                <p class="mb-1 text-sm" style="opacity: 0.8">
                  <VIcon icon="tabler-align-justified" class="mr-1" />
                  Descrição
                </p>

                <p class="mb-0 text-sm">
                  <span
                    v-html="
                      tratarHtml(
                        atividade.description.length > 100 && !atividade.viewDesc
                          ? atividade.description.substring(0, 100) + '...'
                          : atividade.description.replace(/\n/g, '<br />')
                      )
                    "
                  />

                  <span
                    v-if="atividade.description.length > 100"
                    class="ml-1 text-primary cursor-pointer"
                    @click="atividade.viewDesc = !atividade.viewDesc"
                  >
                    {{ atividade.viewDesc ? "Ver menos" : "Ver mais" }}
                  </span>
                </p>
              </VCardText>
            </VCard>
          </v-timeline-item>
        </v-timeline>

        <VPagination
          v-model="page"
          :total-visible="5"
          :length="Math.ceil(totalAtividades / itemsPerPage)"
          class="mt-4"
        />
      </VCardText>
    </VCard>

    <VCard rounded="xl" v-else-if="!loading && atividades.length === 0">
      <VCardText>
        <p class="text-center text-sm my-6">Nenhuma atividade encontrada.</p>
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

