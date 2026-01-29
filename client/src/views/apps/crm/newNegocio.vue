<script setup>
  import { temaAtual } from "@core/stores/config";
  import { useFunctions } from "@/composables/useFunctions";
  import { watch } from "vue";

  const { getCep, estados, getCidades, escreverEndereco } = useFunctions();

  const { setAlert } = useAlert();

  const userData = useCookie("userData").value;
  const emit = defineEmits(["update:isDrawerOpen", "negocioSaved"]);

  let refData = {
    cli_Id: null,
    title: "",
    status: "Pendente",
    etapaId: null,
  };

  const props = defineProps({
    isDrawerOpen: {
      type: Boolean,
      required: true,
    },
    negocioData: {
      type: Object,
      default: () => ({
        id: null,
        title: "",
        cli_Id: null,
        etapaId: null,
      }),
    },
    cli_Id: {
      type: [Number, String],
      default: null,
    },
    etapaId: {
      type: [Number, String],
      default: null,
    },
  });

  const newNegocioData = ref({ ...refData });

  const closeDrawer = () => {
    emit("update:isDrawerOpen", false);
    newNegocioData.value = { ...refData };
  };

  const handleDrawer = (val) => {
    emit("update:isDrawerOpen", val);
    if (!val) {
      newNegocioData.value = { ...refData };
    }
  };

  const funis = ref([]);
  const clientes = ref([]);
  const searchQuery = ref("");
  const loadingClientes = ref(false);

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

  const getClientes = async () => {
    loadingClientes.value = true;

    try {
      const res = await $api("/clientes/list", {
        method: "GET",
        query: {
          q: searchQuery.value,
          itemsPerPage: 20,
          page: 1,
          cli_Id: props.cli_Id || newNegocioData.value?.cli_Id || null,
        },
      });

      console.log("res clientes", res);

      clientes.value = res.clientes;

      if (
        props.cli_Id &&
        res.clientes.length > 0 &&
        !newNegocioData.value.cli_Id
      ) {
        newNegocioData.value.cli_Id = props.cli_Id;
      }
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
    } finally {
      loadingClientes.value = false;
    }
  };

  getClientes();
  await getFunis();

  const loadingSave = ref(false);

  const saveNegocio = async () => {
    if (!newNegocioData.value?.cli_Id) {
      setAlert(
        "Selecione um cliente/lead para o negócio",
        "error",
        "tabler-alert-triangle",
        5000
      );
      return;
    }

    if (!newNegocioData.value?.etapaId) {
      setAlert(
        "Selecione uma etapa do funil para o negócio",
        "error",
        "tabler-alert-triangle",
        5000
      );
      return;
    }

    if(!newNegocioData.value?.title || newNegocioData.value?.title.trim() === ""){
      setAlert(
        "Informe o título do negócio",
        "error",
        "tabler-alert-triangle",
        5000
      );
      return;
    }

    loadingSave.value = true;

    try {
      const res = await $api("/crm/create/negocio", {
        method: "POST",
        body: newNegocioData.value,
      });

      if (!res) {
        throw new Error("Erro ao salvar negócio");
      }

      console.log("Negócio salvo:", res);

      setAlert("Negócio salvo com sucesso!", "success", "tabler-check", 5000);

      emit("negocioSaved", res?.id);
      closeDrawer();
    } catch (error) {
      console.error(error);
      setAlert(
        "Erro ao salvar negócio. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        5000
      );
    } finally {
      loadingSave.value = false;
    }
  };

  watch(
    () => props.negocioData,
    (newVal) => {
      console.log("negocioData changed:", newVal);
      if (props.etapaId && !newVal?.etapaId) {
        newVal.etapaId = props.etapaId;
      }
      if (newVal?.id) {
        newNegocioData.value = { ...refData, ...newVal };
      } else {
        newNegocioData.value = { ...refData };
      }

      getClientes();
      getFunis();
    },
    { immediate: true }
  );

  watch(
    () => props.isDrawerOpen,
    (newVal) => {
      if (!newVal) return;

      if (props.cli_Id && !newNegocioData.value.cli_Id) {
        newNegocioData.value.cli_Id = props.cli_Id;
      }

      if (props.etapaId && !newNegocioData.value.etapaId) {
        newNegocioData.value.etapaId = props.etapaId;
      }

      getClientes();
      getFunis();
    }
  );
</script>
<template>
  <VDialog
    :modelValue="props.isDrawerOpen"
    @update:modelValue="handleDrawer"
    max-width="600"
    persistent
  >
    <VCard v-if="newNegocioData && props.isDrawerOpen">
      <VCardText class="pa-4">
        <AppDrawerHeaderSection
          customClass="pa-0"
          :title="newNegocioData?.id ? `Editar Negócio` : 'Novo Negócio'"
          @cancel="closeDrawer"
        />

        <VRow class="mt-2">
          <!-- Nome -->
          <VCol cols="12">
            <AppTextField
              v-model="newNegocioData.title"
              label="Título do Negócio"
              placeholder="Informe o título do negócio"
              outlined
              :rules="[requiredValidator]"
              required
            />
          </VCol>

          <!-- Cliente -->
          <VCol cols="12">
            <AppSelect
              v-model="newNegocioData.cli_Id"
              :items="!loadingClientes ? clientes : []"
              item-title="cli_nome"
              item-value="cli_Id"
              label="Cliente/Lead"
              placeholder="Selecione o cliente/lead"
              :rules="[requiredValidator]"
              required
              :loading="loadingClientes"
            >
              <template #prepend-item>
                <VTextField
                  class="mx-4 my-2"
                  v-model="searchQuery"
                  placeholder="Buscar cliente/lead..."
                  @input="getClientes"
                  @keyup.enter="getClientes"
                  clearable
                  @click:clear="getClientes()"
                  :loading="loadingClientes"
                />
              </template>
            </AppSelect>
          </VCol>

          <!-- Etapa do Funil -->
          <VCol cols="12">
            <label class="v-label mb-2 text-body-2 text-high-emphasis">
              Etapa do Funil
              <span
                class="text-secondary ml-2"
                v-if="
                  newNegocioData.etapaId &&
                  funis.find((f) => f.id === newNegocioData.etapaId)
                "
              >
                ({{ funis.find((f) => f.id === newNegocioData.etapaId)?.nome }})
              </span>
              <span class="text-error ml-1" v-else>*</span>
            </label>
            <div class="d-flex flex-row align-center">
              <div
                v-for="(etapa, index) in funis"
                :key="etapa.id"
                class="etapa-div"
                :class="{
                  'bg-primary': newNegocioData.etapaId == etapa.id,
                  'etapa-first': index === 0,
                  'etapa-last': index === funis.length - 1,
                }"
                @click="newNegocioData.etapaId = etapa.id"
              >
                <VTooltip activator="parent" :text="etapa.nome" />
              </div>
            </div>
          </VCol>
        </VRow>

        <div class="linha-flex justify-end mt-4">
          <VBtn
            variant="outlined"
            color="secondary"
            rounded="pill"
            :disabled="loadingSave"
            @click="closeDrawer"
          >
            Cancelar
          </VBtn>

          <VBtn
            color="primary"
            rounded="pill"
            :loading="loadingSave"
            @click="saveNegocio"
          >
            Salvar Negócio
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
