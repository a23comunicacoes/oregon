<template>
  <div>
    <VRow>
      <VCol cols="12">
        <VAlert type="warning" variant="tonal" class="mb-4">
          <template #prepend>
            <VIcon icon="tabler-shield-lock" />
          </template>
          <div class="text-sm">
            <strong>Atenção:</strong> Este bloco irá <strong>bloquear permanentemente</strong> 
            o cliente de receber TODOS os fluxos automáticos, até que seja desbloqueado manualmente.
          </div>
        </VAlert>
      </VCol>

      <VCol cols="12">
        <label class="v-label text-body-2 text-high-emphasis mb-2 d-block">
          Ação
        </label>
        <AppSelect
          v-model="localConfig.action"
          :items="[
            { title: '🔒 Bloquear Fluxos', value: 'block' },
            { title: '🔓 Desbloquear Fluxos', value: 'unblock' }
          ]"
          label="Selecione a ação"
          placeholder="Escolha bloquear ou desbloquear"
        />
      </VCol>

      <VCol cols="12">
        <label class="v-label text-body-2 text-high-emphasis mb-2 d-block">
          Mensagem de Confirmação (opcional)
        </label>
        <p class="text-caption text-medium-emphasis mb-2">
          Mensagem enviada ao cliente após {{ localConfig.action === 'block' ? 'bloquear' : 'desbloquear' }} os fluxos
        </p>
        
        <!-- Variáveis disponíveis -->
        <div class="mb-3">
          <a @click="toggleVariaveisTutorial" class="cursor-pointer text-primary">
            Ver variáveis disponíveis
            <VIcon
              :icon="viewVariaveisTutorial ? 'tabler-chevron-up' : 'tabler-chevron-down'"
              size="small"
            />
          </a>

          <v-fade-transition>
            <div v-if="viewVariaveisTutorial" class="mt-3">
              <VCard variant="outlined" class="pa-3">
                <p class="text-caption mb-3">
                  Clique em uma variável para copiá-la. Use dentro do texto com
                  duplas chaves. Ex.:
                  <span class="font-weight-bold" v-pre>{{ cliente_nome }}</span>
                </p>

                <div class="d-flex flex-wrap gap-2">
                  <VChip
                    v-for="variable in variaveisDisponiveis"
                    :key="variable.value"
                    size="small"
                    :color="
                      variable.type === 'cliente'
                        ? 'primary'
                        : variable.type === 'pedido'
                        ? 'info'
                        : 'success'
                    "
                    variant="tonal"
                    class="cursor-pointer"
                    @click="copyVariable(variable.value)"
                  >
                    <VIcon icon="tabler-copy" size="small" class="me-1" />
                    {{ variable.title }}
                  </VChip>
                </div>
              </VCard>
            </div>
          </v-fade-transition>
        </div>
        
        <!-- Editor Quill -->
        <div class="inputQP">
          <div id="toolbar-block-flows-message">
            <button class="ql-bold"></button>
            <button class="ql-italic"></button>
            <button class="ql-strike"></button>

            <AppSelect
              v-model="variavel"
              :items="variaveisDisponiveis"
              @update:modelValue="insertVariable"
              item-title="title"
              item-value="value"
              placeholder="Inserir variável"
              class="select-var"
            />
          </div>
          <QuillEditor
            v-model:content="localConfig.message"
            :options="editorOptions"
            class="inputQP mb-3"
            contentType="html"
            ref="refQuillEditor"
          />
        </div>
      </VCol>
    </VRow>
    
    <VDivider class="my-4" />
    
    <div class="mb-4">
      <h6 class="text-h6 mb-2">Como funciona</h6>
      <VCard variant="outlined" class="pa-4">
        <VList density="compact">
          <VListItem v-if="localConfig.action === 'block'">
            <template #prepend>
              <VIcon icon="tabler-lock" color="error" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              <strong>Bloqueia PERMANENTEMENTE</strong> todos os fluxos para este cliente
            </VListItemTitle>
          </VListItem>
          
          <VListItem v-else>
            <template #prepend>
              <VIcon icon="tabler-lock-open" color="success" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              <strong>Desbloqueia</strong> e permite que o cliente receba fluxos novamente
            </VListItemTitle>
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-message-circle" color="primary" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Envia mensagem opcional ao cliente (se configurada)
            </VListItemTitle>
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-database" color="info" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Atualiza o campo <code>flows_blocked</code> no banco de dados
            </VListItemTitle>
          </VListItem>
        </VList>
      </VCard>
    </div>

    <VAlert :type="localConfig.action === 'block' ? 'error' : 'success'" variant="tonal">
      <template #prepend>
        <VIcon :icon="localConfig.action === 'block' ? 'tabler-shield-lock' : 'tabler-shield-check'" />
      </template>
      <div class="text-sm">
        <template v-if="localConfig.action === 'block'">
          <strong>Bloqueio Permanente:</strong> Diferente do "Aguardar Atendimento", 
          este bloqueio é permanente e só pode ser removido manualmente através do 
          painel de clientes ou de outro fluxo com ação de desbloqueio.
        </template>
        <template v-else>
          <strong>Desbloqueio:</strong> O cliente voltará a receber todos os fluxos 
          automáticos normalmente após a execução deste bloco.
        </template>
      </div>
    </VAlert>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import { getAllVariables } from '@/utils/dynamicVariables.js';

const props = defineProps({
  config: {
    type: Object,
    required: true,
    default: () => ({
      action: 'block',
      message: ''
    })
  }
});

const emit = defineEmits(['update:config']);

const { setAlert } = useAlert();

const localConfig = ref({
  action: props.config.action || 'block',
  message: props.config.message || '',
});

const variaveisDisponiveis = ref([]);
const variavel = ref(null);
const refQuillEditor = ref(null);
const viewVariaveisTutorial = ref(false);

// Configurações do editor Quill
const editorOptions = {
  theme: "snow",
  placeholder: "Escreva a mensagem de confirmação...",
  modules: {
    toolbar: "#toolbar-block-flows-message",
  },
};

// Função para inserir variável no editor
const insertVariableInline = (quill, value) => {
  if (!value) return;

  quill.focus();
  let range = quill.getSelection(true);

  const insertAt = range ? range.index : Math.max(0, quill.getLength() - 1);
  const token = `{{${value}}}`;

  if (range && range.length > 0) {
    quill.deleteText(insertAt, range.length, "user");
  }

  quill.insertText(insertAt, token, "user");
  quill.setSelection(insertAt + token.length, 0, "silent");
};

const insertVariable = () => {
  let value = variavel.value;
  if (!value) return;

  let quill = refQuillEditor.value?.getQuill();
  if (!quill) return;

  insertVariableInline(quill, value);
  variavel.value = null;
};

// Função para copiar variável
const copyVariable = (variableValue) => {
  const variableText = `{{${variableValue}}}`;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(variableText).then(() => {
      setAlert(`Variável ${variableText} copiada!`, 'success', 'tabler-copy', 2000);
    }).catch(() => {
      fallbackCopyToClipboard(variableText);
    });
  } else {
    fallbackCopyToClipboard(variableText);
  }
};

const fallbackCopyToClipboard = (text) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    setAlert(`Variável ${text} copiada!`, 'success', 'tabler-copy', 2000);
  } catch (err) {
    setAlert('Erro ao copiar variável', 'error', 'tabler-alert-circle', 2000);
  }
  
  document.body.removeChild(textArea);
};

const toggleVariaveisTutorial = () => {
  viewVariaveisTutorial.value = !viewVariaveisTutorial.value;
};

// Emitir atualização
const emitUpdate = () => {
  emit('update:config', {
    ...localConfig.value,
  });
};

// Watch para mudanças no localConfig
watch(
  localConfig,
  () => {
    emitUpdate();
  },
  { deep: true }
);

onMounted(async () => {
  // Carregar todas as variáveis disponíveis
  const allVars = await getAllVariables();
  variaveisDisponiveis.value = allVars || [];
  
  // Se já tem config, usar ela
  if (props.config) {
    localConfig.value = {
      action: props.config.action || 'block',
      message: props.config.message || '',
    };
  }
});
</script>

