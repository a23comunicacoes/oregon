<script setup>
  defineOptions({
    name: "AppTextField",
    inheritAttrs: false,
  });

  const elementId = computed(() => {
    const attrs = useAttrs();
    const _elementIdToken = attrs.id || attrs.label;

    return _elementIdToken
      ? `app-text-field-${_elementIdToken}-${Math.random()
          .toString(36)
          .slice(2, 7)}`
      : undefined;
  });

  const label = computed(() => useAttrs().label);
</script>

<template>
  <div class="app-text-field flex-grow-1" :class="$attrs.class">
    <VLabel
      v-if="label"
      :for="elementId"
      class="mb-1 text-body-2 text-high-emphasis"
    >
      <slot name="label">
        {{ label || $attrs.label }}

        <span
          v-if="$attrs.required != null && $attrs.required !== false"
          class="text-error ml-1"
          >*</span
        >
      </slot>

      <slot name="tooltip" v-if="$slots.tooltip" />

      <VTooltip v-else-if="$attrs.tooltip">
        <template v-slot:activator="{ props }">
          <VIcon
            icon="tabler-info-circle"
            class="ml-1 cursor-pointer"
            v-bind="props"
          />
        </template>

        <p
          class="text-sm mb-0"
          :style="`max-width: ${$attrs.tooltipMaxWidth || '200px'}`"
        >
          {{ $attrs.tooltip }}
        </p>
      </VTooltip>
    </VLabel>
    <VTextField
      v-bind="{
        ...$attrs,
        class: null,
        label: undefined,
        variant: 'outlined',
        id: elementId,
      }"
    >
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}" />
      </template>
    </VTextField>
  </div>
</template>
