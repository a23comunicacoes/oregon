<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { getAllVariables, copyVariableToClipboard } from '@/utils/dynamicVariables';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

const props = defineProps({
  config: {
    type: Object,
    required: true,
    default: () => ({})
  },
  flowVariables: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:config']);

const { setAlert } = useAlert();

const localConfig = ref({
  actions: props.config.actions || []
});

// Tipos de ações disponíveis para cliente
const actionTypes = [
  { title: 'Atualizar Nome', value: 'update_name' },
  { title: 'Atualizar Email', value: 'update_email' },
  { title: 'Atualizar Telefone Principal', value: 'update_phone' },
  { title: 'Atualizar Telefone Secundário', value: 'update_phone2' },
  { title: 'Atualizar CPF', value: 'update_cpf' },
  { title: 'Atualizar Data de Nascimento', value: 'update_birth_date' },
  { title: 'Atualizar Gênero', value: 'update_gender' },
  { title: 'Atualizar Observações', value: 'update_notes' },
  { title: 'Adicionar Tags', value: 'add_tags' },
  { title: 'Remover Tags', value: 'remove_tags' },
];

const genderOptions = [
  { title: 'Masculino', value: 'masculino' },
  { title: 'Feminino', value: 'feminino' },
  { title: 'Não informado', value: 'nao_informado' }
];

const variaveisDisponiveis = ref([]);
const tags = ref([]);
const showVariablesHelp = ref(false);
const activeVariableMenu = ref(null);
const variableMenuField = ref(null);


// Adicionar nova ação
const addAction = () => {
  localConfig.value.actions.push({
    id: Date.now(),
    type: '',
    value: ''
  });
};

// Remover ação
const removeAction = (index) => {
  localConfig.value.actions.splice(index, 1);
};

// Verificar se ação precisa de campo de tags
const needsTags = (type) => {
  return ['add_tags', 'remove_tags'].includes(type);
};

// Verificar se ação precisa de select de gênero
const needsGenderSelect = (type) => {
  return type === 'update_gender';
};

// Verificar se ação precisa de campo de data
const needsDateField = (type) => {
  return type === 'update_birth_date';
};

// Verificar se ação precisa de textarea
const needsTextarea = (type) => {
  return type === 'update_notes';
};

// Copiar variável
const copyVariable = (value) => {
  copyVariableToClipboard(value, setAlert);
};

// Inserir variável no input
const insertVariableInInput = (action, field, variable) => {
  const currentValue = action[field] || '';
  action[field] = currentValue + `{{${variable}}}`;
  activeVariableMenu.value = null;
};


// Toggle menu de variáveis
const toggleVariableMenu = (actionId, field) => {
  if (activeVariableMenu.value === `${actionId}-${field}`) {
    activeVariableMenu.value = null;
  } else {
    activeVariableMenu.value = `${actionId}-${field}`;
    variableMenuField.value = field;
  }
};

// Carregar tags
const loadTags = async () => {
  try {
    const res = await $api('/clientes/list/tags', { method: 'GET' });
    if (res?.tags) {
      tags.value = res.tags.map(tag => ({
        title: tag.name,
        value: tag.id
      }));
    }
  } catch (error) {
    console.error('Erro ao carregar tags:', error);
  }
};

// Watch para emitir mudanças
watch(localConfig, (newVal) => {
  emit('update:config', { ...newVal });
}, { deep: true });

onMounted(async () => {
  const allVars = await getAllVariables();
  // Combinar variáveis do sistema com variáveis do fluxo
  variaveisDisponiveis.value = [...allVars, ...props.flowVariables] || [];
  
  await loadTags();
  
  // Se já tem config, usar ela
  if (props.config) {
    localConfig.value = {
      actions: props.config.actions || []
    };
  }
});
</script>

<template>
  <VRow>
    <!-- Título e Descrição -->
    <VCol cols="12">
      <VAlert
        color="info"
        variant="tonal"
        icon="tabler-user-edit"
        class="mb-4"
      >
        <VAlertTitle class="mb-1">Atualizar Cliente</VAlertTitle>
        <div class="text-body-2">
          Use este bloco para atualizar informações do cliente no sistema.
          O cliente será obtido automaticamente do contexto do fluxo.
        </div>
      </VAlert>
    </VCol>

    <!-- Lista de Ações -->
    <VCol cols="12">
      <VDivider class="my-4" />
      
      <div class="d-flex align-center justify-space-between mb-3">
        <div>
          <label class="v-label text-body-2 text-high-emphasis d-block">
            Atualizações a Realizar
          </label>
          <p class="text-caption text-medium-emphasis mb-0">
            Adicione as informações que deseja atualizar
          </p>
        </div>
      </div>


      <!-- Ações -->
      <div
        v-for="(action, index) in localConfig.actions"
        :key="action.id"
        class="mb-4"
      >
        <VCard>
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-sm font-weight-medium">Atualização #{{ index + 1 }}</span>
              <VBtn
                icon
                size="x-small"
                color="error"
                variant="text"
                @click="removeAction(index)"
              >
                <VIcon icon="tabler-trash" size="18" />
              </VBtn>
            </div>

            <!-- Tipo de Ação -->
            <AppSelect
              v-model="action.type"
              label="O que deseja atualizar?"
              :items="actionTypes"
              item-title="title"
              item-value="value"
              placeholder="Selecione uma opção"
              class="mb-3"
            />

            <!-- Campo de valor (para campos simples) -->
            <div v-if="action.type && !needsTags(action.type) && !needsGenderSelect(action.type) && !needsDateField(action.type) && !needsTextarea(action.type)">
              <AppTextField
                v-model="action.value"
                :label="getFieldLabel(action.type)"
                :placeholder="getFieldPlaceholder(action.type)"
                :hint="getFieldHint(action.type)"
                persistent-hint
              >
                <template #append-inner>
                  <VMenu
                    :model-value="activeVariableMenu === `${action.id}-value`"
                    @update:model-value="(val) => !val && (activeVariableMenu = null)"
                    location="bottom"
                    :close-on-content-click="false"
                  >
                    <template #activator="{ props: menuProps }">
                      <VBtn
                        icon
                        size="x-small"
                        variant="text"
                        v-bind="menuProps"
                        @click="toggleVariableMenu(action.id, 'value')"
                      >
                        <VIcon icon="tabler-braces" size="20" color="primary" />
                      </VBtn>
                    </template>
                    
                    <VCard max-width="300" max-height="400" class="overflow-auto">
                      <VCardText>
                        <div class="text-caption mb-2 font-weight-bold">Variáveis Disponíveis</div>
                        <div class="d-flex flex-column gap-1">
                          <VChip
                            v-for="variable in variaveisDisponiveis"
                            :key="variable.value"
                            size="small"
                            :color="variable.type === 'dinamica' ? 'success' : variable.type === 'sistema' ? 'info' : 'primary'"
                            variant="tonal"
                            class="cursor-pointer"
                            @click="insertVariableInInput(action, 'value', variable.value)"
                          >
                            <VIcon icon="tabler-plus" size="small" class="me-1" />
                            {{ variable.title }}
                          </VChip>
                        </div>
                      </VCardText>
                    </VCard>
                  </VMenu>
                </template>
              </AppTextField>
            </div>

            <!-- Select de Gênero -->
            <div v-if="needsGenderSelect(action.type)">
              <AppSelect
                v-model="action.value"
                label="Gênero"
                :items="genderOptions"
                item-title="title"
                item-value="value"
                placeholder="Selecione o gênero"
              />
            </div>

            <!-- Campo de Data -->
            <div v-if="needsDateField(action.type)">
              <AppTextField
                v-model="action.value"
                label="Data de Nascimento"
                type="date"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <!-- Campo de Textarea -->
            <div v-if="needsTextarea(action.type)">
              <AppTextarea
                v-model="action.value"
                label="Observações"
                placeholder="Observações sobre o cliente..."
                rows="3"
              >
                <template #append-inner>
                  <VMenu
                    :model-value="activeVariableMenu === `${action.id}-value`"
                    @update:model-value="(val) => !val && (activeVariableMenu = null)"
                    location="bottom"
                    :close-on-content-click="false"
                  >
                    <template #activator="{ props: menuProps }">
                      <VBtn
                        icon
                        size="x-small"
                        variant="text"
                        v-bind="menuProps"
                        @click="toggleVariableMenu(action.id, 'value')"
                      >
                        <VIcon icon="tabler-braces" size="20" color="primary" />
                      </VBtn>
                    </template>
                    
                    <VCard max-width="300" max-height="400" class="overflow-auto">
                      <VCardText>
                        <div class="text-caption mb-2 font-weight-bold">Variáveis Disponíveis</div>
                        <div class="d-flex flex-column gap-1">
                          <VChip
                            v-for="variable in variaveisDisponiveis"
                            :key="variable.value"
                            size="small"
                            :color="variable.type === 'dinamica' ? 'success' : variable.type === 'sistema' ? 'info' : 'primary'"
                            variant="tonal"
                            class="cursor-pointer"
                            @click="insertVariableInInput(action, 'value', variable.value)"
                          >
                            <VIcon icon="tabler-plus" size="small" class="me-1" />
                            {{ variable.title }}
                          </VChip>
                        </div>
                      </VCardText>
                    </VCard>
                  </VMenu>
                </template>
              </AppTextarea>
            </div>

            <!-- Campo de Tags -->
            <div v-if="needsTags(action.type)">
              <AppSelect
                v-model="action.value"
                :items="tags"
                label="Tags"
                multiple
                chips
                closable-chips
                placeholder="Selecione as tags"
              />
            </div>

          </VCardText>
        </VCard>
      </div>

      <VBtn
        size="small"
        color="primary"
        variant="tonal"
        prepend-icon="tabler-plus"
        @click="addAction"
        block
      >
        Adicionar Atualização
      </VBtn>
    </VCol>

    <!-- Variáveis Disponíveis -->
    <VCol cols="12">
      <VDivider class="my-4" />
      
      <div class="d-flex align-center justify-space-between mb-3">
        <div>
          <label class="v-label text-body-2 text-high-emphasis d-block">
            Variáveis Disponíveis
          </label>
          <p class="text-caption text-medium-emphasis mb-0">
            Clique em uma variável para copiá-la
          </p>
        </div>
        <VBtn
          size="small"
          color="info"
          variant="text"
          prepend-icon="tabler-chevron-down"
          @click="showVariablesHelp = !showVariablesHelp"
        >
          {{ showVariablesHelp ? 'Ocultar' : 'Exibir' }}
        </VBtn>
      </div>

      <VExpandTransition>
        <div v-show="showVariablesHelp">
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
            <span class="text-primary">Primário</span> = Cliente/Pedido
          </div>
        </div>
      </VExpandTransition>
    </VCol>

    <!-- Informações Importantes -->
    <VCol cols="12">
      <VDivider class="my-4" />
      
      <VExpansionPanels>
        <VExpansionPanel>
          <VExpansionPanelTitle>
            <div class="d-flex align-center gap-2">
              <VIcon icon="tabler-info-circle" size="20" color="info" />
              <span class="text-sm">Informações Importantes</span>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <VAlert color="info" variant="tonal" class="mb-3">
              <div class="text-body-2">
                <p class="mb-2">
                  <strong>✅ O que este bloco faz:</strong>
                </p>
                <ul class="mb-2">
                  <li>Atualiza informações do cadastro do cliente no sistema</li>
                  <li>Pode atualizar múltiplos campos em uma única ação</li>
                  <li>Suporta variáveis dinâmicas do fluxo</li>
                  <li>Permite adicionar/remover tags</li>
                  <li>Atualiza telefone, email, CPF, data de nascimento, etc.</li>
                </ul>
                
                <p class="mb-2">
                  <strong>⚠️ Importante:</strong>
                </p>
                <ul class="mb-2">
                  <li>O cliente é obtido automaticamente do contexto do fluxo</li>
                  <li>Campos vazios não serão atualizados</li>
                  <li>Você pode atualizar apenas os campos desejados</li>
                  <li>Suporta variáveis dinâmicas do fluxo</li>
                </ul>

                <p class="mb-2">
                  <strong>📝 Exemplos de uso:</strong>
                </p>
                <ul class="mb-0">
                  <li><strong>Atualizar telefone:</strong> Capturar novo telefone em "Aguardar Resposta" e atualizar aqui</li>
                  <li><strong>Atualizar observações:</strong> Adicionar notas sobre o cliente durante o fluxo</li>
                  <li><strong>Adicionar tags:</strong> Marcar cliente como "VIP" ou "Interessado em promoções"</li>
                  <li><strong>Atualizar data de nascimento:</strong> Capturar e registrar aniversário</li>
                </ul>
              </div>
            </VAlert>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCol>

    <!-- Variáveis Disponíveis -->
    <VCol cols="12">
      <VDivider class="my-4" />
      
      <div class="mb-4">
        <h6 class="text-h6 mb-2">Variáveis Disponíveis</h6>
        <p class="text-caption text-medium-emphasis mb-4">
          Clique em uma variável para copiá-la e usá-la nos valores dos campos
        </p>
        
        <div class="d-flex flex-wrap gap-2">
          <VChip
            v-for="variable in variaveisDisponiveis"
            :key="variable.value"
            size="small"
            :color="variable.type === 'dinamica' ? 'success' : variable.type === 'sistema' ? 'info' : variable.type === 'cliente' ? 'primary' : 'secondary'"
            variant="tonal"
            class="cursor-pointer"
            @click="copyVariableToClipboard(variable.value)"
          >
            <VIcon icon="tabler-copy" size="small" class="me-1" />
            {{ variable.title }}
          </VChip>
        </div>
        
        <div class="text-caption mt-2">
          <VIcon icon="tabler-info-circle" class="me-1" size="small" />
          <span class="text-success">Verde</span> = Dinâmicas (capturadas no fluxo) | 
          <span class="text-info">Azul</span> = Sistema | 
          <span class="text-primary">Primário</span> = Cliente
        </div>
      </div>
    </VCol>

    <!-- Como Funciona -->
    <VCol cols="12">
      <VDivider class="my-4" />
      
      <div class="mb-4">
        <h6 class="text-h6 mb-2">Como funciona</h6>
        <VCard variant="outlined" class="pa-4">
          <VList density="compact">
            <VListItem>
              <template #prepend>
                <VIcon icon="tabler-user" color="primary" size="small" />
              </template>
              <VListItemTitle class="text-sm">
                Obtém o cliente automaticamente do contexto do fluxo
              </VListItemTitle>
            </VListItem>
            
            <VListItem>
              <template #prepend>
                <VIcon icon="tabler-refresh" color="info" size="small" />
              </template>
              <VListItemTitle class="text-sm">
                Processa cada ação configurada (nome, email, endereço, etc)
              </VListItemTitle>
            </VListItem>
            
            <VListItem>
              <template #prepend>
                <VIcon icon="tabler-cloud-upload" color="success" size="small" />
              </template>
              <VListItemTitle class="text-sm">
                Envia as atualizações para o banco de dados do sistema
              </VListItemTitle>
            </VListItem>
            
            <VListItem>
              <template #prepend>
                <VIcon icon="tabler-check" color="success" size="small" />
              </template>
              <VListItemTitle class="text-sm">
                Registra a operação nos logs do sistema
              </VListItemTitle>
            </VListItem>
          </VList>
        </VCard>
      </div>
    </VCol>

    <VCol cols="12">
      <VAlert type="info" variant="tonal" class="mb-0">
        <template #prepend>
          <VIcon icon="tabler-info-circle" />
        </template>
        <div class="text-sm">
          <strong>Importante:</strong> As variáveis dinâmicas (em verde) são capturadas por blocos anteriores no fluxo.
          Use <code v-pre>{{nome_variavel}}</code> para inserir valores dinâmicos.
        </div>
      </VAlert>
    </VCol>
  </VRow>
</template>

<script>
export default {
  name: 'UpdateClienteBlock',
  methods: {
    getFieldLabel(type) {
      const labels = {
        'update_name': 'Nome Completo',
        'update_email': 'Email',
        'update_phone': 'Telefone',
        'update_cpf': 'CPF/CNPJ'
      };
      return labels[type] || 'Valor';
    },
    
    getFieldPlaceholder(type) {
      const placeholders = {
        'update_name': 'João Silva ou {{nome_completo}}',
        'update_email': 'cliente@email.com ou {{email}}',
        'update_phone': '(11) 99999-9999 ou {{telefone}}',
        'update_cpf': '123.456.789-00 ou {{cpf}}'
      };
      return placeholders[type] || '';
    },
    
    getFieldHint(type) {
      const hints = {
        'update_name': 'Nome completo do cliente',
        'update_email': 'Email válido do cliente',
        'update_phone': 'Telefone com DDD',
        'update_cpf': 'CPF ou CNPJ do cliente'
      };
      return hints[type] || '';
    }
  }
};
</script>

<style scoped>
code {
  background-color: rgba(var(--v-theme-primary), 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}

.cursor-pointer {
  cursor: pointer;
}

.inputQP {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
}

.select-var {
  width: 200px;
  display: inline-block;
}

:deep(.ql-toolbar) {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
}

:deep(.ql-container) {
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  min-height: 120px;
}
</style>
