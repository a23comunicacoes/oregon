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
  or_id: 0,
  or_produto_id: null,
  or_quantidade: 1,
  or_data: moment().format("YYYY-MM-DD"),
  or_motivo: "",
  or_funcionario_id: null,
  or_observacoes: "",
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

// Funcionários
const funcionarios = ref([]);
const loadingFuncionarios = ref(false);

const getFuncionarios = async () => {
  loadingFuncionarios.value = true;
  try {
    const res = await $api("/users/list", {
      method: "GET",
      query: {
        itemsPerPage: -1,
      },
    });
    funcionarios.value = res.users || [];
  } catch (error) {
    console.error("Erro ao buscar funcionários:", error);
    funcionarios.value = [];
  }
  loadingFuncionarios.value = false;
};

watch(
  () => props.isDrawerOpen,
  (newVal) => {
    if (newVal) {
      getProdutos();
      getFuncionarios();
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
      newVal?.or_id !== null &&
      newVal?.or_id !== undefined &&
      newVal?.or_id !== 0
    ) {
      isNewOrdem.value = false;
      ordem.value = {
        ...newVal,
        or_data: moment(newVal.or_data).format("YYYY-MM-DD"),
      };
      disabled.value = true; // Ordens de retirada não podem ser editadas após criação
    }
  }
);

if (
  props.ordemData &&
  props.ordemData?.or_id !== null &&
  props.ordemData?.or_id !== undefined &&
  props.ordemData?.or_id !== 0
) {
  isNewOrdem.value = false;
  ordem.value = {
    ...props.ordemData,
    or_data: moment(props.ordemData.or_data).format("YYYY-MM-DD"),
  };
  disabled.value = true;
}

const limparOrdem = () => {
  ordem.value = {
    or_id: 0,
    or_produto_id: null,
    or_quantidade: 1,
    or_data: moment().format("YYYY-MM-DD"),
    or_motivo: "",
    or_funcionario_id: null,
    or_observacoes: "",
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
  if (!ordem.value.or_produto_id) {
    setAlert(
      "Selecione um produto!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  if (!ordem.value.or_quantidade || ordem.value.or_quantidade <= 0) {
    setAlert(
      "Digite uma quantidade válida!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  if (!ordem.value.or_data) {
    setAlert("Selecione uma data!", "error", "tabler-alert-triangle", 3000);
    return;
  }

  loading.value = true;

  try {
    const res = await $api("/ordens-retirada/create", {
      method: "POST",
      body: {
        or_produto_id: ordem.value.or_produto_id,
        or_quantidade: ordem.value.or_quantidade,
        or_data: ordem.value.or_data,
        or_motivo: ordem.value.or_motivo,
        or_funcionario_id: ordem.value.or_funcionario_id,
        or_observacoes: ordem.value.or_observacoes,
      },
    });

    if (!res) return;

    setAlert(
      "Ordem de retirada cadastrada com sucesso!",
      "success",
      "tabler-package-export",
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
      message: `Tem certeza que deseja excluir esta ordem de retirada? A quantidade será devolvida ao estoque.`,
    }))
  )
    return;

  loadingDelete.value = true;

  try {
    await $api(`/ordens-retirada/delete/${ordem.value.or_id}`, {
      method: "DELETE",
    });

    setAlert(
      "Ordem de retirada excluída com sucesso!",
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

// Buscar produto selecionado para mostrar quantidade disponível
const produtoSelecionado = computed(() => {
  if (!ordem.value.or_produto_id) return null;
  return produtos.value.find((p) => p.prod_id === ordem.value.or_produto_id);
});
</script>

<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    width="800"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <VCard flat v-if="ordem">
      <VCardText class="pt-2">
        <!-- 👉 Title -->
        <AppDrawerHeaderSection @cancel="closeNavigationDrawer">
          <template #title>
            <h5 class="text-h5 mb-0 d-flex flex-row gap-3 align-center">
              {{ isNewOrdem ? "Nova" : "Visualizar" }} Ordem de Retirada
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
                  v-model="ordem.or_produto_id"
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
                      <template #subtitle>
                        <span v-if="item.raw.prod_sku">SKU: {{ item.raw.prod_sku }} - </span>
                        Disponível: {{ item.raw.prod_quantidade }}
                      </template>
                    </VListItem>
                  </template>
                </AppSelect>
                <p class="text-caption mt-1" v-if="produtoSelecionado">
                  Quantidade disponível: <strong>{{ produtoSelecionado.prod_quantidade }}</strong>
                </p>
              </VCol>

              <VCol cols="12" md="4">
                <VLabel>
                  <VIcon icon="tabler-calendar" class="mr-2" /> Data
                </VLabel>
                <AppTextField
                  v-model="ordem.or_data"
                  type="date"
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-package" class="mr-2" /> Quantidade
                </VLabel>
                <VTextField
                  v-model="ordem.or_quantidade"
                  type="number"
                  min="1"
                  placeholder="0"
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VLabel>
                  <VIcon icon="tabler-user" class="mr-2" /> Funcionário
                </VLabel>
                <AppSelect
                  v-model="ordem.or_funcionario_id"
                  :items="funcionarios"
                  item-title="fullName"
                  item-value="id"
                  placeholder="Selecione o funcionário"
                  :loading="loadingFuncionarios"
                  :disabled="disabled"
                  clearable
                />
              </VCol>

              <VCol cols="12">
                <VLabel>
                  <VIcon icon="tabler-file-text" class="mr-2" /> Motivo
                </VLabel>
                <VTextarea
                  rows="2"
                  active
                  auto-grow
                  v-model="ordem.or_motivo"
                  placeholder="Motivo da retirada..."
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
                  v-model="ordem.or_observacoes"
                  placeholder="Observações sobre a retirada..."
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12" v-if="!isNewOrdem">
                <VAlert type="warning" variant="tonal">
                  <VIcon icon="tabler-alert-triangle" class="mr-2" />
                  <strong>Atenção:</strong> Ordens de retirada não podem ser editadas após a criação.
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
            color="error"
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

