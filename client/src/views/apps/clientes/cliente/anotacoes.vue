<script setup>
  import moment from "moment";
  import { temaAtual } from "@core/stores/config";
  import { useFunctions } from "@/composables/useFunctions";
  import { QuillEditor } from "@vueup/vue-quill";
  import "@vueup/vue-quill/dist/vue-quill.snow.css";

  const { tratarHtml } = useFunctions();
  const router = useRouter();
  const userData = useCookie("userData").value;

  const { setAlert } = useAlert();
  const data = ref(null);

  const props = defineProps({
    objData: {
      type: Object,
      default: null,
    },
    type: {
      type: String,
      default: "cliente", // cliente ou negocio
    },
  });

  if (props.objData) {
    data.value = props.objData;
    console.log("Anotações", data.value?.anotacoes);
  }

  watch(
    () => props.objData,
    (newVal) => {
      data.value = newVal;

      console.log("Anotações", data.value?.anotacoes);
    },
    { immediate: true }
  );

  const emit = defineEmits(["getData"]);

  let refAnotacao = {
    content: "",
    feitoPor: {
      id: userData.id,
      fullName: userData.fullName,
    },
    created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
    updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
  };

  const newAnotacao = ref({ ...refAnotacao });
  const viewNewAnotacao = ref(false);

  const loadingUpsert = ref(false);

  const upsertAnotacao = async () => {
    if (!newAnotacao.value.content) {
      setAlert(
        "Digite o conteúdo da anotação.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }
    loadingUpsert.value = true;

    try {
      const res = await $api("/crm/upsert/anotacao", {
        method: "POST",
        body: {
          ...newAnotacao.value,
          refId: data.value.id,
          refType: props.type, // cliente ou negocio
        },
      });

      if (!res) throw new Error("Erro ao salvar anotação");

      console.log("Anotação salva:", res);

      setAlert("Anotação salva com sucesso.", "success", "tabler-check", 3000);

      // Reset form
      newAnotacao.value = { ...refAnotacao };

      if (res.anotacao?.id) {
        data.value.anotacoes = data.value.anotacoes || [];
        // Se já existir, atualiza
        let index = data.value.anotacoes.findIndex(
          (a) => a.id === res.anotacao.id
        );
        if (index > -1) {
          data.value.anotacoes[index] = res.anotacao;
        } else {
          // Se não existir, adiciona
          data.value.anotacoes.push(res.anotacao);
        }
      }

      viewNewAnotacao.value = false;
    } catch (error) {
      console.error("Erro ao salvar anotação:", error);
      setAlert(
        error?.response?._data?.message ||
          "Erro ao salvar anotação. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    } finally {
      loadingUpsert.value = false;
    }
  };

  const deleteAnotacao = async (id) => {
    if (!id) return;

    let index = data.value.anotacoes.findIndex((a) => a.id === id);
    if (index === -1) return;

    let anotacao = data.value.anotacoes[index];

    const confirmar = confirm(
      `Tem certeza que deseja excluir a anotação? Esta ação não pode ser desfeita.`
    );

    if (!confirmar) return;

    try {
      const res = await $api(`/crm/delete/anotacao`, {
        method: "DELETE",
        body: {
          refId: data.value.id,
          refType: props.type, // cliente ou negocio
          anotacaoId: id,
        },
      });

      if (!res) throw new Error("Erro ao excluir anotação");

      setAlert(
        "Anotação excluída com sucesso.",
        "success",
        "tabler-check",
        3000
      );

      // Remover da lista
      data.value.anotacoes = data.value.anotacoes.filter((a) => a.id !== id);
    } catch (error) {
      console.error("Erro ao excluir anotação:", error);
      setAlert(
        error?.response?._data?.message ||
          "Erro ao excluir anotação. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const searchQuery = ref("");
  const dataDeQuery = ref(null);
  const dataAteQuery = ref(null);
  const typeQuery = ref(null);
  const funcionarioQuery = ref(null);

  const page = ref(1);
  const itemsPerPage = ref(10);
  const orderBy = ref("date");

  const filteredAnotacoes = computed(() => {
    if (!data.value || !data.value.anotacoes) return [];

    let anotacoes = [...data.value.anotacoes];

    if (searchQuery.value) {
      const searchLower = searchQuery.value.toLowerCase();
      anotacoes = anotacoes.filter(
        (a) =>
          (a.content || "")?.toLowerCase()?.includes(searchLower) ||
          (a.feitoPor?.fullName || "").toLowerCase().includes(searchLower)
      );
    }

    if (dataDeQuery.value) {
      const dataDe = moment(dataDeQuery.value).startOf("day");
      anotacoes = anotacoes.filter((a) =>
        moment(a.created_at).isSameOrAfter(dataDe)
      );
    }

    if (dataAteQuery.value) {
      const dataAte = moment(dataAteQuery.value).endOf("day");
      anotacoes = anotacoes.filter((a) =>
        moment(a.created_at).isSameOrBefore(dataAte)
      );
    }

    if (typeQuery.value) {
      anotacoes = anotacoes.filter((a) => a.type === typeQuery.value);
    }

    if (funcionarioQuery.value) {
      anotacoes = anotacoes.filter(
        (a) => a.feitoPor?.id == funcionarioQuery.value
      );
    }

    // Ordenar
    anotacoes.sort((a, b) => {
      if (orderBy.value === "date") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (orderBy.value === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    //Offset e limite
    const start = (page.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return anotacoes.slice(start, end);
  });

  const viewFilters = ref(false);

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
      console.error("Error fetching resources", error);
    }
  };

  getFuncionarios();

  const toolbarOptions = [
    [{ color: [] }],
    [{ align: [] }],
    ["bold", "italic", "underline", "strike"],
    [{ header: 1 }, { header: 2 }],
    [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["clean"],
  ];
</script>
<template>
  <div class="d-flex flex-row align-center mb-4 justify-space-between">
    <div>
      <p class="mb-0 text-h5">Anotações</p>
      <p class="mb-0 text-caption">
        Crie anotações sobre o
        {{ props.type === "cliente" ? "cliente" : "negócio" }} para manter um
        histórico de interações.
      </p>
    </div>

    <VBtn
      color="primary"
      :loading="loadingUpsert"
      @click="viewNewAnotacao = true"
    >
      <VIcon icon="tabler-plus" class="me-2" />
      Nova Anotação
    </VBtn>
  </div>

  <VDialog v-model="viewNewAnotacao" width="600" persistent>
    <VCard>
      <VCardText>
        <AppDrawerHeaderSection
          customClass="pa-0 mb-3"
          :title="newAnotacao?.id ? 'Editar Anotação' : 'Nova Anotação'"
          @cancel="
            viewNewAnotacao = false;
            newAnotacao = refAnotacao;
          "
        />
        <VRow>
          <VCol cols="12">
            <div>
              <QuillEditor
                v-model:content="newAnotacao.content"
                theme="snow"
                :toolbar="toolbarOptions"
                class="inputQuill altura-stick"
                contentType="html"
                placeholder="Digite o conteúdo da anotação..."
              />
            </div>
          </VCol>
        </VRow>

        <div class="d-flex flex-row justify-end mt-4">
          <VBtn
            variant="outlined"
            color="secondary"
            class="me-3"
            @click="
              viewNewAnotacao = false;
              newAnotacao = refAnotacao;
            "
            :disabled="loadingUpsert"
          >
            Cancelar
          </VBtn>
          <VBtn
            color="primary"
            @click="upsertAnotacao()"
            :loading="loadingUpsert"
          >
            Salvar
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <VCard rounded="xl" class="mb-4">
    <VCardText>
      <VRow>
        <VCol cols="12" class="d-flex flex-row gap-3 align-end">
          <AppTextField
            v-model="searchQuery"
            label="Buscar"
            placeholder="Buscar por título ou descrição"
            clearable
          />

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
            <AppTextField
              v-model="dataDeQuery"
              label="Data de"
              type="date"
              clearable
            />
          </VCol>

          <VCol cols="12" md="3">
            <AppTextField
              v-model="dataAteQuery"
              label="Data até"
              type="date"
              clearable
            />
          </VCol>

          <VCol cols="12" md="3">
            <AppSelect
              v-model="funcionarioQuery"
              :items="funcionarios"
              item-value="id"
              item-title="fullName"
              label="Funcionário"
              clearable
            />
          </VCol>
        </template>
      </VRow>
    </VCardText>
  </VCard>

  <div v-if="data?.anotacoes?.length > 0">
    <v-timeline side="end">
      <v-timeline-item
        v-for="(anotacao, index) in filteredAnotacoes"
        :key="index"
        fill-dot
        dot-color="#fff6d6"
      >
        <template v-slot:icon>
          <VIcon icon="tabler-note" color="secondary" />
        </template>
        <VCard color="#fff6d6">
          <VCardText
            class="pa-3 d-flex flex-row justify-space-between align-center"
          >
            <div>
              <div class="d-flex flex-wrap mb-4">
                <div
                  v-html="
                    tratarHtml(
                      anotacao.content.length > 150 && !anotacao.viewComplete
                        ? anotacao.content.substring(0, 150) + '...'
                        : anotacao.content
                    )
                  "
                  class="content-html"
                />
                <span
                  v-if="anotacao.content.length > 150"
                  class="text-primary text-sm cursor-pointer"
                  :class="{ 'ml-2': !anotacao.viewComplete }"
                  @click="anotacao.viewComplete = !anotacao.viewComplete"
                >
                  {{ anotacao.viewComplete ? "Ver menos" : "Ver mais" }}
                </span>
              </div>
              <p class="mb-1 text-sm" style="opacity: 0.8">
                <VIcon icon="tabler-calendar" class="mr-1" />
                {{ moment(anotacao.created_at).format("DD/MM/YYYY HH:mm") }}
              </p>
              <p class="mb-2 text-caption" style="opacity: 0.8">
                <VIcon icon="tabler-user" class="mr-1" />
                {{ anotacao?.feitoPor?.fullName ?? "Sistema" }}
              </p>
            </div>

            <div class="d-flex flex-row gap-2 align-center">
              <IconBtn
                variant="tonal"
                color="primary"
                @click="
                  newAnotacao = { ...anotacao };
                  viewNewAnotacao = true;
                "
              >
                <VIcon icon="tabler-eye" />
              </IconBtn>

              <IconBtn
                color="error"
                variant="tonal"
                @click="deleteAnotacao(anotacao.id)"
              >
                <VIcon icon="tabler-trash" />
              </IconBtn>
            </div>
          </VCardText>
        </VCard>
      </v-timeline-item>
    </v-timeline>

    <VPagination
      v-model="page"
      :total-visible="5"
      :length="Math.ceil(data.anotacoes.length / itemsPerPage)"
    />
  </div>

  <p v-else class="text-center text-sm my-6">Nenhuma anotação encontrada.</p>
</template>
