<!-- EmojiPicker.vue -->
<script setup>
import { ref, computed } from "vue"

const props = defineProps({
  modelValue: { type: String, default: null },
  itemsPerPage: { type: Number, default: 60 },
})

const emit = defineEmits(["update:modelValue"])

// Lista base (char + nome/keywords p/ busca). Pode estender à vontade.
import EMOJIS from "@/utils/emojis_full.js"

const search = ref("")
const page = ref(1)

const normalized = (s) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")

const baseFiltered = computed(() => {
  const q = normalized(search.value.trim())
  if (!q) return EMOJIS
  return EMOJIS.filter(e =>
    normalized(e.name + " " + e.kw + " " + e.char).includes(q)
  )
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(baseFiltered.value.length / props.itemsPerPage))
)

const pagedEmojis = computed(() => {
  const start = (page.value - 1) * props.itemsPerPage
  return baseFiltered.value.slice(start, start + props.itemsPerPage)
})

function selectEmoji(char) {
  viewDialogEmoji.value = false;
  emit("update:modelValue", char)
}

const viewDialogEmoji = ref(false)

// reset página quando buscar
watchEffect(() => { page.value = 1 })
</script>

<template>
  <div class="d-flex flex-row gap-2 align-center">
    <p class="mb-0 text-sm">Emoji</p>

    <VCard variant="outlined" class="pa-2 cursor-pointer" @click="viewDialogEmoji = true">
      <div class="text-h5" style="line-height:1">
        {{ props.modelValue || "" }}
      </div>
    </VCard>
  </div>

  <VDialog v-model="viewDialogEmoji" max-width="600">
    <VCard>
      <VCardText>
        <div class="d-flex flex-row justify-space-between align-center mb-4">
          <h3 class="text-h6 mb-0">Selecione um emoji</h3>
          <VBtn icon variant="text" @click="viewDialogEmoji = false" aria-label="Fechar">
            <VIcon icon="tabler-x" />
          </VBtn>
        </div>

        <VTextField
          v-model="search"
          placeholder="Pesquisar (ex.: fogo, amor, gráfico...)"
          class="mb-4"
          density="comfortable"
          clearable
        />

        <div class="d-flex flex-wrap gap-3">
          <VCard
            variant="outlined"
            class="pa-2 cursor-pointer d-flex align-center justify-center"
            min-width="48"
            min-height="48"
            v-for="e in pagedEmojis"
            :key="e.char + e.name"
            @click="selectEmoji(e.char)"
            :color="modelValue === e.char ? 'primary' : undefined"
          >
            <span style="font-size:22px; line-height:1">{{ e.char }}</span>
          </VCard>
        </div>

        <div class="d-flex justify-center mt-4">
          <VPagination
            v-model="page"
            :length="totalPages"
            :total-visible="7"
          />
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.cursor-pointer { cursor: pointer; }
</style>
