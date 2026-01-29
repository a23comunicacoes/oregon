<template>
  <div>
    <VRow>
      <VCol cols="12">
        <label class="v-label text-body-2 text-high-emphasis mb-2 d-block">
          Mensagem de Aguardo (opcional)
        </label>
        <p class="text-caption text-medium-emphasis mb-2">
          Mensagem enviada ao cliente antes de colocá-lo na fila de atendimento
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
          <div id="toolbar-wait-agent-message">
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

    <VRow>
      <VCol cols="12">
        <label class="v-label text-body-2 text-high-emphasis mb-2 d-block">
          Mensagem de Finalização (opcional)
        </label>
        <p class="text-caption text-medium-emphasis mb-2">
          Quando o atendente enviar esta mensagem, o cliente será automaticamente liberado do bloqueio
        </p>
        
        <!-- Editor Quill para mensagem de finalização -->
        <div class="inputQP">
          <div id="toolbar-finish-message">
            <button class="ql-bold"></button>
            <button class="ql-italic"></button>
            <button class="ql-strike"></button>

            <AppSelect
              v-model="variavelFinish"
              :items="variaveisDisponiveis"
              @update:modelValue="insertVariableFinish"
              item-title="title"
              item-value="value"
              placeholder="Inserir variável"
              class="select-var"
            />
          </div>
          <QuillEditor
            v-model:content="localConfig.finishMessage"
            :options="finishEditorOptions"
            class="inputQP mb-3"
            contentType="html"
            ref="refQuillEditorFinish"
          />
        </div>
        
        <div class="text-caption text-info">
          <VIcon icon="tabler-info-circle" class="me-1" size="small" />
          Quando o atendente enviar exatamente esta mensagem, o sistema detectará e liberará o cliente automaticamente
        </div>
      </VCol>
    </VRow>
    
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
              Envia mensagem opcional ao cliente
            </VListItemTitle>
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-lock" color="warning" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              <strong>Bloqueia</strong> todos os fluxos automáticos para este cliente
            </VListItemTitle>
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-user-check" color="info" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Cliente fica na fila aguardando atendimento humano
            </VListItemTitle>
          </VListItem>
          
          <VListItem>
            <template #prepend>
              <VIcon icon="tabler-shield-check" color="success" size="small" />
            </template>
            <VListItemTitle class="text-sm">
              Evita loops infinitos e múltiplos disparos de fluxos
            </VListItemTitle>
          </VListItem>
        </VList>
      </VCard>
    </div>

    <VAlert type="info" variant="tonal" class="mb-4">
      <template #prepend>
        <VIcon icon="tabler-info-circle" />
      </template>
      <div class="text-sm">
        <strong>Importante:</strong> Enquanto o cliente estiver neste estado, 
        <strong>nenhum fluxo automático</strong> será disparado para ele, mesmo que 
        ele envie mensagens. Para liberar, finalize manualmente o fluxo ou use 
        um comando específico.
      </div>
    </VAlert>

    <VAlert type="warning" variant="tonal">
      <template #prepend>
        <VIcon icon="tabler-alert-triangle" />
      </template>
      <div class="text-sm">
        Este bloco <strong>pausa o fluxo</strong> e aguarda intervenção manual. 
        Certifique-se de ter uma equipe disponível para atender os clientes.
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
      message: ''
    })
  }
});

const emit = defineEmits(['update:config']);

const { setAlert } = useAlert();

const localConfig = ref({
  message: props.config.message || '<p>Aguarde um momento, em breve um de nossos atendentes irá te responder!</p>',
  finishMessage: props.config.finishMessage || '<p>Agradecemos a paciência, qualquer coisa estamos a disposição!</p>',
});

const variaveisDisponiveis = ref([]);
const variavel = ref(null);
const variavelFinish = ref(null);
const refQuillEditor = ref(null);
const refQuillEditorFinish = ref(null);
const viewVariaveisTutorial = ref(false);

// Configurações do editor Quill
const editorOptions = {
  theme: "snow",
  placeholder: "Escreva a mensagem de aguardo...",
  modules: {
    toolbar: "#toolbar-wait-agent-message",
  },
};

const finishEditorOptions = {
  theme: "snow",
  placeholder: "Escreva a mensagem de finalização...",
  modules: {
    toolbar: "#toolbar-finish-message",
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

const insertVariableFinish = () => {
  let value = variavelFinish.value;
  if (!value) return;

  let quill = refQuillEditorFinish.value?.getQuill();
  if (!quill) return;

  insertVariableInline(quill, value);
  variavelFinish.value = null;
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
      message: props.config.message || '<p>Aguarde um momento, em breve um de nossos atendentes irá te responder!</p>',
      finishMessage: props.config.finishMessage || '<p>Agradecemos a paciência, qualquer coisa estamos a disposição!</p>',
    };
  }
});
</script>

