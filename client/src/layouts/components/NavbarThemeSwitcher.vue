<script setup>
const themes = [
  {
    name: 'Auto',
    icon: 'tabler-device-laptop',
    value: 'system',
  },
  {
    name: 'Claro',
    icon: 'tabler-sun-high',
    value: 'light',
  },
  {
    name: 'Escuro',
    icon: 'tabler-moon',
    value: 'dark',
  },
]
</script>

<template>
  <ThemeSwitcher :themes="themes" />
</template>
