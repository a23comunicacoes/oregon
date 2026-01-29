<template>
  <div class="view-toggle" @click="toggle">
    <div class="view-toggle__track">
      <div
        class="view-toggle__thumb"
        :class="{
          'view-toggle__thumb--right': modelValue === 'table',
        }"
      ></div>

      <!-- Lado Calendário -->
      <button
        type="button"
        class="view-toggle__option view-toggle__option--left"
        :class="{ 'view-toggle__option--active': modelValue === 'calendar' }"
        @click.stop="setView('calendar')"
      >
        <VIcon icon="tabler-calendar-event" class="view-toggle__icon" />
      </button>

      <!-- Lado Tabela -->
      <button
        type="button"
        class="view-toggle__option view-toggle__option--right"
        :class="{ 'view-toggle__option--active': modelValue === 'table' }"
        @click.stop="setView('table')"
      >
        <VIcon icon="tabler-table" class="view-toggle__icon" />
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])


const setView = (view) => {
  if (view !== props.modelValue) emit('update:modelValue', view)
}

const toggle = () => {
  emit('update:modelValue', props.modelValue === 'calendar' ? 'table' : 'calendar')
}
</script>

<style scoped>
.view-toggle {
  display: inline-flex;
  cursor: pointer;
}

.view-toggle__track {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100px;
  height: 50px;
  padding: 4px;
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
  overflow: hidden;
}

/* Thumb que desliza */
.view-toggle__thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.3);
  transition: transform 0.22s ease, background 0.2s ease;
}

.view-toggle__thumb--right {
  transform: translateX(100%);
}

/* Botões internos */
.view-toggle__option {
  position: relative;
  z-index: 1;
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0 10px;
  color: rgb(var(--v-theme-on-surface, 30, 30, 30));
  transition: color 0.15s ease, transform 0.15s ease;
}

.view-toggle__option--active {
  color: rgb(var(--v-theme-on-primary, 255, 255, 255));
  transform: translateY(-0.5px);
}

.view-toggle__icon {
  width: 18px;
  height: 18px;
}

/* Esquerda/Direita só pra manter semântica se quiser customizar depois */
.view-toggle__option--left {
  justify-content: center;
}

.view-toggle__option--right {
  justify-content: center;
}

.view-toggle__label {
  white-space: nowrap;
}
</style>
