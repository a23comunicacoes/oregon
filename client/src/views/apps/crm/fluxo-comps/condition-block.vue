<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h6 class="text-h6 mb-0">Condições</h6>
        <p class="text-caption mb-0 text-medium-emphasis">
          Configure as condições para direcionar o fluxo
        </p>
      </div>
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

    <VRow>
      <VCol cols="12">
        <div
          v-for="(condition, index) in config.conditions"
          :key="condition.id"
          class="v-row align-items-center mb-4"
        >
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
              :items="[
                { title: 'E', value: 'and' },
                { title: 'OU', value: 'or' },
              ]"
              label="Lógica"
              required
              placeholder="E/OU"
              v-if="config.conditions.length > 1 && index < config.conditions.length - 1"
            />
            <IconBtn @click="removeCondition(index)" variant="tonal" color="error">
              <VIcon icon="tabler-trash" />
            </IconBtn>
          </VCol>
          
          <VCol
            cols="12"
            class="pa-0 d-flex flex-row align-center justify-center"
          >
            <VDivider />
            <span class="text-caption mx-2">{{
              index === config.conditions.length - 1
                ? "-"
                : condition.logicalOperator === "or"
                ? "OU"
                : "&"
            }}</span>
            <VDivider />
          </VCol>
        </div>
      </VCol>
    </VRow>

    <VDivider class="my-4" />
    
    <div class="text-caption text-medium-emphasis">
      <VIcon icon="tabler-info-circle" class="me-1" />
      Se todas as condições forem verdadeiras, o fluxo seguirá para "SIM", caso contrário seguirá para "NÃO".
    </div>
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
</template>

<script setup>
import { ref, onMounted } from 'vue';
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

const fieldItens = ref([]);
const infos = ref([]);
const tags = ref([]);
const funis = ref([]);
const fontesClientes = ref([]);
const searchQuery = ref('');

const operatorItens = [
  { title: "Igual a", value: "eq" },
  { title: "Diferente de", value: "neq" },
  { title: "Contém", value: "contains" },
  { title: "Não contém", value: "not_contains" },
  { title: "Maior que", value: "gt" },
  { title: "Maior ou igual a", value: "gte" },
  { title: "Menor que", value: "lt" },
  { title: "Menor ou igual a", value: "lte" },
  { title: "Está vazio", value: "empty" },
  { title: "Não está vazio", value: "not_empty" },
  { title: "Regex", value: "regex" }
];

const addCondition = () => {
  const newCondition = {
    id: new Date().getTime(),
    field: null,
    operator: null,
    logicalOperator: null,
    value: null,
    valueIsSelect: false,
    valueIsDinheiro: false,
    itensValueSelect: [],
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
  const index = props.config.conditions.findIndex((c) => c.id === condition.id);
  if (index === -1) return;

  const newConditions = [...props.config.conditions];
  
  // Limpar campos dependentes
  newConditions[index].value = null;
  newConditions[index].valueIsSelect = false;
  newConditions[index].valueIsDinheiro = false;

  if (newConditions[index].field === "variavel") {
    newConditions[index].valueIsSelect = true;
    newConditions[index].itensValueSelect = await getAllVariables();
  }
  // Campos de gênero
  else if (newConditions[index].field === "cliente_genero" || newConditions[index].field === "genero") {
    newConditions[index].valueIsSelect = true;
    newConditions[index].itensValueSelect = [
      { title: "Masculino", value: "masculino" },
      { title: "Feminino", value: "feminino" },
      { title: "Não informado", value: "nao_informado" },
    ];
  }
  // Campos de localização
  else if (newConditions[index].field === "estado" || newConditions[index].field === "cliente_estado") {
    newConditions[index].valueIsSelect = true;
    newConditions[index].itensValueSelect = infos.value.estados || [];
  } else if (newConditions[index].field === "cidade" || newConditions[index].field === "cliente_cidade") {
    newConditions[index].valueIsSelect = true;
    newConditions[index].itensValueSelect = infos.value.cidades || [];
  }
  // Campos de origem
  else if (newConditions[index].field === "origem") {
    newConditions[index].valueIsSelect = true;
    newConditions[index].itensValueSelect = infos.value.origens || [];
  }
  // Campos monetários
  else if (newConditions[index].field === "cliente_valor_gasto" || newConditions[index].field === "agendamento_valor" || newConditions[index].field === "agendamento_valor_pago" || newConditions[index].field === "agendamento_saldo_devedor") {
    newConditions[index].valueIsDinheiro = true;
  }
  // Campos de data
  else if (newConditions[index].field === "cliente_data_cadastro" || newConditions[index].field === "cliente_ultimo_agendamento" || newConditions[index].field === "agendamento_data" || newConditions[index].field === "agendamento_data_fim") {
    newConditions[index].valueIsSelect = false;
  }
  // Campos de tags
  else if (newConditions[index].field === "tags") {
    newConditions[index].valueIsSelect = true;
    newConditions[index].itensValueSelect = tags.value;
  }
  // Campos de status de agendamento
  else if (newConditions[index].field === "agendamento_status") {
    newConditions[index].valueIsSelect = true;
    // Status de agendamento do sistema
    newConditions[index].itensValueSelect = [
      { title: "Agendado", value: "1" },
      { title: "Confirmado", value: "2" },
      { title: "Atendido", value: "3" },
      { title: "Cancelado", value: "6" },
      { title: "Remarcado", value: "7" }
    ];
  }
  // Campos de tipo de agendamento
  else if (newConditions[index].field === "agendamento_tipo") {
    newConditions[index].valueIsSelect = true;
    newConditions[index].itensValueSelect = [
      { title: "Normal", value: "normal" },
      { title: "Bloqueio", value: "bloqueio" }
    ];
  }
  // Campos de comparação numérica
  else if (
    newConditions[index].field === "cliente_valor_gasto" ||
    newConditions[index].field === "cliente_qtd_agendamentos" ||
    newConditions[index].field === "agendamento_valor" ||
    newConditions[index].field === "agendamento_valor_pago" ||
    newConditions[index].field === "agendamento_saldo_devedor" ||
    newConditions[index].field === "contagem_mensagens"
  ) {
    newConditions[index].valueIsSelect = false;
    newConditions[index].valueIsDinheiro = false;
  }
  // Campos de texto simples
  else if (
    newConditions[index].field === "cliente_nome" ||
    newConditions[index].field === "cliente_email" ||
    newConditions[index].field === "cliente_telefone" ||
    newConditions[index].field === "cliente_endereco" ||
    newConditions[index].field === "agendamento_id" ||
    newConditions[index].field === "agendamento_observacoes" ||
    newConditions[index].field === "agendamento_endereco" ||
    newConditions[index].field === "agendamento_servicos"
  ) {
    newConditions[index].valueIsSelect = false;
  }
  // Campos de mensagens
  else if (newConditions[index].field === "ultima_mensagem" || newConditions[index].field === "ultima_mensagem_cliente" || newConditions[index].field === "ultima_mensagem_sistema") {
    newConditions[index].valueIsSelect = false;
  }
  else {
    newConditions[index].valueIsSelect = false;
  }

  emit('update:config', {
    ...props.config,
    conditions: newConditions
  });
};

const getInfos = async () => {
  try {
    const res = await $api("/disparos/seg/get-infos-users", {
      method: "GET",
    });
    if (res) {
      infos.value = res;
    }
  } catch (error) {
    console.error("Erro ao buscar infos:", error);
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
    console.error("Error tags", error);
  }
};


// Função para copiar variável
const copyVariable = (variableValue) => {
  copyVariableToClipboard(variableValue, setAlert);
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
if (!props.config.conditions || props.config.conditions.length === 0) {
  emit('update:config', {
    ...props.config,
    conditions: []
  });
}
</script>
