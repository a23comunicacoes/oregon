<template>
  <div>
    <VRow>
      <VCol cols="12">
        <label class="v-label mb-1 text-body-2 text-high-emphasis">
          Instruções para a IA

          <VIcon
            icon="tabler-info-circle-filled"
            class="ml-1"
            color="primary"
          />

          <VTooltip activator="parent">
            <p
              class="text-sm mb-0 text-center"
              style="max-width: 400px"
            >
              Dê instruções claras para a IA decidir entre SIM ou NÃO baseado nas últimas 50 mensagens do cliente.
              <br />
              <br />
              Exemplos:
              <br />
              • "Se o cliente demonstrou interesse em agendar, responda SIM"
              <br />
              • "Se o cliente está reclamando ou insatisfeito, responda NÃO"
              <br />
              • "Se o cliente perguntou sobre preços, responda SIM"
            </p>
          </VTooltip>
        </label>
        
        <AppTextarea
          v-model="config.instructions"
          placeholder="Ex: Se o cliente demonstrou interesse em agendar um serviço ou fez perguntas sobre preços, responda SIM. Se o cliente está reclamando, cancelando ou demonstrou desinteresse, responda NÃO."
          active
          rows="4"
          auto-grow
          required
          :rules="[requiredValidator]"
        />
      </VCol>
    </VRow>

    <VDivider class="my-4" />
    
    <div class="mb-4">
      <h6 class="text-h6 mb-2">Como funciona a Decisão IA</h6>
      <VCard variant="outlined" class="pa-4">
        <VList density="compact">
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-message-circle" color="primary" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Analisa as últimas 50 mensagens do cliente
            </VListItemTitle>
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-brain" color="warning" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Usa IA para entender o contexto e sentimento
            </VListItemTitle>
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-git-branch" color="success" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Direciona o fluxo para "SIM" ou "NÃO" baseado na decisão
            </VListItemTitle>
          </VListItem>
        </VList>
      </VCard>
    </div>

    <div class="text-caption text-medium-emphasis">
      <VIcon icon="tabler-info-circle" class="me-1" />
      A IA irá analisar o histórico de mensagens e decidir qual caminho seguir no fluxo.
    </div>
  </div>

  <!-- Variáveis Disponíveis -->
  <VDivider class="my-4" />
  
  <div class="mb-4">
    <h6 class="text-h6 mb-2">Variáveis Disponíveis</h6>
    <p class="text-caption text-medium-emphasis mb-4">
      Clique em uma variável para copiá-la e usá-la nas instruções
    </p>
    
    <div class="d-flex flex-wrap gap-2">
      <VChip
        v-for="variable in variaveisDisponiveis"
        :key="variable.value"
        size="small"
        :color="variable.type === 'dinamica' ? 'success' : variable.type === 'sistema' ? 'info' : 'primary'"
        variant="tonal"
        class="cursor-pointer"
        @click="copyVariable(variable.value)"
      >
        <VIcon icon="tabler-copy" size="small" class="me-1" />
        {{ variable.title }}
      </VChip>
    </div>
    
    <div class="text-caption mt-2">
      <VIcon icon="tabler-info-circle" class="me-1" size="small" />
      <span class="text-success">Verde</span> = Dinâmicas | 
      <span class="text-info">Azul</span> = Sistema | 
      <span class="text-primary">Primário</span> = Cliente/Agendamento
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAllVariables, copyVariableToClipboard } from '@/utils/dynamicVariables.js';

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:config']);

const { setAlert } = useAlert();
const variaveisDisponiveis = ref([]);

// Função para copiar variável
const copyVariable = (variableValue) => {
  copyVariableToClipboard(variableValue, setAlert);
};

onMounted(async () => {
  // Carregar todas as variáveis disponíveis
  const allVars = await getAllVariables();
  variaveisDisponiveis.value = allVars;
});

// Inicializar config se estiver vazia
if (!props.config.instructions) {
  emit('update:config', {
    ...props.config,
    instructions: ''
  });
}
</script>
