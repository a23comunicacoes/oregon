<script setup>
import { useAlert } from "@/composables/useAlert";
import { useConfirm } from "@/utils/confirm.js";
import { can } from "@layouts/plugins/casl";

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
const isNewSetor = ref(true);

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  setorData: Object,
});

const emit = defineEmits(["update:isDrawerOpen", "updateSetores", "closeDrawer"]);

const setor = ref({
  set_id: 0,
  set_nome: "",
  set_descricao: "",
  set_ativo: 1,
  total_produtos: 0,
});

watch(
  () => props.isDrawerOpen,
  (newVal) => {
    if (!newVal) {
      limparSetor();
    }
  }
);

watch(
  () => props.setorData,
  (newVal) => {
    if (
      newVal &&
      newVal?.set_id !== null &&
      newVal?.set_id !== undefined &&
      newVal?.set_id !== 0
    ) {
      isNewSetor.value = false;
      setor.value = newVal;
      disabled.value = !can("edit", "estoque");
    }
  }
);

if (
  props.setorData &&
  props.setorData?.set_id !== null &&
  props.setorData?.set_id !== undefined &&
  props.setorData?.set_id !== 0
) {
  isNewSetor.value = false;
  setor.value = props.setorData;
}

const limparSetor = () => {
  setor.value = {
    set_id: 0,
    set_nome: "",
    set_descricao: "",
    set_ativo: 1,
    total_produtos: 0,
  };
  isNewSetor.value = true;
};

const closeNavigationDrawer = () => {
  emit("update:isDrawerOpen", false);
  limparSetor();
};

const handleDrawerModelValueUpdate = (val) => {
  emit("update:isDrawerOpen", val);
};

const saveSetor = async () => {
  if (!setor.value.set_nome) {
    setAlert(
      "Digite o nome do setor!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    return;
  }

  loading.value = true;

  let link = isNewSetor.value
    ? "/setores/create"
    : `/setores/update/${setor.value.set_id}`;

  try {
    const res = await $api(link, {
      method: "POST",
      body: {
        set_nome: setor.value.set_nome,
        set_descricao: setor.value.set_descricao,
        set_ativo: setor.value.set_ativo,
      },
    });

    if (!res) return;

    setAlert(
      `Setor ${isNewSetor.value ? "cadastrado" : "atualizado"} com sucesso!`,
      "success",
      "tabler-building",
      3000
    );

    closeNavigationDrawer();
    emit("updateSetores");
  } catch (error) {
    console.error("Erro ao cadastrar setor:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        `Erro ao ${
          isNewSetor.value ? "cadastrar" : "atualizar"
        } setor! Tente novamente.`,
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  loading.value = false;
};

const loadingDelete = ref(false);

const deleteSetor = async () => {
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
      message: `Tem certeza que deseja excluir este setor? Esta ação não poderá ser desfeita.`,
    }))
  )
    return;

  loadingDelete.value = true;

  try {
    await $api(`/setores/delete/${setor.value.set_id}`, {
      method: "DELETE",
    });

    setAlert("Setor excluído com sucesso!", "success", "tabler-trash", 3000);
    emit("updateSetores");
    closeNavigationDrawer();
  } catch (error) {
    console.error("Erro ao excluir setor:", error, error.response);
    setAlert(
      error?.response?._data?.message ||
        "Ocorreu um erro ao excluir o setor, tente novamente!",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  loadingDelete.value = false;
};
</script>

<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    width="700"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <VCard flat v-if="setor">
      <VCardText class="pt-2">
        <!-- 👉 Title -->
        <AppDrawerHeaderSection @cancel="closeNavigationDrawer">
          <template #title>
            <h5 class="text-h5 mb-0 d-flex flex-row gap-3 align-center">
              {{ isNewSetor ? "Cadastrar" : "Editar" }} Setor
            </h5>
          </template>
        </AppDrawerHeaderSection>

        <VRow>
          <VCol cols="12">
            <VRow>
              <VCol cols="12" md="8">
                <VLabel>
                  <VIcon icon="tabler-building" class="mr-2" /> Nome do Setor
                </VLabel>
                <VTextField
                  v-model="setor.set_nome"
                  outlined
                  dense
                  placeholder="Digite o nome do setor..."
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12" md="4">
                <VLabel>
                  <VIcon icon="tabler-toggle-right" class="mr-2" /> Status
                </VLabel>
                <VSwitch
                  v-model="setor.set_ativo"
                  :value="1"
                  :label="setor.set_ativo == 1 ? 'Ativo' : 'Inativo'"
                  :disabled="disabled"
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
                  v-model="setor.set_descricao"
                  outlined
                  dense
                  placeholder="Digite uma descrição do setor..."
                  :disabled="disabled"
                />
              </VCol>

              <VCol cols="12" v-if="!isNewSetor">
                <VAlert type="info" variant="tonal" class="mb-4">
                  <VIcon icon="tabler-info-circle" class="mr-2" />
                  Este setor possui <strong>{{ setor.total_produtos }}</strong>
                  produto(s) associado(s).
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
            @click="deleteSetor"
            :loading="loadingDelete"
            v-if="!isNewSetor && !disabled && can('delete', 'estoque')"
          >
            Excluir
          </VBtn>
          <VBtn
            v-if="!disabled"
            @click="saveSetor"
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

