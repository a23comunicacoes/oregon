<template>
  <div>
    <VRow>
      <VCol cols="12" md="6">
        <AppTextField
          v-model.number="config.timeoutValue"
          type="number"
          label="Tempo máximo"
          placeholder="0 = sem timeout"
          hint="Deixe 0 para aguardar indefinidamente"
          persistent-hint
          min="0"
        />
      </VCol>
      <VCol cols="12" md="6">
        <AppSelect
          v-model="config.timeoutType"
          :items="timeTypes"
          label="Unidade de tempo"
          placeholder="Selecione"
        />
      </VCol>
    </VRow>

    <VDivider class="my-4" />
    
    <div class="mb-4">
      <h6 class="text-h6 mb-2">Capturar Variáveis da Resposta</h6>
      <p class="text-caption text-medium-emphasis mb-4">
        Configure quais informações devem ser extraídas da resposta do usuário
      </p>
    </div>

    <!-- Configuração manual de variáveis -->
    <div>
      <VRow>
        <VCol cols="12">
          <div class="d-flex justify-space-between align-center mb-3">
            <h6 class="text-h6 mb-0">Variáveis para Capturar</h6>
            <VBtn
              @click="addVariable"
              variant="tonal"
              color="primary"
              size="small"
              style="height: 30px"
            >
              <VIcon class="me-1" icon="tabler-plus" />
              Variável
            </VBtn>
          </div>
          
          <div
            v-for="(variable, index) in config.variables"
            :key="variable.id"
            class="v-row align-items-center mb-3"
          >
            <VCol cols="12" md="5">
              <AppTextField
                v-model="variable.name"
                label="Nome da Variável"
                placeholder="Ex: nome_cliente"
                required
                :rules="[requiredValidator]"
              />
            </VCol>
            
            <VCol cols="12" md="5">
              <AppTextField
                v-model="variable.label"
                label="Rótulo (opcional)"
                placeholder="Ex: Nome do Cliente"
              />
            </VCol>
            
            <VCol cols="12" md="2" class="d-flex align-end">
              <IconBtn @click="removeVariable(index)" variant="tonal" color="error">
                <VIcon icon="tabler-trash" />
              </IconBtn>
            </VCol>
          </div>
          
          <div v-if="config.variables.length === 0" class="text-center py-4 text-medium-emphasis">
            <VIcon icon="tabler-info-circle" class="mb-2" size="48" />
            <p class="mb-0">Nenhuma variável configurada</p>
            <p class="text-caption">Adicione variáveis para capturar informações da resposta</p>
          </div>
        </VCol>
      </VRow>
    </div>

    <VDivider class="my-4" />
    
    <div class="mb-4">
      <h6 class="text-h6 mb-2">Condições da Resposta</h6>
      <p class="text-caption text-medium-emphasis mb-4">
        Configure condições que serão avaliadas com base na resposta do usuário
      </p>
      
      <div class="d-flex justify-space-between align-center mb-3">
        <h6 class="text-h6 mb-0">Condições</h6>
        <VBtn
          @click="addCondition"
          variant="tonal"
          color="primary"
          size="small"
          style="height: 30px"
        >
          <VIcon class="me-1" icon="tabler-plus" />
          Condição
        </VBtn>
      </div>

      <div v-for="(condition, index) in config.conditions" :key="condition.id" class="v-row align-items-center mb-4">
        <VCol cols="12" md="6">
          <AppSelect 
            v-model="condition.field" 
            :items="fieldItens.filter(item => condition.searchQuery ? 
            item.title?.toLowerCase()?.includes(condition.searchQuery?.toLowerCase()) : true)"
            label="Campo" 
            required 
            placeholder="Selecione o campo"
            @update:model-value="handleFieldSelect(condition)"
            >
            <template #prepend-item>
              <VTextField
                label="Pesquise"
                v-model="condition.searchQuery"
                placeholder="Pesquisar..."
                class="mb-2 mx-2"
              />
              <VDivider />
            </template>
        </AppSelect>
        </VCol>
        <VCol cols="12" md="6">
          <AppSelect 
            v-model="condition.operator" 
            :items="operatorItens" 
            label="Operador" 
            required 
            placeholder="Selecione o operador"
          />
        </VCol>
        <VCol cols="12" md="6">
          <AppTextField
            v-model="condition.value"
            required
            :rules="[requiredValidator]"
            placeholder="Insira o valor"
            label="Valor"
            :type="condition.field?.includes('data') ? 'date' : 'text'"
            v-if="!condition.valueIsSelect && !condition.valueIsDinheiro"
          />
          <AppSelect
            v-model="condition.value"
            :items="condition.itensValueSelect"
            label="Valor"
            required
            placeholder="Selecione o valor"
            v-if="condition.valueIsSelect && !condition.valueIsDinheiro"
          >
            <template #prepend-item>
              <VTextField
                label="Pesquise"
                v-model="searchQuery"
                placeholder="Pesquisar..."
                class="mb-2 mx-2"
              />
              <VDivider />
            </template>
          </AppSelect>
          <Dinheiro
            label="Valor"
            v-model="condition.value"
            required
            v-if="!condition.valueIsSelect && condition.valueIsDinheiro"
          />
        </VCol>
        <VCol cols="12" md="6" class="d-flex align-end gap-5">
          <AppSelect
            v-model="condition.logicalOperator"
            :items="[{ title: 'E', value: 'and' }, { title: 'OU', value: 'or' }]"
            label="Lógica"
            required
            placeholder="E/OU"
            v-if="config.conditions.length > 1 && index < config.conditions.length - 1"
          />
          <IconBtn @click="removeCondition(index)" variant="tonal" color="error">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </VCol>
        <VCol cols="12" class="pa-0 d-flex flex-row align-center justify-center">
          <VDivider />
          <span class="text-caption mx-2">{{ index === config.conditions.length - 1 ? "-" : condition.logicalOperator === "or" ? "OU" : "&" }}</span>
          <VDivider />
        </VCol>
      </div>
      
      <div v-if="config.conditions.length === 0" class="text-center py-4 text-medium-emphasis">
        <VIcon icon="tabler-info-circle" class="mb-2" size="48" />
        <p class="mb-0">Nenhuma condição configurada</p>
        <p class="text-caption">Adicione condições para avaliar a resposta do usuário</p>
      </div>
    </div>

    <VDivider class="my-4" />
    
    <div class="mb-4">
      <h6 class="text-h6 mb-2">Como funciona</h6>
      <VCard variant="outlined" class="pa-4">
        <VList density="compact">
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-message-circle" color="primary" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Aguarda uma resposta do usuário
            </VListItemTitle>

            <VTooltip activator="parent" text="Aguarda uma resposta do usuário" />
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-settings" color="info" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Captura variáveis configuradas manualmente
            </VListItemTitle>

            <VTooltip activator="parent" text="Captura variáveis configuradas manualmente" />
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-equal" color="secondary" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Avalia as condições configuradas
            </VListItemTitle>

            <VTooltip activator="parent" text="Avalia as condições configuradas" />
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-arrow-right" color="primary" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Continua o fluxo baseado no resultado das condições (SIM/NÃO)
            </VListItemTitle>

            <VTooltip activator="parent" text="Continua o fluxo baseado no resultado das condições (SIM/NÃO)" />
          </VListItem>
        </VList>
      </VCard>
    </div>

    <!-- Variáveis Disponíveis -->
    <VDivider class="my-4" />
    
    <div class="mb-4">
      <h6 class="text-h6 mb-2">Variáveis Disponíveis</h6>
      <p class="text-caption text-medium-emphasis mb-4">
        Clique em uma variável para copiá-la e usá-la nas condições
      </p>
      
      <div class="d-flex flex-wrap gap-2">
        <VChip
          v-for="variable in fieldItens"
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

    <div class="text-caption text-medium-emphasis">
      <VIcon icon="tabler-info-circle" class="me-1" />
      As variáveis capturadas poderão ser usadas em blocos subsequentes como <span v-pre>{{ nome_cliente }}, {{ telefone_cliente }}</span>, etc.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { getAllVariables, copyVariableToClipboard } from '@/utils/dynamicVariables.js';

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  flowVariables: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:config']);

const { setAlert } = useAlert();

const timeTypes = [
  { title: 'Segundos', value: 'seconds' },
  { title: 'Minutos', value: 'minutes' },
  { title: 'Horas', value: 'hours' },
  { title: 'Dias', value: 'days' }
];

const fieldItens = ref([]);
const infos = ref([]);
const tags = ref([]);
const funis = ref([]);
const fontesClientes = ref([]);
const searchQuery = ref('');

const operatorItens = [
  { title: 'Igual', value: 'equals' },
  { title: 'Diferente', value: 'not_equals' },
  { title: 'Contém', value: 'contains' },
  { title: 'Não contém', value: 'not_contains' },
  { title: 'Maior que', value: 'greater' },
  { title: 'Menor que', value: 'less' },
  { title: 'Maior ou igual', value: 'greater_equal' },
  { title: 'Menor ou igual', value: 'less_equal' },
  { title: 'Vazio', value: 'empty' },
  { title: 'Não vazio', value: 'not_empty' },
  { title: 'Regex', value: 'regex' }
];

// Função para copiar variável
const copyVariable = (variableValue) => {
  copyVariableToClipboard(variableValue, setAlert);
};

const addVariable = () => {
  const newVariable = {
    id: new Date().getTime(),
    name: '',
    label: ''
  };
  
  emit('update:config', {
    ...props.config,
    variables: [...(props.config.variables || []), newVariable]
  });
};

const removeVariable = (index) => {
  const newVariables = [...(props.config.variables || [])];
  newVariables.splice(index, 1);
  emit('update:config', {
    ...props.config,
    variables: newVariables
  });
};

const addCondition = () => {
  const newCondition = {
    id: new Date().getTime(),
    field: '',
    operator: 'equals',
    value: '',
    logicalOperator: 'and',
    valueIsSelect: false,
    valueIsDinheiro: false,
    itensValueSelect: []
  };
  
  emit('update:config', {
    ...props.config,
    conditions: [...(props.config.conditions || []), newCondition]
  });
};

const removeCondition = (index) => {
  const newConditions = [...(props.config.conditions || [])];
  newConditions.splice(index, 1);
  emit('update:config', {
    ...props.config,
    conditions: newConditions
  });
};

const handleFieldSelect = async (condition) => {
  condition.valueIsSelect = false;
  condition.valueIsDinheiro = false;
  condition.itensValueSelect = [];
  
  if (condition.field === 'variavel') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = await getAllVariables();
  }
  // Campos de gênero
  else if (condition.field === 'cliente_genero' || condition.field === 'genero') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = [
      { title: "Masculino", value: "masculino" },
      { title: "Feminino", value: "feminino" },
      { title: "Não informado", value: "nao_informado" },
    ];
  }
  // Campos de localização
  else if (condition.field === 'estado' || condition.field === 'cliente_estado') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = infos.value.estados || [];
  } else if (condition.field === 'cidade' || condition.field === 'cliente_cidade') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = infos.value.cidades || [];
  }
  // Campos de origem
  else if (condition.field === 'origem') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = infos.value.origens || [];
  }
  // Campos monetários
  else if (condition.field === 'cliente_valor_gasto' || condition.field === 'agendamento_valor' || condition.field === 'agendamento_valor_pago' || condition.field === 'agendamento_saldo_devedor') {
    condition.valueIsDinheiro = true;
  }
  // Campos de data
  else if (condition.field === 'cliente_data_cadastro' || condition.field === 'cliente_ultimo_agendamento' || condition.field === 'agendamento_data' || condition.field === 'agendamento_data_fim') {
    condition.valueIsSelect = false;
  }
  // Campos de tags
  else if (condition.field === 'tags') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = tags.value;
  }
  // Campos de status de agendamento
  else if (condition.field === 'agendamento_status') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = [
      { title: "Agendado", value: "1" },
      { title: "Confirmado", value: "2" },
      { title: "Atendido", value: "3" },
      { title: "Cancelado", value: "6" },
      { title: "Remarcado", value: "7" }
    ];
  }
  // Campos de tipo de agendamento
  else if (condition.field === 'agendamento_tipo') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = [
      { title: "Normal", value: "normal" },
      { title: "Bloqueio", value: "bloqueio" }
    ];
  }
  // Campos de comparação numérica
  else if (
    condition.field === 'cliente_valor_gasto' ||
    condition.field === 'cliente_qtd_agendamentos' ||
    condition.field === 'agendamento_valor' ||
    condition.field === 'agendamento_valor_pago' ||
    condition.field === 'agendamento_saldo_devedor' ||
    condition.field === 'contagem_mensagens'
  ) {
    condition.valueIsSelect = false;
    condition.valueIsDinheiro = false;
  }
  // Campos de texto simples
  else if (
    condition.field === 'cliente_nome' ||
    condition.field === 'cliente_email' ||
    condition.field === 'cliente_telefone' ||
    condition.field === 'cliente_endereco' ||
    condition.field === 'agendamento_id' ||
    condition.field === 'agendamento_observacoes' ||
    condition.field === 'agendamento_endereco' ||
    condition.field === 'agendamento_servicos'
  ) {
    condition.valueIsSelect = false;
  }
  // Campos de mensagens
  else if (condition.field === 'ultima_mensagem' || condition.field === 'ultima_mensagem_cliente' || condition.field === 'ultima_mensagem_sistema') {
    condition.valueIsSelect = false;
  }
  else {
    condition.valueIsSelect = false;
  }
};


// Funções para carregar dados
const getInfos = async () => {
  try {
    const res = await $api("/disparos/seg/get-infos-users", {
      method: "GET",
    });
    if (res) {
      infos.value = res;
    }
  } catch (error) {
    console.error('Erro ao obter informações:', error);
  }
};

const getTags = async () => {
  try {
    const res = await $api("/clientes/list/tags", {
      method: "GET",
    });
    if (res?.tags && Array.isArray(res.tags)) {
      tags.value = res.tags.map((tag) => ({
        title: tag.name,
        value: tag.id,
      }));
    }
  } catch (error) {
    console.error('Erro ao obter tags:', error);
  }
};


// Carregar dados iniciais
onMounted(async () => {
  await getInfos();
  await getTags();
  
  // Obter variáveis do sistema
  const systemVars = await getAllVariables();
  
  // Adicionar campos específicos de condicionais que não estão nas variáveis do sistema
  const conditionalFields = [
    { title: "Variável", value: "variavel" },
    { title: "Tags", value: "tags" },
    { title: "Origem", value: "origem" },
    { title: "Estado", value: "estado" },
    { title: "Cidade", value: "cidade" },
    { title: "Quantidade de Agendamentos", value: "cliente_qtd_agendamentos" },
    { title: "Valor Total Gasto", value: "cliente_valor_gasto" },
    { title: "Último Agendamento", value: "cliente_ultimo_agendamento" },
  ];
  
  // Combinar variáveis do sistema, do fluxo e campos específicos
  const allFields = [...systemVars, ...props.flowVariables, ...conditionalFields];
  const uniqueFields = allFields.filter((field, index, self) =>
    index === self.findIndex((f) => f.value === field.value)
  );
  
  // Ordenar alfabeticamente
  fieldItens.value = uniqueFields.sort((a, b) => {
    const titleA = a.title || '';
    const titleB = b.title || '';
    return titleA.localeCompare(titleB, "pt-BR", { sensitivity: "base" });
  });
});

// Inicializar config se estiver vazia
if (!props.config.timeoutValue && props.config.timeoutValue !== 0) {
  emit('update:config', {
    ...props.config,
    timeoutValue: 0,
    timeoutType: 'seconds',
    variables: [],
    conditions: []
  });
}

// Migrar formato antigo para novo
if (props.config.timeoutSeconds !== undefined && props.config.timeoutValue === undefined) {
  emit('update:config', {
    ...props.config,
    timeoutValue: props.config.timeoutSeconds,
    timeoutType: 'seconds',
    variables: props.config.variables || [],
    conditions: props.config.conditions || []
  });
}
</script>
