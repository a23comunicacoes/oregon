<script setup>
import { useAlert } from "@/composables/useAlert";
import { can } from "@layouts/plugins/casl";
import { temaAtual } from "@core/stores/config";

const loading = ref(false);

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  servicoData: Object,
});

const emit = defineEmits([
  "update:isDrawerOpen",
  "updateServicos",
  "closeDrawer",
]);

console.log("servicoData:", props.servicoData);

const { setAlert } = useAlert();

const formatValor = (value) => {
  return !value
    ? "R$ 0,00"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
};

if (!can("create", "servico")) {
  setAlert(
    "Você não tem permissão para acessar esta página.",
    "error",
    "tabler-alert-triangle",
    3000
  );
  emit("update:isDrawerOpen", false);
}

let servicoRef = {
  ser_nome: "",
  ser_descricao: "",
  ser_valor: 0,
  ser_comissao_type: null,
  ser_comissao: null,
  ser_subservicos: [],
};

let subServicoRef = {
  ser_pai: null,
  ser_nome: "",
  ser_descricao: "",
  ser_comissao_type: null,
  ser_comissao: null,
  ser_valor: 0,
  ser_data: {},
};

const servico = ref({ ...servicoRef });
const searchSubServico = ref("");

watch(
  () => props.servicoData,
  (newVal) => {
    if (!newVal) return;
    console.log("ServicoData watch:", newVal);
    servico.value = {
      ...servicoRef,
      ...newVal,
    };
  },
  { immediate: true, deep: true }
);

if (props.servicoData) {
  console.log("ServicoData:", props.servicoData);
  servico.value = {
    ...servicoRef,
    ...props.servicoData,
  };
}

const limparServico = () => {
  servico.value = { ...servicoRef };
};

const closeNavigationDrawer = () => {
  emit("update:isDrawerOpen", false);
  limparServico();
};

const handleDrawerModelValueUpdate = (val) => {
  emit("update:isDrawerOpen", val);
};

const saveServico = async () => {
  console.log("Servico:", servico.value);

  if (servico.value.ser_nome === "") {
    setAlert(
      "O nome do servico é obrigatório!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  if (
    servico.value.ser_subservicos?.length &&
    servico.value.ser_subservicos.some(
      (s) => !s.ser_nome || s.ser_nome.trim() === ""
    )
  ) {
    setAlert(
      "Todos os subserviços devem ter nome!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  loading.value = true;

  try {
    const res = await $api("/servicos/upsert", {
      method: "POST",
      body: servico.value,
    });

    if (!res) return;

    console.log("Serviço cadastrado com sucesso!", res);

    setAlert(
      "Serviço salvo com sucesso!",
      "success",
      "tabler-user-check",
      3000
    );

    closeNavigationDrawer();
    emit("updateServicos");
  } catch (error) {
    console.error("Erro ao cadastrar serviço:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        `Erro ao salvar serviço! Tente novamente.`,
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  loading.value = false;
};

const calculateComissao = (servico) => {
  if (!servico.ser_comissao_type || !servico.ser_comissao) return "";

  if (servico.ser_comissao_type === "Porcentagem") {
    let valor = servico.ser_valor || 0;
    let porcentagem = servico.ser_comissao || 0;
    let comissao = (valor * porcentagem) / 100;
    return formatValor(comissao);
  } else if (servico.ser_comissao_type === "Valor Fixo") {
    return formatValor(servico.ser_comissao || 0);
  }

  return "R$ 0,00";
};

const viewMoverSubServico = ref(false);
const selectedSubServico = ref(null);
const selectedServico = ref(null);

const closeMoverSubServico = () => {
  viewMoverSubServico.value = false;
  selectedSubServico.value = null;
  selectedServico.value = null;
  searchQuery.value = "";
  servicos.value = [];
};

const servicos = ref([]);
const searchQuery = ref("");
const loadingServicos = ref(false);

const getServicos = async () => {
  if (!can("view", "servico")) {
    setAlert(
      "Você não tem permissão para acessar esta página.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  loadingServicos.value = true;

  try {
    const res = await $api("/servicos/list", {
      method: "GET",
      query: {
        q: searchQuery.value,
        itemsPerPage: 20,
      },
    });

    console.log("res servicos", res);

    if (!res) return;

    servicos.value = res.servicos;
  } catch (err) {
    console.error("Error fetching user data", err, err.response);
    servicos.value = [];
  }

  loadingServicos.value = false;
};

const openMoverSubServico = (index) => {
  selectedSubServico.value = servico.value.ser_subservicos[index];

  if (!selectedSubServico.value?.ser_id) {
    setAlert(
      "Selecione um subserviço para mover!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  viewMoverSubServico.value = true;
  getServicos();
};

const moverSubServico = async () => {
  if (!selectedServico.value?.ser_id) {
    setAlert(
      "Selecione um serviço principal para mover o subserviço!",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  try {
    const res = await $api(`/servicos/mover-subservico`, {
      method: "POST",
      body: {
        ser_pai: selectedServico.value,
        sub_id: selectedSubServico.value.ser_id,
      },
    });

    if (!res) return;

    console.log("Subserviço movido com sucesso!", res);

    setAlert(
      "Subserviço movido com sucesso!",
      "success",
      "tabler-user-check",
      3000
    );

    //Remover o subserviço da lista de subserviços do serviço pai
    servico.value.ser_subservicos = servico.value.ser_subservicos.filter(
      (s) => s.ser_id !== selectedSubServico.value.ser_id
    );

    
    closeMoverSubServico();
    emit("updateServicos");

  } catch (error) {
    console.error("Erro ao mover subserviço:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        `Erro ao mover subserviço! Tente novamente.`,
      "error",
      "tabler-alert-triangle",
      3000
    );
  }
}
</script>
<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
    width="700"
  >
    <VCard flat v-if="servico">
      <VCardText class="pt-2">
        <!-- 👉 Title -->
        <AppDrawerHeaderSection
          :title="servico.ser_id ? 'Editar Serviço' : 'Cadastrar Serviço'"
          @cancel="closeNavigationDrawer"
        />

        <VRow>
          <VCol cols="12" md="6">
            <VLabel>
              <VIcon icon="tabler-align-left" class="mr-2" /> Nome do Serviço
            </VLabel>
            <VTextField
              v-model="servico.ser_nome"
              required
              :rules="[requiredValidator]"
              placeholder="Insira o nome do usuário"
            />
          </VCol>

          <VCol cols="12" md="6">
            <VLabel> <VIcon icon="tabler-cash" class="mr-2" /> Valor </VLabel>
            <Dinheiro v-model="servico.ser_valor" />
          </VCol>

          <VCol cols="12" md="6">
            <VLabel>
              <VIcon icon="tabler-percentage" class="mr-2" />
              Tipo de Comissão
            </VLabel>

            <VSelect
              v-model="servico.ser_comissao_type"
              :items="['Porcentagem', 'Valor Fixo']"
              placeholder="Selecione o tipo de comissão"
              clearable
            />
          </VCol>

          <VCol cols="12" md="6">
            <VLabel>
              <VIcon icon="tabler-cash" class="mr-2" />
              Comissão
              {{
                servico.ser_comissao_type
                  ? `(${calculateComissao(servico)})`
                  : ""
              }}
            </VLabel>

            <VTextField
              v-if="servico.ser_comissao_type === 'Porcentagem'"
              v-model="servico.ser_comissao"
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="Insira a porcentagem de comissão"
              append-inner-icon="tabler-percentage"
            />

            <Dinheiro
              v-model="servico.ser_comissao"
              class="altura-input"
              v-else-if="servico.ser_comissao_type === 'Valor Fixo'"
            />

            <p class="mb-0 text-sm text-disabled" v-else>
              Selecione o tipo de comissão para definir o valor.
            </p>

            <p class="mb-0 mt-1 text-caption text-disabled">
              Deixe zerado para não aplicar comissão.
            </p>
          </VCol>

          <VCol cols="12">
            <VLabel>
              <VIcon icon="tabler-message" class="mr-2" /> Descrição
            </VLabel>
            <VTextarea
              v-model="servico.ser_descricao"
              placeholder="Insira a descrição do serviço"
              rows="2"
              active
              auto-grow
            />
          </VCol>

          <VCol cols="12">
            <VLabel class="w-100 mb-2">
              <VIcon icon="tabler-list" class="mr-2" />
              Subserviços ({{ servico.ser_subservicos?.length || 0 }})

              <IconBtn
                color="primary"
                class="ml-4"
                @click="
                  servico.ser_subservicos.push({
                    ...subServicoRef,
                    ser_pai: servico.value?.ser_id || null,
                  })
                "
              >
                <VIcon icon="tabler-plus" />
              </IconBtn>
            </VLabel>

            <VTextField
              v-model="searchSubServico"
              placeholder="Buscar subserviço"
              prepend-inner-icon="tabler-search"
              class="mb-4"
              clearable
            />

            <VExpansionPanels
              multiple
              v-if="servico.ser_subservicos?.length"
              rounded="md"
            >
              <template
                v-for="(subservico, index) in servico.ser_subservicos.filter(
                  (s) =>
                    !searchSubServico
                      ? true
                      : (s.ser_nome ?? '')
                          .toLowerCase()
                          .includes(searchSubServico.toLowerCase()) ||
                        (s.ser_descricao ?? '')
                          .toLowerCase()
                          .includes(searchSubServico.toLowerCase()) ||
                        (s.ser_valor ?? 0)
                          .toString()
                          .includes(searchSubServico.toLowerCase())
                )"
                :key="index"
              >
                <VExpansionPanel
                  v-if="subservico"
                  rounded="md"
                  :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
                  :title="`${index + 1} - ${
                    subservico.ser_nome || 'Novo Subserviço'
                  }${
                    subservico.ser_valor
                      ? ' - ' + formatValor(subservico.ser_valor)
                      : ''
                  }`"
                >
                  <VExpansionPanelText class="pt-4">
                    <VRow>
                      <VCol cols="12" md="6">
                        <VLabel>
                          <VIcon icon="tabler-align-left" class="mr-2" />
                          Nome do Subserviço
                        </VLabel>
                        <VTextField
                          v-model="subservico.ser_nome"
                          required
                          :rules="[requiredValidator]"
                          placeholder="Insira o nome do subserviço"
                        />
                      </VCol>

                      <VCol cols="12" md="6">
                        <VLabel>
                          <VIcon icon="tabler-cash" class="mr-2" />
                          Valor
                        </VLabel>
                        <Dinheiro
                          v-model="subservico.ser_valor"
                          class="altura-input"
                        />
                        <p class="mb-0 mt-1 text-caption text-disabled">
                          Deixe zerado para utilizar o preço do serviço pai.
                        </p>
                      </VCol>

                      <VCol cols="12" md="6">
                        <VLabel>
                          <VIcon icon="tabler-percentage" class="mr-2" />
                          Tipo de Comissão
                        </VLabel>

                        <VSelect
                          v-model="subservico.ser_comissao_type"
                          :items="['Porcentagem', 'Valor Fixo']"
                          placeholder="Selecione o tipo de comissão"
                          clearable
                        />
                      </VCol>

                      <VCol cols="12" md="6">
                        <VLabel>
                          <VIcon icon="tabler-cash" class="mr-2" />
                          Comissão
                          {{
                            subservico.ser_comissao_type
                              ? `(${calculateComissao(subservico)})`
                              : ""
                          }}
                        </VLabel>

                        <VTextField
                          v-if="subservico.ser_comissao_type === 'Porcentagem'"
                          v-model="subservico.ser_comissao"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          placeholder="Insira a porcentagem de comissão"
                          append-inner-icon="tabler-percentage"
                        />

                        <Dinheiro
                          v-model="subservico.ser_comissao"
                          class="altura-input"
                          v-else-if="
                            subservico.ser_comissao_type === 'Valor Fixo'
                          "
                        />

                        <p class="mb-0 text-sm text-disabled" v-else>
                          Selecione o tipo de comissão para definir o valor.
                        </p>

                        <p class="mb-0 mt-1 text-caption text-disabled">
                          Deixe zerado para utilizar a comissão do serviço pai.
                        </p>
                      </VCol>

                      <VCol cols="12">
                        <VLabel>
                          <VIcon icon="tabler-message" class="mr-2" />
                          Descrição
                        </VLabel>
                        <VTextarea
                          v-model="subservico.ser_descricao"
                          placeholder="Insira a descrição do subserviço"
                          rows="1"
                          active
                          auto-grow
                        />
                      </VCol>

                      <VCol cols="12" md="6">
                        <VLabel>
                          <VIcon icon="tabler-star" class="mr-2" /> Garantia
                        </VLabel>
                        <VTextField
                          v-model="subservico.ser_data.garantia"
                          placeholder="Ex.: 3 meses"
                        />
                      </VCol>

                      <VCol cols="12" md="6">
                        <VLabel>
                          <VIcon icon="tabler-home" class="mr-2" /> Área
                        </VLabel>
                        <VSelect
                          v-model="subservico.ser_data.ser_area"
                          :items="['Interno', 'Externo', 'Ambos']"
                          dense
                          outlined
                          placeholder="Selecione a área"
                        />
                      </VCol>

                      <VCol cols="12" md="4">
                        <VLabel>
                          <VIcon icon="tabler-ruler-measure" class="mr-2" /> m²
                          Interno
                        </VLabel>
                        <VTextField
                          v-model="subservico.ser_data.metragem_interno"
                          placeholder="Ex.: 100"
                        />
                      </VCol>
                      <VCol cols="12" md="4">
                        <VLabel>
                          <VIcon icon="tabler-ruler-measure" class="mr-2" /> m²
                          Externo
                        </VLabel>
                        <VTextField
                          v-model="subservico.ser_data.metragem_externo"
                          placeholder="Ex.: 100"
                        />
                      </VCol>
                      <VCol cols="12" md="4">
                        <VLabel>
                          <VIcon icon="tabler-ruler-measure" class="mr-2" /> m²
                          Total
                        </VLabel>
                        <VTextField
                          v-model="subservico.ser_data.metragem_total"
                          placeholder="Ex.: 100"
                        />
                      </VCol>
                    </VRow>

                    <div class="linha-flex justify-end gap-3 mt-3">
                      <VBtn
                        variant="outlined"
                        color="info"
                        @click="openMoverSubServico(index)"
                        style="height: 35px"
                        size="small"
                      >
                        <VIcon
                          icon="tabler-corner-down-right-double"
                          class="mr-2"
                        />
                        Mover
                      </VBtn>

                      <VBtn
                        variant="outlined"
                        color="error"
                        @click="servico.ser_subservicos.splice(index, 1)"
                        style="height: 35px"
                        size="small"
                      >
                        <VIcon icon="tabler-trash" class="mr-2" />
                        Remover
                      </VBtn>
                    </div>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </template>
            </VExpansionPanels>

            <p class="mb-0 text-sm" v-else>Nenhum subserviço adicionado.</p>
          </VCol>
        </VRow>

        <div class="linha-flex justify-end gap-3 mt-6">
          <VBtn
            variant="outlined"
            color="secondary"
            @click="closeNavigationDrawer"
          >
            Cancelar
          </VBtn>

          <VBtn
            @click="saveServico"
            color="primary"
            :loading="loading"
            :disabled="loading"
          >
            Salvar Serviço
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <VDialog
      v-model="viewMoverSubServico"
      width="600"
      @update:model-value="!viewMoverSubServico && closeMoverSubServico()"
    >
      <VCard flat>
        <VCardText class="pt-2">
          <AppDrawerHeaderSection
            title="Mover Subserviço"
            @cancel="closeMoverSubServico"
          />

          <AppSelect
            v-model="selectedServico"
            :items="servicos"
            item-title="ser_nome"
            item-value="ser_id"
            placeholder="Selecione o serviço"
            label="Selecionar o serviço principal que o subserviço será movido"
            clearable
          />

          <div class="linha-flex justify-end gap-3 mt-6">
            <VBtn
              variant="outlined"
              color="secondary"
              @click="closeMoverSubServico"
            >
              Cancelar
            </VBtn>

            <VBtn color="primary" @click="moverSubServico">
              Mover
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VDialog>
  </VDialog>
</template>
