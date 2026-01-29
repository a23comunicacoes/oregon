<script setup>
import moment from "moment";
import { temaAtual } from "@core/stores/config";
import { useFunctions } from "@/composables/useFunctions";
import { paginationMeta } from "@api-utils/paginationMeta";

const { copyEndereco, enderecoWaze, enderecoMaps, goTo } = useFunctions();
const router = useRouter();

const { setAlert } = useAlert();
const cliente = ref(null);

const props = defineProps({
  clienteData: {
    type: Object,
    default: null,
  },
  hideHistorico: {
    type: Boolean,
    default: false,
  },
});

if (props.clienteData) {
  cliente.value = props.clienteData;
}

watch(
  () => props.clienteData,
  (newVal) => {
    cliente.value = newVal;
  },
  { immediate: true }
);

const emit = defineEmits(["getCliente"]);

const searchQueryHistorico = ref("");

const orderByItensHistorico = [
  { title: "Mais recente", value: "date-desc" },
  { title: "Mais antigo", value: "date-asc" },
  { title: "A-Z", value: "title-asc" },
  { title: "Z-A", value: "title-desc" },
];

const orderByHistorico = ref("date-desc");
const funcionarioQueryHistorico = ref(null);
const pageHistorico = ref(1);
const itemsPerPageHistorico = ref(10);
const funcionariosHistorico = ref([]);

const tags = ref([]);
const searchQueryTags = ref("");
const loadingTag = ref(false);
const getTags = async () => {
  loadingTag.value = true;

  try {
    const res = await $api(`/crm/list/tags`, {
      method: "GET",
      query: {
        q: searchQueryTags.value,
      },
    });

    if (!res) throw new Error("Erro ao carregar tags");

    console.log("Tags carregadas:", res);

    tags.value = res.tags || [];
  } catch (error) {
    console.error("Erro ao parsear tags:", error, error?.response);
  } finally {
    loadingTag.value = false;
  }
};

getTags();

const newTag = ref({
  name: "",
  description: "",
  color: "",
});

const loadingSaveTag = ref(false);
const viewNewTag = ref(false);

const upsertTag = async () => {
  if (!newTag.value.name) {
    setAlert(
      "O nome da tag é obrigatório.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  loadingSaveTag.value = true;

  try {
    const res = await $api(
      !newTag.value.id ? `/crm/create/tag` : `/crm/update/tag`,
      {
        method: "POST",
        body: newTag.value,
      }
    );

    if (!res) throw new Error("Erro ao criar tag");

    console.log("Tag criada:", res);

    setAlert("Tag criada com sucesso.", "success", "tabler-check", 3000);

    if (res.id) {
      cliente.value.tags = cliente.value.tags || [];
      cliente.value.tags.push(res.id);
    }

    viewNewTag.value = false;
    newTag.value = {
      name: "",
      description: "",
      color: "",
    };

    await getTags();
  } catch (error) {
    console.error("Erro ao criar tag:", error, error?.response);

    setAlert(
      error?.response?._data?.message || "Erro ao criar tag. Tente novamente.",
      "error",
      "tabler-alert-triangle",
      3000
    );
  } finally {
    loadingSaveTag.value = false;
  }
};

const updateTagsCliente = async (tagId) => {
  if (!cliente.value) return;

  cliente.value.tags = cliente.value.tags || [];
  if (cliente.value.tags.includes(tagId)) {
    cliente.value.tags = cliente.value.tags.filter((t) => t !== tagId);
  } else {
    cliente.value.tags.push(tagId);
  }

  try {
    const res = await $api(`/crm/save/tags/`, {
      method: "POST",
      body: {
        refType: "cliente",
        refId: cliente.value.id,
        tags: cliente.value.tags,
      },
    });

    if (!res) throw new Error("Erro ao atualizar cliente");

    console.log("Cliente atualizado:", res);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error, error?.response);

    setAlert(
      error?.response?._data?.message ||
        "Erro ao atualizar cliente. Tente novamente.",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }
};

const calcularPeriodo = (contrato) => {
  if (!contrato.periodoType || !contrato.periodo || !contrato.inicioData)
    return "";

  let inicio = moment(contrato.inicioData);

  switch (contrato.periodoType) {
    case "Mensal":
      return inicio.add(contrato.periodo, "months").format("DD/MM/YYYY");
    case "Trimestral":
      return inicio.add(contrato.periodo * 3, "months").format("DD/MM/YYYY");
    case "Semestral":
      return inicio.add(contrato.periodo * 6, "months").format("DD/MM/YYYY");
    case "Anual":
      return inicio.add(contrato.periodo, "years").format("DD/MM/YYYY");
  }

  return "";
};

const formatValue = (value) => {
  if (!value) return "R$ 0,00";
  
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const filteredHistoricoCliente = computed(() => {
  if (!cliente.value?.historico) return [];
  
  let historico = [...cliente.value.historico];

  // Filtro por pesquisa
  if (searchQueryHistorico.value) {
    historico = historico.filter((item) =>
      item.title?.toLowerCase().includes(searchQueryHistorico.value.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQueryHistorico.value.toLowerCase())
    );
  }

  // Filtro por funcionário
  if (funcionarioQueryHistorico.value) {
    historico = historico.filter(
      (item) => item.feitoPor === funcionarioQueryHistorico.value
    );
  }

  // Ordenação
  if (orderByHistorico.value) {
    historico = historico.sort((a, b) => {
      if (orderByHistorico.value === "date-desc") {
        return new Date(b.date) - new Date(a.date);
      } else if (orderByHistorico.value === "date-asc") {
        return new Date(a.date) - new Date(b.date);
      } else if (orderByHistorico.value === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      } else if (orderByHistorico.value === "title-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      return 0;
    });
  }

  // Paginação
  const start = (pageHistorico.value - 1) * itemsPerPageHistorico.value;
  const end = start + parseInt(itemsPerPageHistorico.value);
  
  return historico.slice(start, end);
});

const totalHistorico = computed(() => {
  if (!cliente.value?.historico) return 0;
  
  let historico = [...cliente.value.historico];

  if (searchQueryHistorico.value) {
    historico = historico.filter((item) =>
      item.title?.toLowerCase().includes(searchQueryHistorico.value.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQueryHistorico.value.toLowerCase())
    );
  }

  if (funcionarioQueryHistorico.value) {
    historico = historico.filter(
      (item) => item.feitoPor === funcionarioQueryHistorico.value
    );
  }

  return historico.length;
});

watch(() => cliente.value?.historico, (newVal) => {
  if (!newVal || !Array.isArray(newVal)) return;
  
  funcionariosHistorico.value = [];
  
  for (let item of newVal) {
    if (
      !funcionariosHistorico.value.some((funcionario) => funcionario.title === item.feitoPor)
    ) {
      funcionariosHistorico.value.push({
        title: item.feitoPor,
        value: item.feitoPor,
      });
    }
  }

  funcionariosHistorico.value = funcionariosHistorico.value.sort(
    (a, b) => a.title?.localeCompare(b.title || "") || 0
  );

  funcionariosHistorico.value.unshift({
    title: "Todos",
    value: null,
  });
}, { immediate: true, deep: true });
</script>
<template>
  <VRow>
    <VCol cols="12" :md="props.hideHistorico ? 12 : 4">
      <div class="mt-1 mb-4">
        <h2
          class="mb-4"
          :class="{
            'text-h4': !props.hideHistorico,
            'text-h6': props.hideHistorico,
          }"
        >
          <VIcon
            icon="tabler-align-justified"
            class="mr-1"
            v-if="props.hideHistorico"
          />
          {{ cliente?.nome ? cliente.nome : "Carregando..." }}
        </h2>

        <VMenu
          offset-y
          max-width="300"
          min-width="300"
          transition="scale-transition"
          rounded="xl"
          :close-on-content-click="false"
        >
          <template v-slot:activator="{ props }">
            <p class="mb-3 cursor-pointer text-primary" v-bind="props">
              <VIcon icon="tabler-tags" class="mr-1" />
              Etiquetas ({{ cliente?.tags?.length ?? 0 }})
            </p>
          </template>

          <VList>
            <VListItem rounded>
              <VTextField
                v-model="searchQueryTags"
                label="Buscar etiquetas"
                density="compact"
                :loading="loadingTag"
                clearable
                @update:model-value="getTags"
              />
            </VListItem>

            <VListItem
              v-for="(tag, index) in tags"
              :key="index"
              rounded
              @click="updateTagsCliente(tag.id)"
            >
              <VChip :color="tag.color || 'primary'" variant="flat" label>
                {{ tag.name }}
              </VChip>
            </VListItem>

            <VListItem rounded>
              <VBtn
                :loading="loadingSaveTag"
                color="primary"
                class="w-100"
                size="small"
                variant="tonal"
                @click="viewNewTag = !viewNewTag"
              >
                <VIcon icon="tabler-plus" class="mr-2" />
                Nova Etiqueta
              </VBtn>
            </VListItem>
          </VList>
        </VMenu>

        <VDialog v-model="viewNewTag" max-width="500">
          <VCard v-if="newTag">
            <VCardText>
              <AppDrawerHeaderSection
                customClass="pa-0"
                :title="newTag?.id ? 'Editar Etiqueta' : 'Nova Etiqueta'"
                @cancel="
                  viewNewTag = false;
                  newTag = { name: '', description: '', color: '' };
                "
              />

              <AppTextField
                v-model="newTag.name"
                label="Nome"
                placeholder="Nome da etiqueta"
                class="mb-4"
                :rules="[requiredValidator]"
                required
              />

              <label class="v-label mb-2 text-body-2 text-high-emphasis">
                Cor da etiqueta
              </label>
              <div class="d-flex justify-center mb-6">
                <VColorPicker
                  class="color-picker-custom"
                  v-model="newTag.color"
                  :swatches="[
                    ['#FFFF00', '#AAAA00', '#555500'], // amarelo
                    ['#00FF00', '#00AA00', '#005500'], // verde
                    ['#FFA500', '#FF8C00', '#FF4500'], // laranja
                    ['#FF0000', '#AA0000', '#550000'], // vermelho
                    ['#FF00FF', '#AA00AA', '#550055'], // mantendo
                  ]"
                  show-swatches
                  hide-inputs
                  hide-sliders
                  canvas-height="100px"
                  :modes="['hexa']"
                />
              </div>

              <div class="d-flex flex-row align-center justify-center">
                <VBtn
                  :loading="loadingSaveTag"
                  color="primary"
                  class="mr-4"
                  @click="upsertTag"
                >
                  <VIcon icon="tabler-check" class="mr-2" />
                  Salvar
                </VBtn>

                <VBtn
                  variant="text"
                  @click="
                    viewNewTag = false;
                    newTag = { name: '', description: '', color: '' };
                  "
                >
                  Cancelar
                </VBtn>
              </div>
            </VCardText>
          </VCard>
        </VDialog>

        <div class="d-flex flex-row mb-3" v-if="cliente?.tags?.length">
          <template v-for="(tag, index) in cliente?.tags || []" :key="index">
            <VChip
              v-if="tags.find((t) => t.id == tag)"
              class="ma-1"
              :color="tags.find((t) => t.id == tag)?.color || 'primary'"
              variant="flat"
              label
            >
              {{ tags.find((t) => t.id == tag)?.name }}
            </VChip>
          </template>
        </div>

        <p
          class="mb-3 cursor-pointer text-primary"
          v-if="cliente.email"
          @click="goTo(`mailto:${cliente.email}`)"
        >
          <VIcon icon="tabler-mail" class="mr-1" />
          {{ cliente.email }}
        </p>
        <p
          class="mb-3 cursor-pointer text-primary"
          v-if="cliente.celular"
          @click="goTo(`tel:${cliente.celular}`)"
        >
          <VIcon icon="tabler-phone" class="mr-1" />
          {{ cliente.celular }}
        </p>
        <p class="mb-3" v-if="cliente.personType">
          <VIcon icon="tabler-user" class="mr-1" />
          Pessoa {{ cliente.personType }}
        </p>
        <p class="mb-3" v-if="cliente.cpf">
          <VIcon icon="tabler-id" class="mr-1" />
          {{ cliente.cpf }}
        </p>
        <p class="mb-3 text-sm">
          Cadastro em:
          {{
            cliente.created_at
              ? moment(cliente.created_at).format("DD/MM/YYYY")
              : "-"
          }}
        </p>
      </div>

      <VExpansionPanels>
        <VExpansionPanel
          v-if="cliente?.contatos?.length"
          :title="`Outros Contatos (${cliente.contatos.length})`"
          :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
          rounded="lg"
        >
          <VExpansionPanelText class="pt-4">
            <div v-for="(contato, index) in cliente.contatos" :key="index">
              <p class="mb-2">
                <VIcon
                  :icon="
                    contato.type == 'phone' ? 'tabler-phone' : 'tabler-mail'
                  "
                  class="mr-1"
                />
                {{ contato.value }}
              </p>
              <v-divider
                v-if="index < cliente.contatos.length - 1"
                class="my-3"
              />
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>

        <VExpansionPanel
          v-if="cliente?.endereco?.length"
          :title="`Endereços (${cliente.endereco.length})`"
          :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
          rounded="lg"
        >
          <VExpansionPanelText class="pt-4">
            <VCard
              rounded="lg"
              v-for="endereco in cliente.endereco"
              :key="endereco.id"
              class="mb-4 pa-4 text-sm"
            >
              <div class="d-flex flex-column flex-md-row gap-2 mb-3">
                <IconBtn
                  color="warning"
                  variant="tonal"
                  @click="copyEndereco(endereco)"
                >
                  <VIcon icon="tabler-copy" />
                </IconBtn>

                <IconBtn
                  color="info"
                  variant="tonal"
                  @click="enderecoWaze(endereco)"
                >
                  <VIcon icon="tabler-brand-waze" />
                </IconBtn>

                <IconBtn
                  color="success"
                  variant="tonal"
                  @click="enderecoMaps(endereco)"
                >
                  <VIcon icon="tabler-brand-google-maps" />
                </IconBtn>
              </div>

              <p class="mb-0">
                <strong>Endereço:</strong>
                {{ endereco.logradouro }}, {{ endereco.numero }}
                <span v-if="endereco.complemento">
                  - {{ endereco.complemento }}
                </span>
              </p>
              <p class="mb-0" v-if="endereco.bairro">
                <strong>Bairro:</strong> {{ endereco.bairro }}
              </p>
              <p class="mb-0" v-if="endereco.cidade && endereco.estado">
                <strong>Cidade:</strong> {{ endereco.cidade }} -
                {{ endereco.estado }}
              </p>
              <p class="mb-0" v-if="endereco.cep">
                <strong>CEP:</strong> {{ endereco.cep }}
              </p>
            </VCard>
          </VExpansionPanelText>
        </VExpansionPanel>

        <VExpansionPanel
          v-if="cliente?.contratos?.length"
          :title="`Contratos (${cliente.contratos.length})`"
          :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
          rounded="lg"
        >
          <VExpansionPanelText class="pt-4">
            <VCard
              rounded="lg"
              v-for="contrato in cliente.contratos"
              :key="contrato.numero"
              class="mb-4 pa-4 text-sm"
            >
            <div>
              <div class="d-flex flex-row align-center mb-1">
                <p class="mb-0 text-sm">N° #{{ contrato.numero }}</p>
                <VChip
                  :color="contrato.ativo ? 'success' : 'error'"
                  size="small"
                  label
                  class="ml-2"
                >
                  {{ contrato.ativo ? "Ativo" : "Inativo" }}
                </VChip>
              </div>

              <p class="mb-0 text-sm">
                <strong>Período:</strong> {{ contrato.periodo }} ({{
                  contrato.periodoType
                }})
              </p>

              <p class="mb-0 text-sm">
                <strong>Início:</strong>
                {{ moment(contrato.inicioData).format("DD/MM/YYYY") }}
                -
                <strong>Fim:</strong> {{ calcularPeriodo(contrato) }}
              </p>

              <p class="mb-0 text-sm">
                <strong>Valor:</strong>
                {{ formatValue(contrato.valor) }}
              </p>
            </div>
            </VCard>
            </VExpansionPanelText>
            </VExpansionPanel>
      </VExpansionPanels>
    </VCol>

    <VCol cols="12" md="8" v-if="!props.hideHistorico">
      <p class="mb-2">Histórico</p>

      <VCard class="mb-4">
        <VCardText>
          <p class="text-sm mb-2">
            {{ totalHistorico }} registros -
            {{
              paginationMeta(
                { page: pageHistorico, itemsPerPage: itemsPerPageHistorico },
                totalHistorico
              )
            }}
          </p>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="searchQueryHistorico"
                placeholder="Pesquisar histórico..."
                density="compact"
                clearable
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="orderByHistorico"
                :items="orderByItensHistorico"
                placeholder="Ordenar por"
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="funcionarioQueryHistorico"
                :items="funcionariosHistorico"
                placeholder="Filtrar por funcionário"
                density="compact"
                clearable
              />
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <div
        style="max-height: 550px; overflow-y: auto"
        v-if="filteredHistoricoCliente.length > 0"
        class="ml-4 pr-4"
      >
        <v-timeline side="end">
          <v-timeline-item
            v-for="(hist, index) in filteredHistoricoCliente"
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

      <VPagination
        v-if="totalHistorico > itemsPerPageHistorico"
        v-model="pageHistorico"
        :length="Math.ceil(totalHistorico / itemsPerPageHistorico)"
        :total-visible="5"
        class="mt-4"
      />
    </VCol>
  </VRow>
</template>
