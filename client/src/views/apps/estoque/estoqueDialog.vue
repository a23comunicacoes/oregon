<script setup>
import { temaAtual } from "@core/stores/config";
import { useConfirm } from "@/utils/confirm.js";
import moment from "moment";
const isMobile = window.innerWidth < 768;
import { useFunctions } from "@/composables/useFunctions";
import { can } from "@layouts/plugins/casl";

const { setAlert } = useAlert();
const disabled = ref(false);
const atualUser = useCookie("userData").value;

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
const isNewProduto = ref(true);

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  produtoData: Object,
});

const emit = defineEmits([
  "update:isDrawerOpen",
  "updateProdutos",
  "closeDrawer",
]);

console.log("produtoData:", props.produtoData);

const produto = ref({
  prod_id: 0,
  prod_nome: "",
  prod_descricao: "",
  prod_valor: 0,
  prod_quantidade: 0,
  prod_limiar: 0,
  prod_fotos: null,
  prod_ativo: 1,
  prod_sku: "",
  prod_fornecedor: "",
  prod_setor_id: null,
  prod_prateleira: "",
  prod_secao: "",
  prod_case: "",
  prod_caixa: "",
  prod_lote: "",
  prod_observacoes: "",
  prod_info_adicional: "",
  created_at: null,
});

watch(
  () => props.isDrawerOpen,
  (newVal) => {
    if (!newVal) {
      limparProduto();
    }
  }
);

watch(
  () => props.produtoData,
  (newVal) => {
    if (
      newVal &&
      newVal?.prod_id !== null &&
      newVal?.prod_id !== undefined &&
      newVal?.prod_id !== 0
    ) {
      isNewProduto.value = false;
      console.log("Não é novo produto:", newVal);
      produto.value = newVal;
      disabled.value = !can("edit", "estoque");
    }
  }
);

if (
  props.produtoData &&
  props.produtoData?.prod_id !== null &&
  props.produtoData?.prod_id !== undefined &&
  props.produtoData?.prod_id !== 0
) {
  isNewProduto.value = false;
  console.log("Não é novo produto:", props.produtoData);
  produto.value = props.produtoData;
}

const limparProduto = () => {
  produto.value = {
    prod_id: 0,
    prod_nome: "",
    prod_descricao: "",
    prod_valor: 0,
    prod_quantidade: 0,
    prod_limiar: 0,
    prod_fotos: null,
    prod_ativo: 1,
    prod_sku: "",
    prod_fornecedor: "",
    prod_setor_id: null,
    prod_prateleira: "",
    prod_secao: "",
    prod_case: "",
    prod_caixa: "",
    prod_lote: "",
    prod_observacoes: "",
    prod_info_adicional: "",
    created_at: null,
  };
};

const closeNavigationDrawer = () => {
  emit("update:isDrawerOpen", false);
  limparProduto();
};

const handleDrawerModelValueUpdate = (val) => {
  emit("update:isDrawerOpen", val);
};

const saveProduto = async () => {
  console.log("Produto:", produto.value);

  if (!produto.value.prod_nome) {
    setAlert(
      "Digite o nome do produto!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  if (!produto.value.prod_valor || produto.value.prod_valor <= 0) {
    setAlert(
      "Digite um valor válido para o produto!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  loading.value = true;

  let link = isNewProduto.value
    ? "/estoque/create"
    : `/estoque/update/${produto.value.prod_id}`;

  try {
    const res = await $api(link, {
      method: "POST",
      body: {
        prod_nome: produto.value.prod_nome,
        prod_descricao: produto.value.prod_descricao,
        prod_valor: produto.value.prod_valor,
        prod_quantidade: produto.value.prod_quantidade,
        prod_limiar: produto.value.prod_limiar,
        prod_fotos: produto.value.prod_fotos,
        prod_ativo: produto.value.prod_ativo,
        prod_sku: produto.value.prod_sku,
        prod_fornecedor: produto.value.prod_fornecedor,
        prod_setor_id: produto.value.prod_setor_id,
        prod_prateleira: produto.value.prod_prateleira,
        prod_secao: produto.value.prod_secao,
        prod_case: produto.value.prod_case,
        prod_caixa: produto.value.prod_caixa,
        prod_lote: produto.value.prod_lote,
        prod_observacoes: produto.value.prod_observacoes,
        prod_info_adicional: produto.value.prod_info_adicional,
      },
    });

    if (!res) return;

    console.log("Produto cadastrado com sucesso!", res);

    setAlert(
      `Produto ${
        isNewProduto.value ? "cadastrado" : "atualizado"
      } com sucesso!`,
      "success",
      "tabler-package",
      3000
    );

    closeNavigationDrawer();
    emit("updateProdutos");
  } catch (error) {
    console.error("Erro ao cadastrar produto:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        `Erro ao ${
          isNewProduto.value ? "cadastrar" : "atualizar"
        } produto! Tente novamente.`,
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  loading.value = false;
};

const formatValor = (valor) => {
  if (!valor) return "R$ 0,00";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const loadingDelete = ref(false);

const deleteProduto = async () => {
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
      message: `Tem certeza que deseja excluir este produto? Esta ação não poderá ser desfeita.`,
    }))
  )
    return;

  loadingDelete.value = true;

  try {
    await $api(`/estoque/delete/${produto.value.prod_id}`, {
      method: "DELETE",
    });

    setAlert("Produto excluído com sucesso!", "success", "tabler-trash", 3000);
    emit("updateProdutos");
    closeNavigationDrawer();
  } catch (error) {
    console.error("Erro ao excluir produto:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        "Ocorreu um erro ao excluir o produto, tente novamente!",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  loadingDelete.value = false;
};

// Buscar setores para o dropdown
const setores = ref([]);
const loadingSetores = ref(false);

const getSetores = async () => {
  loadingSetores.value = true;
  try {
    const res = await $api("/setores/all", {
      method: "GET",
    });
    setores.value = res || [];
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
    setores.value = [];
  }
  loadingSetores.value = false;
};

// Carregar setores quando o dialog abrir
watch(
  () => props.isDrawerOpen,
  (newVal) => {
    if (newVal) {
      getSetores();
    }
  }
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
    <VCard flat v-if="produto">
      <VCardText class="pt-2">
        <!-- 👉 Title -->
        <AppDrawerHeaderSection @cancel="closeNavigationDrawer">
          <template #title>
            <h5 class="text-h5 mb-0 d-flex flex-row gap-3 align-center">
              {{ isNewProduto ? "Cadastrar" : "Editar" }} Produto

              <VChip
                v-if="!isNewProduto && produto.estoque_baixo"
                color="error"
                class="font-weight-bold"
                label
                variant="flat"
              >
                Estoque Baixo
              </VChip>
            </h5>
          </template>
        </AppDrawerHeaderSection>

        <VRow>
          <VCol cols="12">
            <VRow>
              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-package" class="mr-2" /> Nome do Produto
                </VLabel>
                <VTextField
                  v-model="produto.prod_nome"
                  outlined
                  dense
                  placeholder="Digite o nome do produto..."
                />
              </VCol>

              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-coin" class="mr-2" /> Valor (Custo)
                </VLabel>
                <Dinheiro v-model="produto.prod_valor" />
              </VCol>

              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-barcode" class="mr-2" /> SKU
                </VLabel>
                <VTextField
                  v-model="produto.prod_sku"
                  outlined
                  dense
                  placeholder="Digite o SKU do produto..."
                />
              </VCol>

              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-truck" class="mr-2" /> Fornecedor
                </VLabel>
                <VTextField
                  v-model="produto.prod_fornecedor"
                  outlined
                  dense
                  placeholder="Digite o fornecedor..."
                />
              </VCol>

              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-building" class="mr-2" /> Setor
                </VLabel>
                <AppSelect
                  v-model="produto.prod_setor_id"
                  :items="setores"
                  item-title="set_nome"
                  item-value="set_id"
                  placeholder="Selecione o setor"
                  clearable
                  :loading="loadingSetores"
                />
              </VCol>

              <VCol cols="12">
                <VLabel>
                  <VIcon icon="tabler-notes" class="mr-2" /> Descrição
                </VLabel>
                <VTextarea
                  rows="3"
                  active
                  auto-grow
                  v-model="produto.prod_descricao"
                  outlined
                  dense
                  placeholder="Digite uma descrição do produto..."
                />
              </VCol>

              <VCol cols="12" md="4">
                <VLabel>
                  <VIcon icon="tabler-package" class="mr-2" /> Quantidade Atual
                </VLabel>
                <VTextField
                  v-model="produto.prod_quantidade"
                  outlined
                  dense
                  type="number"
                  min="0"
                  placeholder="0"
                  :disabled="!isNewProduto"
                  :hint="!isNewProduto ? 'Use ordens de entrada/retirada para alterar' : ''"
                  persistent-hint
                />
              </VCol>

              <VCol cols="12" md="4">
                <VLabel>
                  <VIcon icon="tabler-alert-triangle" class="mr-2" /> Limiar de
                  Estoque
                </VLabel>
                <VTextField
                  v-model="produto.prod_limiar"
                  outlined
                  dense
                  type="number"
                  min="0"
                  placeholder="0"
                />
                <p class="text-caption mt-1">
                  Alerta será exibido quando estoque for menor que o limiar
                </p>
              </VCol>

              <VCol cols="12" md="4">
                <VLabel>
                  <VIcon icon="tabler-toggle-right" class="mr-2" /> Status
                </VLabel>
                <VSwitch
                  v-model="produto.prod_ativo"
                  :label="produto.prod_ativo == 1 ? 'Ativo' : 'Inativo'"
                />
              </VCol>

              <VCol cols="12">
                <VDivider class="my-2" />
                <h6 class="text-h6 mb-3">
                  <VIcon icon="tabler-map-pin" class="mr-2" />
                  Localização no Estoque
                </h6>
              </VCol>

              <VCol cols="12" md="3">
                <VLabel>
                  <VIcon icon="tabler-layout-grid" class="mr-2" /> Prateleira
                </VLabel>
                <VTextField
                  v-model="produto.prod_prateleira"
                  outlined
                  dense
                  placeholder="Ex: A1"
                />
              </VCol>

              <VCol cols="12" md="3">
                <VLabel>
                  <VIcon icon="tabler-layout-columns" class="mr-2" /> Seção
                </VLabel>
                <VTextField
                  v-model="produto.prod_secao"
                  outlined
                  dense
                  placeholder="Ex: B2"
                />
              </VCol>

              <VCol cols="12" md="3">
                <VLabel>
                  <VIcon icon="tabler-box" class="mr-2" /> Case
                </VLabel>
                <VTextField
                  v-model="produto.prod_case"
                  outlined
                  dense
                  placeholder="Ex: C3"
                />
              </VCol>

              <VCol cols="12" md="3">
                <VLabel>
                  <VIcon icon="tabler-package" class="mr-2" /> Caixa
                </VLabel>
                <VTextField
                  v-model="produto.prod_caixa"
                  outlined
                  dense
                  placeholder="Ex: CX-001"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-tag" class="mr-2" /> Lote
                </VLabel>
                <VTextField
                  v-model="produto.prod_lote"
                  outlined
                  dense
                  placeholder="Ex: LOTE-2024-001"
                />
              </VCol>

              <VCol cols="12">
                <VDivider class="my-2" />
                <h6 class="text-h6 mb-3">
                  <VIcon icon="tabler-info-circle" class="mr-2" />
                  Informações Adicionais
                </h6>
              </VCol>

              <VCol cols="12">
                <VLabel>
                  <VIcon icon="tabler-file-text" class="mr-2" /> Observações
                </VLabel>
                <VTextarea
                  rows="2"
                  active
                  auto-grow
                  v-model="produto.prod_observacoes"
                  outlined
                  dense
                  placeholder="Observações sobre o produto..."
                />
              </VCol>

              <VCol cols="12">
                <VLabel>
                  <VIcon icon="tabler-clipboard-text" class="mr-2" /> Informações Adicionais
                </VLabel>
                <VTextarea
                  rows="2"
                  active
                  auto-grow
                  v-model="produto.prod_info_adicional"
                  outlined
                  dense
                  placeholder="Outras informações relevantes..."
                />
              </VCol>

              <VCol cols="12" v-if="!isNewProduto">
                <VAlert
                  v-if="produto.estoque_baixo"
                  type="warning"
                  variant="tonal"
                  class="mb-4"
                >
                  <VIcon icon="tabler-alert-triangle" class="mr-2" />
                  <strong>Estoque Baixo!</strong> A quantidade atual ({{
                    produto.prod_quantidade
                  }}) está abaixo do limiar definido ({{
                    produto.prod_limiar
                  }}).
                </VAlert>
              </VCol>
            </VRow>
          </VCol>
        </VRow>

        <div class="linha-flex justify-end mt-4">
          <VBtn
            variant="outlined"
            color="secondary"
            @click="closeNavigationDrawer"
          >
            Fechar
          </VBtn>
          <VBtn
            variant="outlined"
            color="error"
            @click="deleteProduto"
            :loading="loadingDelete"
            v-if="!isNewProduto && !disabled && can('delete', 'estoque')"
          >
            Excluir
          </VBtn>
          <VBtn
            v-if="!disabled"
            @click="saveProduto"
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
