<template>
  <div>
    <VRow>
      <VCol cols="12" md="6">
        <AppTextField
          v-model.number="config.delayValue"
          type="number"
          label="Tempo de espera"
          placeholder="0"
          hint="Tempo que o fluxo aguardará antes de continuar"
          persistent-hint
          min="0"
        />
      </VCol>
      <VCol cols="12" md="6">
        <AppSelect
          v-model="config.delayType"
          :items="timeTypes"
          label="Unidade de tempo"
          placeholder="Selecione"
        />
      </VCol>
    </VRow>

    <VDivider class="my-4" />
    
    <div class="mb-4">
      <h6 class="text-h6 mb-2">Como funciona</h6>
      <VCard variant="outlined" class="pa-4">
        <VList density="compact">
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-clock" color="primary" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Pausa a execução do fluxo pelo tempo configurado
            </VListItemTitle>

            <VTooltip activator="parent" text="Pausa a execução do fluxo pelo tempo configurado" />
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-hourglass" color="info" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Útil para aguardar entre mensagens ou ações
            </VListItemTitle>

            <VTooltip activator="parent" text="Útil para aguardar entre mensagens ou ações" />
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-arrow-right" color="success" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Após o tempo, continua automaticamente para o próximo bloco
            </VListItemTitle>

            <VTooltip activator="parent" text="Após o tempo, continua automaticamente para o próximo bloco" />
          </VListItem>
        </VList>
      </VCard>
    </div>

    <div class="text-caption text-medium-emphasis">
      <VIcon icon="tabler-info-circle" class="me-1" />
      O delay é executado de forma assíncrona e não bloqueia outras execuções de fluxo
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  config: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:config']);

const timeTypes = [
  { title: 'Segundos', value: 'seconds' },
  { title: 'Minutos', value: 'minutes' },
  { title: 'Horas', value: 'hours' },
  { title: 'Dias', value: 'days' }
];

// Inicializar config se estiver vazia
if (!props.config.delayValue && props.config.delayValue !== 0) {
  emit('update:config', {
    ...props.config,
    delayValue: 0,
    delayType: 'seconds'
  });
}

// Migrar formato antigo para novo
if (props.config.seconds !== undefined && props.config.delayValue === undefined) {
  emit('update:config', {
    ...props.config,
    delayValue: props.config.seconds,
    delayType: 'seconds'
  });
}
</script>

