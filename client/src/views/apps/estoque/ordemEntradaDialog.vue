<script setup>
import { useAlert } from "@/composables/useAlert";
import { useConfirm } from "@/utils/confirm.js";
import { can } from "@layouts/plugins/casl";
import moment from "moment";

const { setAlert } = useAlert();
const disabled = ref(false);

if (!can("view", "estoque")) {
  setAlert(
    "Você não tem permissão para acessar essa funcionalidade!",
    "error",
    "tabler-alert-triangle",
    3000
  );
  emit("update:isDrawerOpen", false);
}

const loading = ref(false);
const isNewOrdem = ref(true);

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  ordemData: Object,
});

const emit = defineEmits(["update:isDrawerOpen", "updateOrdens", "closeDrawer"]);

const ordem = ref({
  oe_id: 0,
  oe_produto_id: null,
  oe_quantidade: 1,
  oe_valor_unitario: 0,
  oe_valor_total: 0,
  oe_data: moment().format("YYYY-MM-DD"),
  oe_fornecedor: "",
  oe_nota_fiscal: "",
  oe_observacoes: "",
  oe_criar_despesa: false,
  despesa_paga: false,
  despesa_forma_pagamento: null,
});

// Produtos
const produtos = ref([]);
const loadingProdutos = ref(false);

const getProdutos = async () => {
  loadingProdutos.value = true;
  try {
    const res = await $api("/estoque/list", {
      method: "GET",
      query: {
        itemsPerPage: -1,
        ativo: 1,
      },
    });
    produtos.value = res.produtos || [];
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    produtos.value = [];
  }
  loadingProdutos.value = false;
};

// Formas de pagamento
const formasPagamento = ref([]);
const loadingFormas = ref(false);

const getFormasPagamento = async () => {
  loadingFormas.value = true;
  try {
    const res = await $api("/pagamentos/forma_entrada", {
      method: "GET",
    });
    formasPagamento.value = res || [];
  } catch (error) {
    console.error("Erro ao buscar formas de pagamento:", error);
    formasPagamento.value = [];
  }
  loadingFormas.value = false;
};

const tiposDespesa = ref([]);

const getTipoDespesa = async () => {
  const res = await $api("/config/g/tipo_despesa", {
    method: "GET",
  });

  if (!res) return;

  console.log("Tipos de despesa:", res);

  tiposDespesa.value = res.map((r) => r.value);
};

getTipoDespesa();

watch(
  () => props.isDrawerOpen,
  (newVal) => {
    if (newVal) {
      getProdutos();
      getFormasPagamento();
      getTipoDespesa();
    } else {
      limparOrdem();
    }
  }
);

watch(
  () => props.ordemData,
  (newVal) => {
    if (
      newVal &&
      newVal?.oe_id !== null &&
      newVal?.oe_id !== undefined &&
      newVal?.oe_id !== 0
    ) {
      isNewOrdem.value = false;
      ordem.value = {
        ...newVal,
        oe_data: moment(newVal.oe_data).format("YYYY-MM-DD"),
      };
      disabled.value = true; // Ordens de entrada não podem ser editadas após criação
    }
  }
);

if (
  props.ordemData &&
  props.ordemData?.oe_id !== null &&
  props.ordemData?.oe_id !== undefined &&
  props.ordemData?.oe_id !== 0
) {
  isNewOrdem.value = false;
  ordem.value = {
    ...props.ordemData,
    oe_data: moment(props.ordemData.oe_data).format("YYYY-MM-DD"),
  };
  disabled.value = true;
}

// Calcular valor total automaticamente
watch(
  [() => ordem.value.oe_quantidade, () => ordem.value.oe_valor_unitario],
  () => {
    const quantidade = parseFloat(ordem.value.oe_quantidade) || 0;
    const valorUnitario = parseFloat(ordem.value.oe_valor_unitario) || 0;
    ordem.value.oe_valor_total = quantidade * valorUnitario;
  }
);

const limparOrdem = () => {
  ordem.value = {
    oe_id: 0,
    oe_produto_id: null,
    oe_quantidade: 1,
    oe_valor_unitario: 0,
    oe_valor_total: 0,
    oe_data: moment().format("YYYY-MM-DD"),
    oe_fornecedor: "",
    oe_nota_fiscal: "",
    oe_observacoes: "",
    oe_criar_despesa: false,
    despesa_paga: false,
    despesa_forma_pagamento: null,
  };
  isNewOrdem.value = true;
  disabled.value = false;
};

const closeNavigationDrawer = () => {
  emit("update:isDrawerOpen", false);
  limparOrdem();
};

const handleDrawerModelValueUpdate = (val) => {
  emit("update:isDrawerOpen", val);
};

const saveOrdem = async () => {
  if (!ordem.value.oe_produto_id) {
    setAlert(
      "Selecione um produto!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  if (!ordem.value.oe_quantidade || ordem.value.oe_quantidade <= 0) {
    setAlert(
      "Digite uma quantidade válida!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  if (!ordem.value.oe_data) {
    setAlert("Selecione uma data!", "error", "tabler-alert-triangle", 3000);
    return;
  }

  if (ordem.value.oe_criar_despesa && ordem.value.despesa_paga && !ordem.value.despesa_forma_pagamento) {
    setAlert(
      "Selecione a forma de pagamento da despesa!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  loading.value = true;

  try {
    const res = await $api("/ordens-entrada/create", {
      method: "POST",
      body: {
        oe_produto_id: ordem.value.oe_produto_id,
        oe_quantidade: ordem.value.oe_quantidade,
        oe_valor_unitario: ordem.value.oe_valor_unitario,
        oe_valor_total: ordem.value.oe_valor_total,
        oe_data: ordem.value.oe_data,
        oe_fornecedor: ordem.value.oe_fornecedor,
        oe_nota_fiscal: ordem.value.oe_nota_fiscal,
        oe_observacoes: ordem.value.oe_observacoes,
        oe_criar_despesa: ordem.value.oe_criar_despesa,
        despesa_paga: ordem.value.despesa_paga,
        despesa_forma_pagamento: ordem.value.despesa_forma_pagamento,
        despesa_tipo: ordem.value.despesa_tipo,
      },
    });

    if (!res) return;

    setAlert(
      "Ordem de entrada cadastrada com sucesso!",
      "success",
      "tabler-package-import",
      3000
    );

    closeNavigationDrawer();
    emit("updateOrdens");
  } catch (error) {
    console.error("Erro ao cadastrar ordem:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        "Erro ao cadastrar ordem! Tente novamente.",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  loading.value = false;
};

const loadingDelete = ref(false);

const deleteOrdem = async () => {
  if (!can("delete", "estoque")) {
    setAlert(
      "Você não tem permissão para realizar essa ação!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  if (
    !(await useConfirm({
      message: `Tem certeza que deseja excluir esta ordem de entrada? A quantidade será removida do estoque e a despesa associada (se houver) será deletada.`,
    }))
  )
    return;

  loadingDelete.value = true;

  try {
    await $api(`/ordens-entrada/delete/${ordem.value.oe_id}`, {
      method: "DELETE",
    });

    setAlert(
      "Ordem de entrada excluída com sucesso!",
      "success",
      "tabler-trash",
      3000
    );
    emit("updateOrdens");
    closeNavigationDrawer();
  } catch (error) {
    console.error("Erro ao excluir ordem:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        "Ocorreu um erro ao excluir a ordem, tente novamente!",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  loadingDelete.value = false;
};

const formatValor = (valor) => {
  if (!valor || isNaN(valor)) return "R$ 0,00";
  return parseFloat(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};
</script>

<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    width="900"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <VCard flat v-if="ordem">
      <VCardText class="pt-2">
        <!-- 👉 Title -->
        <AppDrawerHeaderSection @cancel="closeNavigationDrawer">
          <template #title>
            <h5 class="text-h5 mb-0 d-flex flex-row gap-3 align-center">
              {{ isNewOrdem ? "Nova" : "Visualizar" }} Ordem de Entrada
            </h5>
          </template>
        </AppDrawerHeaderSection>

        <VRow>
          <VCol cols="12">
            <VRow>
              <VCol cols="12" md="8">
                <VLabel>
                  <VIcon icon="tabler-package" class="mr-2" /> Produto
                </VLabel>
                <AppSelect
                  v-model="ordem.oe_produto_id"
                  :items="produtos"
                  item-title="prod_nome"
                  item-value="prod_id"
                  placeholder="Selecione o produto"
                  :loading="loadingProdutos"
                  :disabled="disabled"
                >
                  <template #item="{ props, item }">
                    <VListItem v-bind="props">
                      <template #title>
                        {{ item.raw.prod_nome }}
                      </template>
                      <template #subtitle v-if="item.raw.prod_sku">
                        SKU: {{ item.raw.prod_sku }}
                      </template>
                    </VListItem>
                  </template>
                </AppSelect>
              </VCol>

              <VCol cols="12" md="4">
                <VLabel>
                  <VIcon icon="tabler-calendar" class="mr-2" /> Data
                </VLabel>
                <AppTextField
                  v-model="ordem.oe_data"
                  type="date"
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12" md="4">
                <VLabel>
                  <VIcon icon="tabler-package" class="mr-2" /> Quantidade
                </VLabel>
                <VTextField
                  v-model="ordem.oe_quantidade"
                  type="number"
                  min="1"
                  placeholder="0"
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12" md="4">
                <VLabel>
                  <VIcon icon="tabler-coin" class="mr-2" /> Valor Unitário
                </VLabel>
                <Dinheiro v-model="ordem.oe_valor_unitario" :readonly="disabled" />
              </VCol>

              <VCol cols="12" md="4">
                <VLabel>
                  <VIcon icon="tabler-cash" class="mr-2" /> Valor Total
                </VLabel>
                <VTextField
                  :model-value="formatValor(ordem.oe_valor_total)"
                  disabled
                  variant="filled"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-truck" class="mr-2" /> Fornecedor
                </VLabel>
                <VTextField
                  v-model="ordem.oe_fornecedor"
                  placeholder="Nome do fornecedor..."
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-file-invoice" class="mr-2" /> Nota Fiscal
                </VLabel>
                <VTextField
                  v-model="ordem.oe_nota_fiscal"
                  placeholder="Número da nota fiscal..."
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12">
                <VLabel>
                  <VIcon icon="tabler-notes" class="mr-2" /> Observações
                </VLabel>
                <VTextarea
                  rows="2"
                  active
                  auto-grow
                  v-model="ordem.oe_observacoes"
                  placeholder="Observações sobre a entrada..."
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12" v-if="isNewOrdem">
                <VDivider class="my-2" />
                <h6 class="text-h6 mb-3">
                  <VIcon icon="tabler-receipt" class="mr-2" />
                  Despesa
                </h6>
              </VCol>

              <VCol cols="12" v-if="isNewOrdem">
                <VSwitch
                  v-model="ordem.oe_criar_despesa"
                  label="Criar despesa para esta entrada"
                  color="primary"
                  hint="Se marcado, será criada uma despesa no sistema"
                  persistent-hint
                />
              </VCol>

              <VCol cols="12" v-if="isNewOrdem && ordem.oe_criar_despesa">
                <VLabel>
                  <VIcon icon="tabler-credit-card" class="mr-2" /> Tipo de Despesa
                </VLabel>
                <AppSelect
                  v-model="ordem.despesa_tipo"
                  :items="tiposDespesa"
                  item-title="value"
                  item-value="value"
                  placeholder="Selecione o tipo de despesa"
                />
              </VCol>

              <VCol cols="12" v-if="isNewOrdem && ordem.oe_criar_despesa">
                <VSwitch
                  v-model="ordem.despesa_paga"
                  label="Marcar despesa como paga"
                  color="success"
                />
              </VCol>

              <VCol cols="12" v-if="isNewOrdem && ordem.oe_criar_despesa && ordem.despesa_paga">
                <VLabel>
                  <VIcon icon="tabler-credit-card" class="mr-2" /> Forma de Pagamento
                </VLabel>
                <AppSelect
                  v-model="ordem.despesa_forma_pagamento"
                  :items="formasPagamento"
                  item-title="fpg_descricao"
                  item-value="fpg_id"
                  placeholder="Selecione a forma de pagamento"
                  :loading="loadingFormas"
                />
              </VCol>

              <VCol cols="12" v-if="!isNewOrdem && ordem.oe_despesa_id">
                <VAlert type="info" variant="tonal">
                  <VIcon icon="tabler-info-circle" class="mr-2" />
                  Esta ordem possui uma despesa associada (N°: {{ ordem.oe_despesa_id }})
                </VAlert>
              </VCol>

              <VCol cols="12" v-if="!isNewOrdem">
                <VAlert type="warning" variant="tonal">
                  <VIcon icon="tabler-alert-triangle" class="mr-2" />
                  <strong>Atenção:</strong> Ordens de entrada não podem ser editadas após a criação.
                  Para corrigir, delete esta ordem e crie uma nova.
                </VAlert>
              </VCol>
            </VRow>
          </VCol>
        </VRow>

        <div class="d-flex flex-row align-center justify-end gap-3 mt-4">
          <VBtn variant="outlined" color="secondary" @click="closeNavigationDrawer">
            Fechar
          </VBtn>
          <VBtn
            variant="outlined"
            color="error"
            @click="deleteOrdem"
            :loading="loadingDelete"
            v-if="!isNewOrdem && can('delete', 'estoque')"
          >
            Excluir
          </VBtn>
          <VBtn
            v-if="isNewOrdem"
            @click="saveOrdem"
            color="primary"
            :loading="loading"
            :disabled="loading"
          >
            Salvar
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>

