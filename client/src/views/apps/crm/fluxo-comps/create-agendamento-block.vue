<template>
  <div>
    <!-- Aviso Principal -->
    <VAlert type="info" variant="tonal" class="mb-4">
      <VAlertTitle>
        <VIcon icon="tabler-robot" class="me-2" />
        Criação de Agendamento com IA
      </VAlertTitle>
      <p class="mb-0">
        A IA coletará automaticamente todas as informações necessárias (serviço, data, horário, endereço) 
        e criará o agendamento de forma inteligente, verificando disponibilidade e precificação.
      </p>
    </VAlert>

    <!-- Ativação da IA -->
    <VCard variant="outlined" class="mb-4">
      <VCardText>
        <VSwitch
          :model-value="config.useIA !== false"
          @update:model-value="updateUseIA"
          label="Usar IA para gerenciar agendamento"
          color="primary"
          :disabled="true"
        />
        <div class="text-caption mt-2">
          <VIcon icon="tabler-info-circle" size="14" class="me-1" />
          Este bloco funciona exclusivamente com IA. A IA gerenciará todo o processo de agendamento.
        </div>
      </VCardText>
    </VCard>

    <!-- Instruções Específicas -->
    <VCard variant="outlined" class="mb-4">
      <VCardText>
        <h6 class="text-subtitle-1 mb-3">
          <VIcon icon="tabler-message-cog" class="me-1" />
          Instruções Específicas para a IA
        </h6>
        
        <AppTextarea
          :model-value="config.instrucoesIA || ''"
          @update:model-value="updateInstrucoesIA"
          label="Instruções Adicionais"
          placeholder="Ex: Priorize agendamentos pela manhã, sempre confirme o endereço duas vezes, ofereça desconto para agendamentos em dia de semana..."
          rows="4"
          auto-grow
          hint="Estas instruções complementam as configurações gerais do GPT AI"
          persistent-hint
        />
      </VCardText>
    </VCard>

    <!-- Como a IA Funciona -->
    <VExpansionPanels>
      <VExpansionPanel>
        <VExpansionPanelTitle>
          <div class="d-flex align-center">
            <VIcon icon="tabler-help-circle" class="me-2" color="info" />
            <span>Como funciona?</span>
          </div>
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <div class="text-body-2">
            <p class="font-weight-bold">A IA seguirá este fluxo automaticamente:</p>
            
            <ol class="pl-4">
              <li class="mb-2">
                <strong>Identificar intenção:</strong> Entende que o cliente quer agendar um serviço
              </li>
              <li class="mb-2">
                <strong>Coletar informações:</strong>
                <ul class="pl-4">
                  <li>Qual serviço o cliente deseja</li>
                  <li>Data e horário preferidos</li>
                  <li>Endereço de atendimento</li>
                  <li>Detalhes adicionais (tamanho, tipo, etc)</li>
                </ul>
              </li>
              <li class="mb-2">
                <strong>Verificar disponibilidade:</strong> Consulta horários livres dos funcionários
              </li>
              <li class="mb-2">
                <strong>Calcular preço:</strong> Baseado nas regras de precificação configuradas
              </li>
              <li class="mb-2">
                <strong>Confirmar detalhes:</strong> Recapitula tudo com o cliente
              </li>
              <li class="mb-2">
                <strong>Criar agendamento:</strong> Após confirmação do cliente
              </li>
            </ol>

            <VAlert type="success" variant="tonal" density="compact" class="mt-3">
              <p class="text-caption mb-0">
                <VIcon icon="tabler-check" size="14" class="me-1" />
                A IA usa as configurações definidas em "Configurações > GPT AI" para:
                <br>• Regras de precificação por serviço
                <br>• Disponibilidade de funcionários
                <br>• Datas bloqueadas (feriados)
                <br>• Comportamento e tom de voz
              </p>
            </VAlert>
          </div>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Contexto Adicional -->
    <VDivider class="my-4" />
    
    <div class="text-caption text-medium-emphasis">
      <VIcon icon="tabler-info-circle" class="me-1" size="14" />
      Este bloco criará um novo agendamento para o cliente atual no fluxo, utilizando o contexto 
      completo do cliente (histórico, preferências, endereços cadastrados).
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

// Sempre forçar useIA como true
const updateUseIA = (value) => {
  emit('update:config', {
    ...props.config,
    useIA: true // Sempre true
  });
};

const updateInstrucoesIA = (value) => {
  emit('update:config', {
    ...props.config,
    instrucoesIA: value
  });
};

// Inicializar config se estiver vazia ou forçar useIA
if (!props.config.useIA) {
  emit('update:config', {
    ...props.config,
    useIA: true,
    instrucoesIA: props.config.instrucoesIA || ''
  });
}
</script>
