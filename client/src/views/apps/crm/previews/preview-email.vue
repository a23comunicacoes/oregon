<script setup>
import { computed } from 'vue'

const props = defineProps({
  htmlContent: { type: String, required: true, default: '' },
  cssContent:  { type: String, required: true, default: '' },
})

const htmlComplete = computed(() => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <base target="_blank" />
    <style>html,body{margin:0;padding:0}</style>
    <style>${props.cssContent}</style>
  </head>
  <body>
    ${props.htmlContent}
  </body>
</html>
`)
</script>

<template>
  <!-- Isolado do site. Remova/ajuste permissões do sandbox conforme sua necessidade -->
  <iframe
    :srcdoc="htmlComplete"
    sandbox="allow-popups allow-forms"
    style="width:100%;height:100%;border:0;transform:scale(0.7);"
  />
</template>
