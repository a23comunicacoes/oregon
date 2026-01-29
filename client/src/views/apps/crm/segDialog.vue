<script setup>
import { PerfectScrollbar } from "vue3-perfect-scrollbar";
import { useAlert } from "@/composables/useAlert";
import { watch } from "vue";

const loading = ref(false);
const isNewSeg = ref(true);

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  segData: Object,
});

const emit = defineEmits([
  "update:isDrawerOpen",
  "updateSeg",
  "closeDrawer",
  "newSegEvent",
]);

console.log("segData:", props.segData);

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

const segmentacao = ref({
  id: 0,
  name: "",
  description: "",
  rules: [],
});

watch(
  () => props.isDrawerOpen,
  (newVal) => {
    if (!newVal) {
      limparSeg();
    } else {
      getInfos();
    }
  }
);

const limparSeg = () => {
  segmentacao.value = {
    id: 0,
    name: "",
    description: "",
    rules: [],
  };

  infos.value = [];
  totalUsersSeg.value = 0;
};

const closeNavigationDrawer = () => {
  emit("update:isDrawerOpen", false);
  limparSeg();
};

const handleDrawerModelValueUpdate = (val) => {
  emit("update:isDrawerOpen", val);
};

const addRule = () => {
  segmentacao.value.rules.push({
    id: new Date().getTime(),
    field: null,
    operator: null,
    logicalOperator: null,
    value: null,
    valueIsSelect: false,
    valueIsDinheiro: false,
    itensValueSelect: [],
  });
};

const removeRule = (index) => {
  segmentacao.value.rules.splice(index, 1);
  getTotalUsersSeg();
};

const infos = ref([]);
const getInfos = async () => {
  try {
    const res = await $api("/disparos/seg/get-infos-users", {
      method: "GET",
    });

    if (!res) throw new Error("Erro ao buscar infos");

    console.log("infos:", res);

    infos.value = res;
  } catch (error) {
    console.error("Erro ao buscar infos:", error, error.response);
  }
};

const tags = ref([]);
const getTags = async () => {
  try {
    const res = await $api("/crm/list/tags", {
      method: "GET",
    });

    if (!res) return;

    console.log("res tagss", res);

    tags.value = (res.tags || []).map((tag) => {
      return {
        title: tag.name,
        value: tag.id,
      };
    });
  } catch (error) {
    console.error("Error tags", error, error.response);
  }
};

const funis = ref([]);
const getFunis = async () => {
  try {
    const res = await $api("/crm/list/funil");

    if (!res) throw new Error("Erro ao buscar funis de vendas");

    console.log("Funis carregados:", res);

    funis.value = res;
  } catch (error) {
    console.error("Error fetching funis", error, error.response);
    setAlert(
      error?.response?._data?.message || "Erro ao buscar funis de vendas",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }
};

const fontesClientes = ref([]);

const getConfig = async () => {
  fontesClientes.value = [];

  try {
    const res = await $api("/config/get", {
      method: "GET",
      query: { type: "fonte_cliente" },
    });

    if (!res) throw new Error("Erro ao buscar configuração");

    console.log("Configuração carregada:", res);

    res
      .filter((r) => r.type === "fonte_cliente")
      .forEach((r) => {
        fontesClientes.value.push(r.value);
      });
  } catch (error) {
    console.error("Erro ao obter configuração:", error, error.response);

    fontesClientes.value = [];
  }
};

onMounted(() => {
  getTags();
  getInfos();
  getFunis();
  getConfig();
});

const fieldItens = [
  { title: "Tags", value: "tags" },
  { title: "Origem", value: "origem" },
  { title: "Email", value: "email" },
  { title: "Gênero", value: "genero" },
  { title: "Bairro", value: "bairro" },
  { title: "Estado", value: "estado" },
  { title: "Cidade", value: "cidade" },
  { title: "Valor Ganho", value: "valor_gasto" },
  { title: "Data de Cadastro", value: "data_cadastro" },
  { title: "Data do Último Agendamento", value: "data_ultimo_agendamento" },
  { title: "Quantidade de Agendamentos", value: "quantidade_agendamentos" },
  { title: "Quantidade de Negócios", value: "quantidade_negocios" },
  { title: "Etapa do Funil de Vendas", value: "etapa_funil_vendas" },
].sort((a, b) =>
  a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
);

const operatorItens = [
  { title: "Igual a", value: "eq" },
  { title: "Diferente de", value: "neq" },
  { title: "Contém", value: "contains" },
  { title: "Não contém", value: "not_contains" },
  { title: "Maior que", value: "gt" },
  { title: "Maior ou igual a", value: "gte" },
  { title: "Menor que", value: "lt" },
  { title: "Menor ou igual a", value: "lte" },
  { title: "Está vazio", value: "empty" },
  { title: "Não está vazio", value: "not_empty" },
  { title: "Regex", value: "regex" },
];

const handleValueSelect = async (rule, clean = true) => {
  let index = segmentacao.value.rules.findIndex((r) => r.id === rule.id);
  if (index === -1) return;

  if (clean) {
    segmentacao.value.rules[index].value = null;
    segmentacao.value.rules[index].valueIsSelect = false;
    segmentacao.value.rules[index].valueIsDinheiro = false;
  }

  if (segmentacao.value.rules[index].field === "genero") {
    segmentacao.value.rules[index].valueIsSelect = true;
    segmentacao.value.rules[index].itensValueSelect = [
      { title: "Masculino", value: "masculino" },
      { title: "Feminino", value: "feminino" },
      { title: "Não informado", value: "nao_informado" },
    ];
  } else if (segmentacao.value.rules[index].field === "estado") {
    segmentacao.value.rules[index].valueIsSelect = true;
    segmentacao.value.rules[index].itensValueSelect = infos.value.estados;
  } else if (segmentacao.value.rules[index].field === "cidade") {
    segmentacao.value.rules[index].valueIsSelect = true;
    segmentacao.value.rules[index].itensValueSelect = infos.value.cidades;
  } else if (segmentacao.value.rules[index].field === "bairro") {
    segmentacao.value.rules[index].valueIsSelect = true;
    segmentacao.value.rules[index].itensValueSelect = infos.value.bairros;
  } else if (segmentacao.value.rules[index].field === "etapa_funil_vendas") {
    segmentacao.value.rules[index].valueIsSelect = true;
    segmentacao.value.rules[index].itensValueSelect = funis.value.map(
      (funil) => ({ title: funil.nome, value: funil.id })
    );
  } else if (
    segmentacao.value.rules[index].field === "quantidade_agendamentos"
  ) {
    segmentacao.value.rules[index].valueIsSelect = true;

    let max = infos.value.max_order_count;

    let itens = [];

    for (let i = 0; i <= max; i++) {
      itens.push({ title: i, value: i });
    }

    segmentacao.value.rules[index].itensValueSelect = itens;
  } else if (segmentacao.value.rules[index].field === "quantidade_negocios") {
    segmentacao.value.rules[index].valueIsSelect = true;

    let max = infos.value.max_negocios_count;

    let itens = [];

    for (let i = 0; i <= max; i++) {
      itens.push({ title: i, value: i });
    }

    segmentacao.value.rules[index].itensValueSelect = itens;
  } else if (segmentacao.value.rules[index].field === "origem") {
    segmentacao.value.rules[index].valueIsSelect = true;
    segmentacao.value.rules[index].itensValueSelect = fontesClientes.value;
  } else if (segmentacao.value.rules[index].field === "valor_gasto") {
    segmentacao.value.rules[index].valueIsDinheiro = true;
  } else if (
    segmentacao.value.rules[index].field === "data_cadastro" ||
    segmentacao.value.rules[index].field === "data_ultimo_agendamento"
  ) {
    segmentacao.value.rules[index].valueIsSelect = false;
  } else if (segmentacao.value.rules[index].field === "tags") {
    segmentacao.value.rules[index].valueIsSelect = true;
    segmentacao.value.rules[index].itensValueSelect = tags.value;
  } else {
    segmentacao.value.rules[index].valueIsSelect = false;
  }
};

const totalUsersSeg = ref(0);
const loadingTotalUsers = ref(false);

const getTotalUsersSeg = async () => {
  console.log("GetTotalUsersSeg:", segmentacao.value);

  for (let i = 0; i < segmentacao.value.rules.length; i++) {
    if (
      !segmentacao.value.rules[i].field ||
      !segmentacao.value.rules[i].operator ||
      !segmentacao.value.rules[i].value ||
      (segmentacao.value.rules.length > 1 &&
        i < segmentacao.value.rules.length - 1 &&
        (!segmentacao.value.rules[i].logicalOperator ||
          segmentacao.value.rules[i].logicalOperator === ""))
    ) {
      totalUsersSeg.value = 0;
      console.log("totalUsersSeg não foi chamado");
      return;
    }
  }

  loadingTotalUsers.value = true;

  console.log("segmentacao.value:", segmentacao.value);

  try {
    const res = await $api(`/disparos/seg/totalUsers`, {
      method: "POST",
      body: { data: segmentacao.value },
    });

    if (!res) return;

    console.log("totalUsersSeg:", res);

    totalUsersSeg.value = res.total;
  } catch (error) {
    console.error("Error fetching user data", error, error.response);
  }

  loadingTotalUsers.value = false;
};

const saveSeg = async () => {
  if (segmentacao.value.name === "") {
    setAlert(
      "O nome do segmentação é obrigatório",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  }

  if (segmentacao.value.rules.length === 0) {
    setAlert(
      "Adicione pelo menos uma regra para a segmentação",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  } else {
    for (let i = 0; i < segmentacao.value.rules.length; i++) {
      if (
        segmentacao.value.rules[i].field === null ||
        segmentacao.value.rules[i].operator === null ||
        segmentacao.value.rules[i].value === null
      ) {
        setAlert(
          "Preencha todos os campos das regras",
          "error",
          "tabler-info-triangle",
          3000
        );
        return;
      }
    }
  }

  console.log("segmentacao:", segmentacao.value);
  loading.value = true;

  try {
    const res = await $api("/disparos/seg/save", {
      method: "POST",
      body: {
        data: segmentacao.value,
      },
    });

    if (!res) return;

    console.log("segmentacao cadastrado com sucesso!", res);

    setAlert(
      `Segmentação ${
        isNewSeg.value ? "cadastrada" : "atualizada"
      } com sucesso!`,
      "success",
      "tabler-user-check",
      3000
    );

    closeNavigationDrawer();
    emit("updateSeg");
  } catch (error) {
    console.error("Erro ao cadastrar segmentacao:", error, error.response);
    setAlert(
      `Erro ao ${
        isNewSeg.value ? "cadastrar" : "atualizar"
      } segmentação! Tente novamente.`,
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  loading.value = false;
};

watch(
  () => props.segData,
  async (newVal) => {
    if (
      newVal &&
      newVal?.id !== null &&
      newVal?.id !== undefined &&
      newVal?.id !== 0
    ) {
      isNewSeg.value = false;
      console.log("Não é novo segmentacao:", newVal);
      segmentacao.value = newVal;
      getInfos();
      getTags();
      getFunis();
      getConfig();
      for (let i = 0; i < segmentacao.value.rules.length; i++) {
        handleValueSelect(segmentacao.value.rules[i], false);
      }
      getTotalUsersSeg();
    }
  }
);

if (
  props.segData &&
  props.segData?.id !== null &&
  props.segData?.id !== undefined &&
  props.segData?.id !== 0
) {
  isNewSeg.value = false;
  console.log("Não é novo segmentacao:", props.segData);
  segmentacao.value = props.segData;
  await getInfos();
  await getTags();
  for (let i = 0; i < segmentacao.value.rules.length; i++) {
    handleValueSelect(segmentacao.value.rules[i], false);
  }
  getTotalUsersSeg();
}

const searchQuery = ref("");
const itensSelect = (itens) => {
  if (!itens) return [];
  let results = itens;

  if (searchQuery.value && searchQuery.value != "") {
    results = itens.filter((item) => {
      return item.title.toLowerCase().includes(searchQuery.value.toLowerCase());
    });
  }

  if (itens.length > 50) {
    results = results.slice(0, 50);
  }

  return results;
};
</script>
<template>
  <VDialog
    persistent
    max-width="800"
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <VCard flat>
      <VCardText>
        <!-- 👉 Title -->
        <AppDrawerHeaderSection
          :title="isNewSeg ? 'Cadastrar Segmentação' : 'Editar Segmentação'"
          @cancel="closeNavigationDrawer"
          customClass="py-0"
        />
        <p class="text-sm">
          Somente clientes com email e celular serão considerados.
        </p>

        <VRow class="mt-4">
          <VCol cols="12">
            <AppTextField
              v-model="segmentacao.name"
              required
              :rules="[requiredValidator]"
              placeholder="Insira o nome da segmentação"
              label="Nome da Segmentação"
            />
          </VCol>
          <VCol cols="12">
            <AppTextarea
              v-model="segmentacao.description"
              label="Descrição da Segmentação (opcional)"
              placeholder="Insira uma descrição para a segmentação"
              rows="2"
              active
            />
          </VCol>
        </VRow>

        <VDivider class="my-3" />
        <p class="mb-2 text-sm">
          <span class="font-weight-bold">Regras</span>
          <VBtn
            @click="addRule"
            variant="tonal"
            color="primary"
            class="ms-2"
            size="small"
            style="height: 30px"
          >
            <VIcon class="me-1" icon="tabler-plus" />
            Regra
          </VBtn>
          <span class="ml-4" v-if="totalUsersSeg > 0 && !loadingTotalUsers">
            {{ totalUsersSeg }}
            Clientes que atendem as regras selecionadas na segmentação.
          </span>
          <span
            class="ml-4"
            v-if="
              totalUsersSeg === 0 &&
              segmentacao.rules.length > 0 &&
              !loadingTotalUsers
            "
          >
            Nenhum cliente atende as regras selecionadas na segmentação.
          </span>
          <span class="ml-4" v-if="loadingTotalUsers">
            <VIcon icon="tabler-loader" spin />
            Calculando...
          </span>
        </p>
        <VRow>
          <VCol cols="12">
            <div
              v-for="(rule, index) in segmentacao.rules"
              :key="rule.id"
              class="v-row align-items-center"
            >
              <VCol cols="3">
                <AppSelect
                  v-model="rule.field"
                  :items="fieldItens"
                  label="Campo"
                  required
                  placeholder="Selecione o campo"
                  @update:model-value="handleValueSelect(rule)"
                />
              </VCol>
              <VCol cols="3">
                <AppSelect
                  v-model="rule.operator"
                  :items="operatorItens"
                  label="Operador"
                  required
                  placeholder="Selecione o operador"
                  @update:model-value="getTotalUsersSeg"
                />
              </VCol>
              <VCol cols="4">
                <AppTextField
                  v-model="rule.value"
                  required
                  :rules="[requiredValidator]"
                  placeholder="Insira o valor"
                  label="Valor"
                  @update:model-value="getTotalUsersSeg"
                  :type="rule.field?.includes('data') ? 'date' : 'text'"
                  v-if="!rule.valueIsSelect && !rule.valueIsDinheiro"
                />
                <AppSelect
                  v-model="rule.value"
                  :items="itensSelect(rule.itensValueSelect)"
                  label="Valor"
                  required
                  placeholder="Selecione o valor"
                  v-if="rule.valueIsSelect && !rule.valueIsDinheiro"
                  @update:model-value="getTotalUsersSeg"
                >
                  <template #prepend-item>
                    <VTextField
                      label="Pesquise"
                      v-model="searchQuery"
                      placeholder="Pesquisar..."
                      class="mb-2 mx-2"
                    />

                    <VDivider />
                  </template>
                </AppSelect>
                <Dinheiro
                  label="Valor"
                  v-model="rule.value"
                  required
                  v-if="!rule.valueIsSelect && rule.valueIsDinheiro"
                  @update:model-value="getTotalUsersSeg"
                />
                <p
                  class="mb-0 text-caption mt-1"
                  v-if="!rule.valueIsSelect && rule.valueIsDinheiro"
                >
                  O valor mais alto dos agendamentos é
                  {{ formatValue(infos.max_money_spent) }}
                </p>
              </VCol>
              <VCol cols="2" class="d-flex align-end gap-5">
                <AppSelect
                  v-model="rule.logicalOperator"
                  :items="[
                    { title: 'E', value: 'and' },
                    { title: 'OU', value: 'or' },
                  ]"
                  label="Lógica"
                  required
                  placeholder="E/OU"
                  @update:model-value="getTotalUsersSeg"
                  v-if="
                    segmentacao.rules.length > 1 &&
                    index < segmentacao.rules.length - 1
                  "
                />
                <VBtn @click="removeRule(index)" variant="tonal" color="error">
                  <VIcon icon="tabler-trash" />
                </VBtn>
              </VCol>
              <VCol
                cols="12"
                class="pa-0 d-flex flex-row align-center justify-center"
              >
                <VDivider />
                <span class="text-caption mx-2">{{
                  index === segmentacao.rules.length - 1
                    ? "-"
                    : rule.logicalOperator === "or"
                    ? "OU"
                    : "&"
                }}</span>
                <VDivider />
              </VCol>
            </div>
          </VCol>
        </VRow>

        <VRow>
          <!-- 👉 Submit and Cancel -->
          <VCol cols="12" align="center">
            <VBtn
              class="me-3"
              @click="saveSeg"
              color="primary"
              :loading="loading"
              :disabled="loading"
            >
              {{
                loading
                  ? isNewSeg
                    ? "Cadastrando..."
                    : "Atualizando..."
                  : isNewSeg
                  ? "Cadastrar"
                  : "Atualizar"
              }}
            </VBtn>
            <VBtn
              variant="outlined"
              color="secondary"
              @click="closeNavigationDrawer"
            >
              Cancelar
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </VDialog>
</template>
