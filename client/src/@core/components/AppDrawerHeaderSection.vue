<script setup>
const props = defineProps({
  title: {
    type: String
  },
  customClass: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['cancel'])
</script>

<template>
  <div class="d-flex align-center" :class="props.customClass ? props.customClass : 'pa-4'">
    <h5 class="text-h5">
      {{ props.title }}
    </h5>
    <slot name="title" />
    <VSpacer />

    <slot name="beforeClose" />

    <IconBtn
      variant="tonal"
      class="rounded"
      size="32"
      @click="$emit('cancel')"
    >
      <VIcon
        size="18"
        icon="tabler-x"
      />
    </IconBtn>
  </div>
</template>
