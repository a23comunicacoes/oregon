<script setup>
  import { PerfectScrollbar } from "vue3-perfect-scrollbar";
  import { useAlert } from "@/composables/useAlert";
  import { watch } from "vue";

  const loading = ref(false);

  const props = defineProps({
    isDrawerOpen: {
      type: Boolean,
      required: true,
    },
    tagData: Object,
  });

  const emit = defineEmits(["update:isDrawerOpen", "updateTag", "closeDrawer"]);

  console.log("tagData:", props.tagData);

  const { setAlert } = useAlert();

  const atualUser = useCookie("userData").value;

  const tag = ref({
    id: 0,
    name: "",
    description: "",
  });

  watch(
    () => props.isDrawerOpen,
    (newVal) => {
      if (!newVal) {
        limparTag();
      }
    }
  );

  const limparTag = () => {
    tag.value = {
      id: 0,
      name: "",
      description: "",
    };
  };

  const closeNavigationDrawer = () => {
    emit("update:isDrawerOpen", false);
    limparTag();
  };

  const handleDrawerModelValueUpdate = (val) => {
    emit("update:isDrawerOpen", val);
  };

  const saveSeg = async () => {
    console.log("tag:", tag.value);
    loading.value = true;

    try {
      const res = await $api(
        !tag.value?.id ? `/crm/create/tag` : `/crm/update/tag`,
        {
          method: "POST",
          body: tag.value,
        }
      );

      if (!res) return;

      console.log("tag cadastrado com sucesso!", res);

      setAlert(
        `Tag ${tag.value?.id ? "atualizada" : "cadastrada"} com sucesso!`,
        "success",
        "tabler-user-check",
        3000
      );

      closeNavigationDrawer();
      emit("updateTag");
    } catch (error) {
      console.error("Erro ao cadastrar tag:", error, error.response);
      setAlert(
        `Erro ao ${
          tag.value?.id ? "cadastrar" : "atualizar"
        } tag! Tente novamente.`,
        "error",
        "tabler-alert-triangle",
        3000
      );
    }

    loading.value = false;
  };

  watch(
    () => props.tagData,
    (newVal) => {
      if (newVal) {
        tag.value = newVal;
      }
    }
  );

  if (props.tagData) {
    tag.value = props.tagData;
  }
</script>
<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
    max-width="500"
  >
    <VCard flat>
      <VCardText>
        <!-- 👉 Title -->
        <AppDrawerHeaderSection
          :title="tag.value?.id ? 'Editar Tag' : 'Cadastrar Tag'"
          @cancel="closeNavigationDrawer"
          customClass="pa-0 mb-3"
        />

        <VRow>
          <VCol cols="12">
            <AppTextField
              v-model="tag.name"
              required
              :rules="[requiredValidator]"
              placeholder="Insira o nome da tag"
              label="Nome da Tag"
            />
          </VCol>
          <VCol cols="12">
            <label class="v-label mb-2 text-body-2 text-high-emphasis">
              Cor da etiqueta
            </label>
            <div class="d-flex justify-center mb-6">
              <VColorPicker
                class="color-picker-custom"
                v-model="tag.color"
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
          </VCol>
        </VRow>

        <div class="linha-flex justify-end mt-4">
          <VBtn
            variant="outlined"
            color="secondary"
            @click="closeNavigationDrawer"
            :disabled="loading"
          >
            Cancelar
          </VBtn>
          <VBtn
            class="me-3"
            @click="saveSeg"
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
