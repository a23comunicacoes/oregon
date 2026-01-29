<script setup>
  import { computed, onMounted, ref } from "vue";
  import { VDialog, VCard, VCardText, VBtn, VIcon } from "vuetify/components";

  const props = defineProps({
    title: { type: String, default: "Confirmar ação" },
    message: { type: String, default: "Tem certeza que deseja continuar?" },
    confirmText: { type: String, default: "Confirmar" },
    cancelText: { type: String, default: "Cancelar" },
    color: { type: String, default: "primary" }, // usado quando dangerous=false
    variant: { type: String, default: "flat" }, // flat | tonal | elevated | outlined | text | plain
    width: { type: [Number, String], default: 480 },
    persistent: { type: Boolean, default: false }, // impede fechar clicando fora/ESC
    icon: { type: String, default: "mdi-help-circle-outline" },
    loading: { type: Boolean, default: false }, // opcional: mostra spinner no confirmar
    dangerous: { type: Boolean, default: false }, // força cor "error"
    allowHtml: { type: Boolean, default: false }, // renderiza message como HTML (cuidado com XSS)
    confirmOnEnter: { type: Boolean, default: true }, // Enter confirma
  });

  const emit = defineEmits(["confirm", "cancel"]);

  const open = ref(false);
  onMounted(() => {
    open.value = true;
  });

  const computedColor = computed(() =>
    props.dangerous ? "error" : props.color
  );

  function handleConfirm() {
    emit("confirm");
  }

  function handleCancel() {
    emit("cancel");
  }

  function onEsc() {
    if (!props.persistent) handleCancel();
  }

  function onEnter() {
    if (props.confirmOnEnter && !props.loading) handleConfirm();
  }
</script>

<template>
  <VApp>
    <VDialog
      v-model="open"
      :persistent="persistent"
      :max-width="width"
      @keydown.esc="onEsc"
      @keydown.enter.prevent="onEnter"
    >
      <VCard>
        <VCardText>
          <AppDrawerHeaderSection
            :title="title"
            @cancel="handleCancel"
            customClass="pa-0 mb-2"
          />

          <div v-if="!allowHtml">
            <p class="mb-0">{{ message }}</p>
          </div>
          <div v-else v-html="message" />

          <div class="linha-flex justify-end mt-4">
            <VBtn variant="text" :disabled="loading" @click="handleCancel">
              {{ cancelText }}
            </VBtn>
            <VBtn
              :color="computedColor"
              :variant="variant"
              :loading="loading"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VDialog>
  </VApp>
</template>
