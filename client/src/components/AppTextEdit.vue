<script setup>
  import moment from "moment";

  const props = defineProps({
    modelValue: {
      type: String,
      default: "",
    },
    tag: {
      type: String,
      default: "p",
    },
    class: {
      type: String,
      default: "mb-0",
    },
    style: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "text",
    },
    rules: {
      type: Array,
      default: () => [],
    },
    values: {
      type: Array,
      default: () => [],
    },
    label: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    tooltip: {
      type: String,
      default: null,
    },
    variant: {
      type: String,
      default: null,
    },
    viewCompleto: {
      type: Boolean,
      default: false,
    },
    maxLength: {
      type: [Number, String],
      default: 150,
    },
  });

  const emit = defineEmits(["update:modelValue", "save"]);

  const viewEdit = ref(false);
  const valor = ref(props.modelValue);
  const verTudo = ref(false);

  const formatValue = (val) => {
    if (!val) return "R$ 0,00";

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const textLabel = computed(() => {
    let text =
      props.modelValue != null && props.modelValue !== ""
        ? props.modelValue
        : props.tooltip || props.placeholder || "Clique para editar";

    if (props.type == "dinheiro") {
      text = formatValue(props.modelValue);
    } else if (props.type == "date" && props.modelValue) {
      text = moment(props.modelValue).format("DD/MM/YYYY");
    } else if (props.type == "datetime-local" && props.modelValue) {
      text = moment(props.modelValue).format("DD/MM/YYYY HH:mm");
    }

    if (props.viewCompleto && !verTudo.value && text.length > props.maxLength) {
      text = text.substring(0, props.maxLength) + "...";
    }

    return text;
  });
</script>
<template>
  <v-hover>
    <template v-slot:default="{ isHovering, props: propsHover }">
      <component
        v-bind="propsHover"
        :is="props.tag"
        :class="[
          props.class,
          { 'hover-edit-component': isHovering },
          { 'mb-0': props.class?.includes('mb') && isHovering },
        ]"
        :style="props.style"
        v-if="!viewEdit"
        @click="
          props.viewCompleto && textLabel.length > props.maxLength
            ? (verTudo = !verTudo)
            : (viewEdit = true)
        "
        style="transition: all 0.3s"
      >
        <VIcon
          v-if="props.icon"
          :icon="props.icon"
          class="mr-2"
          :color="props.colorIcon ?? undefined"
        />

        {{ textLabel }}

        <a
          href="#"
          @click.prevent="verTudo = !verTudo"
          v-if="props.viewCompleto && textLabel.length > props.maxLength"
          class="ml-2"
        >
          {{ verTudo ? "Ver menos" : "Ver mais" }}
        </a>

        <VIcon
          v-if="isHovering"
          icon="tabler-pencil"
          class="ml-5"
          @click="viewEdit = true"
        />

        <VTooltip
          v-if="props.tooltip"
          :text="props.tooltip"
          activator="parent"
        />
      </component>
    </template>
  </v-hover>

  <VTextField
    v-if="
      viewEdit &&
      (props.type == 'text' ||
        props.type == 'email' ||
        props.type == 'number' ||
        props.type == 'password' ||
        props.type == 'date' ||
        props.type == 'datetime-local' ||
        props.type == 'tel')
    "
    v-model="valor"
    :type="props.type"
    :rules="props.rules"
    :label="props.label ?? undefined"
    :placeholder="props.placeholder || props.modelValue || ''"
    :class="props.class"
    :style="props.style"
    @keyup.enter="
      emit('update:modelValue', valor);
      emit('save', valor);
      viewEdit = false;
    "
  >
    <template #append>
      <IconBtn
        color="error"
        class="mr-2"
        @click="
          viewEdit = false;
          valor = props.modelValue;
        "
      >
        <VIcon icon="tabler-x" />
      </IconBtn>

      <IconBtn
        color="success"
        @click="
          emit('update:modelValue', valor);
          emit('save', valor);
          viewEdit = false;
        "
      >
        <VIcon icon="tabler-check" />
      </IconBtn>
    </template>
  </VTextField>

  <VSelect
    v-if="viewEdit && props.type == 'select'"
    v-model="valor"
    :items="props.values"
    :rules="props.rules"
    :label="props.label ?? undefined"
    :placeholder="props.placeholder || props.modelValue || ''"
    :class="props.class"
    :style="props.style"
  >
    <template #append>
      <IconBtn
        color="error"
        class="mr-2"
        @click="
          viewEdit = false;
          valor = props.modelValue;
        "
      >
        <VIcon icon="tabler-x" />
      </IconBtn>

      <IconBtn
        color="success"
        @click="
          emit('update:modelValue', valor);
          emit('save', valor);
          viewEdit = false;
        "
      >
        <VIcon icon="tabler-check" />
      </IconBtn>
    </template>
  </VSelect>

  <VTextarea
    v-if="viewEdit && props.type == 'textarea'"
    v-model="valor"
    :rules="props.rules"
    :label="props.label ?? undefined"
    :placeholder="props.placeholder || props.tooltip || props.modelValue || ''"
    :class="props.class"
    :style="props.style"
    rows="3"
    auto-grow
    active
    :variant="props.variant || 'outlined'"
  >
    <template #append>
      <IconBtn
        color="error"
        class="mr-2"
        @click="
          viewEdit = false;
          valor = props.modelValue;
        "
      >
        <VIcon icon="tabler-x" />
      </IconBtn>

      <IconBtn
        color="success"
        @click="
          emit('update:modelValue', valor);
          emit('save', valor);
          viewEdit = false;
        "
      >
        <VIcon icon="tabler-check" />
      </IconBtn>
    </template>
  </VTextarea>

  <div
    v-if="viewEdit && props.type == 'dinheiro'"
    :class="props.class"
    :style="props.style"
    class="d-flex flex-row align-center gap-2"
  >
    <Dinheiro v-model="valor" :label="props.label ?? undefined" />

    <IconBtn
      color="error"
      @click="
        viewEdit = false;
        valor = props.modelValue;
      "
    >
      <VIcon icon="tabler-x" />
    </IconBtn>

    <IconBtn
      color="success"
      @click="
        emit('update:modelValue', valor);
        emit('save', valor);
        viewEdit = false;
      "
    >
      <VIcon icon="tabler-check" />
    </IconBtn>
  </div>
</template>

<style>
  .hover-edit-component {
    background-color: rgb(var(--v-theme-surface));
    padding: 5px;
    border-radius: 5px;
    cursor: pointer;
  }
</style>
