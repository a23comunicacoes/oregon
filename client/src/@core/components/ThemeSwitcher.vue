<script setup>
  import { useConfigStore } from "@core/stores/config";

  const props = defineProps({
    themes: {
      type: Array,
      required: true,
    },
  });

  const configStore = useConfigStore();
  const selectedItem = ref([configStore.theme]);
  
  // Update icon if theme is changed from othe
  // r sources
  watch(
    () => configStore.theme,
    () => {
      selectedItem.value = [configStore.theme];
    },
    { deep: true }
  );

  const openMenu = ref(false);
  // color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))"
</script>

<template>
  <VListItem @click="openMenu = !openMenu">
    <template #prepend>
      <VIcon
        class="me-2"
        size="22"
        :icon="props.themes.find((t) => t.value === configStore.theme)?.icon"
      />
    </template>

    <VListItemTitle>
      <span class="mb-0 text-capitalize"> Tema </span>
    </VListItemTitle>

    <VMenu activator="parent" location="end" offset="14px">
      <VList v-model:selected="selectedItem">
        <VListItem
          v-for="{ name, icon, value } in props.themes"
          :key="value"
          :value="value"
          :prepend-icon="icon"
          color="primary"
          class="text-capitalize"
          @click="
            () => {
              configStore.theme = value;
            }
          "
        >
          {{ name }}
        </VListItem>
      </VList>
    </VMenu>
  </VListItem>
</template>
