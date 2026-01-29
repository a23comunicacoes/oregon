<template>
  <div>
    <!-- Aviso Principal -->
    <VAlert type="info" variant="tonal" class="mb-4">
      <VAlertTitle>
        <VIcon icon="tabler-robot" class="me-2" />
        Atualização de Agendamento com IA
      </VAlertTitle>
      <p class="mb-0">
        A IA identificará automaticamente qual agendamento o cliente deseja atualizar e coletará 
        as informações necessárias para realizar as alterações (reagendamento, mudança de serviço, etc).
      </p>
    </VAlert>

    <!-- Ativação da IA -->
    <VCard variant="outlined" class="mb-4">
      <VCardText>
        <VSwitch
          :model-value="config.useIA !== false"
          @update:model-value="updateUseIA"
          label="Usar IA para gerenciar atualização"
          color="primary"
          :disabled="true"
        />
        <div class="text-caption mt-2">
          <VIcon icon="tabler-info-circle" size="14" class="me-1" />
          Este bloco funciona exclusivamente com IA. A IA gerenciará todo o processo de atualização.
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
          placeholder="Ex: Sempre verifique se há taxas de remarcação, confirme a disponibilidade antes de sugerir nova data..."
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
                <strong>Identificar agendamento:</strong> Busca o agendamento do cliente no contexto
              </li>
              <li class="mb-2">
                <strong>Entender mudanças desejadas:</strong>
                <ul class="pl-4">
                  <li>Reagendar (nova data/horário)</li>
                  <li>Mudar serviço</li>
                  <li>Alterar endereço</li>
                  <li>Adicionar/remover serviços</li>
                  <li>Cancelar agendamento</li>
                </ul>
              </li>
              <li class="mb-2">
                <strong>Verificar disponibilidade:</strong> Se for reagendamento, consulta novos horários
              </li>
              <li class="mb-2">
                <strong>Recalcular preço:</strong> Se houver mudança de serviços
              </li>
              <li class="mb-2">
                <strong>Confirmar alterações:</strong> Recapitula o que será alterado
              </li>
              <li class="mb-2">
                <strong>Atualizar agendamento:</strong> Após confirmação do cliente
              </li>
            </ol>

            <VAlert type="warning" variant="tonal" density="compact" class="mt-3">
              <p class="text-caption mb-0">
                <VIcon icon="tabler-alert-circle" size="14" class="me-1" />
                <strong>Importante:</strong> A IA sempre verificará se há um agendamento válido no contexto. 
                Se não houver, perguntará ao cliente qual agendamento ele deseja atualizar.
              </p>
            </VAlert>

            <VAlert type="success" variant="tonal" density="compact" class="mt-3">
              <p class="text-caption mb-0">
                <VIcon icon="tabler-check" size="14" class="me-1" />
                A IA pode identificar agendamentos por:
                <br>• Número do agendamento
                <br>• Data do agendamento
                <br>• Serviço agendado
                <br>• Último agendamento ativo do cliente
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
      Este bloco atualizará um agendamento existente do cliente no fluxo, utilizando o contexto 
      completo (agendamentos ativos, histórico, disponibilidade).
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
