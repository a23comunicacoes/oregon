<script setup>
const { setAlert } = useAlert();

const loading = ref(false);
const loadingUpsert = ref(false);
const viewUpsert = ref(false);

const tiposAgendamento = ref([]);
const newTipoAgendamento = ref({
  id: null,
  name: "",
  icon: "",
});

const getTiposAgendamento = async () => {
  loading.value = true;
  try {
    const res = await $api("/config/get-tipos-agendamento");

    console.log("res", res);

    if (Array.isArray(res)) {
      tiposAgendamento.value = res;
    } else {
      tiposAgendamento.value = [];
    }
  } catch (error) {
    console.error(
      "Erro ao buscar tipos de agendamento:",
      error,
      error.response
    );
    tiposAgendamento.value = [];
  } finally {
    loading.value = false;
  }
};

getTiposAgendamento();

const upsertTipoAgendamento = async () => {
  loadingUpsert.value = true;
  try {
    const res = await $api("/config/upsert-tipo-agendamento", {
      method: "POST",
      body: newTipoAgendamento.value,
    });

    console.log("res", res);

    setAlert(
      "Tipo de agendamento salvo com sucesso!",
      "success",
      "tabler-check",
      3000
    );
    getTiposAgendamento();
    viewUpsert.value = false;
    newTipoAgendamento.value = {
      id: null,
      name: "",
      icon: "",
    };
  } catch (error) {
    console.error("Erro ao upsert tipo de agendamento:", error, error.response);
    setAlert(
      error.response._data.message || "Erro ao salvar tipo de agendamento!",
      "error",
      "tabler-x",
      8000
    );
  } finally {
    loadingUpsert.value = false;
  }
};

const deleteTipoAgendamento = async (id) => {

  try {
    const res = await $api("/config/delete-tipo-agendamento", {
      method: "DELETE",
      body: { id },
    });

    console.log("res", res);

    setAlert(
      "Tipo de agendamento deletado com sucesso!",
      "success",
      "tabler-check",
      3000
    );
    getTiposAgendamento();
  } catch (error) {
    console.error("Erro ao deletar tipo de agendamento:", error, error.response);
    setAlert(
      error.response._data.message || "Erro ao deletar tipo de agendamento!",
      "error",
      "tabler-x",
      8000
    );
  } 
};
</script>
<template>
  <VBtn @click="viewUpsert = true">
    <VIcon icon="tabler-plus" />
    Adicionar Tipo
  </VBtn>

  <VDialog v-model="viewUpsert" max-width="500">
    <VCard>
      <VCardText>
        <AppDrawerHeaderSection
          title="Adicionar Tipo de Agendamento"
          @cancel="
            viewUpsert = false;
            newTipoAgendamento = { id: null, name: '', icon: '' };
          "
        />

        <VRow>
          <VCol cols="12">
            <AppTextField
              v-model="newTipoAgendamento.name"
              label="Nome"
              placeholder="Digite o nome do tipo de agendamento"
              required
            />
          </VCol>

          <VCol cols="12">
            <EmojiPicker
              v-model="newTipoAgendamento.icon"
              label="Emoji do Tipo de Agendamento"
              @update:modelValue="(val) => (newTipoAgendamento.icon = val)"
            />
          </VCol>
        </VRow>

        <div class="d-flex justify-end flex-row gap-2 align-center">
          <VBtn
            @click="
              viewUpsert = false;
              newTipoAgendamento = { id: null, name: '', icon: '' };
            "
            color="secondary"
            variant="outlined"
            :disabled="loadingUpsert"
          >
            Cancelar
          </VBtn>
          <VBtn @click="upsertTipoAgendamento" :loading="loadingUpsert">
            Salvar
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <div class="d-flex flex-wrap gap-5 mt-6 w-100">
    <VCard
      v-for="tipo in tiposAgendamento"
      class="pa-2"
      rounded="pill"
      style="min-width: 130px;"
    >
    <div class="d-flex flex-row gap-2 align-center justify-center">
      <p class="text-sm mb-0 ml-2 mr-4">
        {{ tipo.icon }}
        {{ tipo.name }}
      </p>

      <VIcon size="14" icon="tabler-edit" @click="
        viewUpsert = true;
        newTipoAgendamento = {
          id: tipo.id,
          name: tipo.name,
          icon: tipo.icon,
        };
      " />
      <VIcon size="14" icon="tabler-trash" @click="deleteTipoAgendamento(tipo.id)" />
    </div>
  </VCard>
  </div>
</template>
