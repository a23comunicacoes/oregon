<script setup>
  import { readonly, ref, watch } from "vue";

  const props = defineProps({
    modelValue: {
      type: [String, Number],
      default: "0",
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      required: false,
    },
    hint: {
      type: String,
      required: false,
    },
    customClass: {
      type: String,
      required: false,
      default: "",
    },
    style: {
      type: String,
      required: false,
      default: "",
    },
  });

  const emit = defineEmits(["update:modelValue"]);

  const localValor = ref(props.modelValue);

  /* watch(() => props.modelValue, (newValue) => {
    localValor.value = newValue;
}); */

  watch(localValor, (newValue) => {
    emit("update:modelValue", newValue);
  });

  watch(
    () => props.modelValue,
    (newVal) => {
      localValor.value = newVal;
    }
  );

  const moneyConfig = {
    masked: false,
    disabledNegative: true,
    precision: 2,
    prefix: "R$ ",
    decimal: ",",
    thousands: ".",
  };
</script>

<template>
  <VRow class="ma-0">
    <VCol cols="12" class="pa-0">
      <label
        class="v-label mb-1 text-body-2 text-high-emphasis"
        for="app-select-Quantidade de cotas-ja07e"
        v-if="props.label"
        >{{ props.label }}</label
      >
    </VCol>
    <VCol cols="12" class="pa-0">
      <div
        class="v-input v-input--horizontal v-input--center-affix v-input--density-compact v-locale--is-ltr v-input--dirty v-text-field"
        :class="[props.customClass]" :style="props.style"
      >
        <div class="v-input__control">
          <div
            class="v-field v-field--active v-field--center-affix v-field--dirty v-field--no-label v-theme--light v-locale--is-ltr"
            :class="!props.customClass ? 'v-field--variant-outlined' : ''"
          >
            <div class="v-field__overlay"></div>
            <div class="v-field__loader">
              <div
                class="v-progress-linear v-progress-linear--rounded v-progress-linear--rounded-bar v-progress-linear--rounded v-theme--light v-locale--is-ltr"
                role="progressbar"
                aria-hidden="true"
                aria-valuemin="0"
                aria-valuemax="100"
                style="
                  top: 0px;
                  height: 0px;
                  --v-progress-linear-height: 2px;
                  left: 50%;
                  transform: translateX(-50%);
                "
              >
                <div
                  class="v-progress-linear__background bg-primary"
                  style="width: 100%"
                ></div>
                <div class="v-progress-linear__indeterminate">
                  <div
                    class="v-progress-linear__indeterminate long bg-primary"
                  ></div>
                  <div
                    class="v-progress-linear__indeterminate short bg-primary"
                  ></div>
                </div>
              </div>
            </div>
            <div class="v-field__field" data-no-activator="">
              <money3
                v-model="localValor"
                v-bind="moneyConfig"
                placeholder="Insira o valor"
                class="v-field__input"
                :readonly="props.readonly"
              />
            </div>
            <div class="v-field__outline">
              <div class="v-field__outline__start"></div>
              <div class="v-field__outline__end"></div>
            </div>
          </div>
        </div>
        <div
          class="v-input__details"
          v-if="props.hint && props.hint !== ''"
          style="padding: 0"
        >
          <div class="v-messages" role="alert" aria-live="polite">
            <div class="v-messages__message" style="font-size: 11px !important">
              {{ props.hint }}
            </div>
          </div>
        </div>
      </div>
    </VCol>
  </VRow>
</template>
