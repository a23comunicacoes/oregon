<script setup>
  import { watch } from "vue";
  import { PerfectScrollbar } from "vue3-perfect-scrollbar";
  import { QuillEditor } from "@vueup/vue-quill";
  import "@vueup/vue-quill/dist/vue-quill.snow.css";
  import moment from "moment";
  import PreviewZap from "./previews/preview-zap.vue";

  // chame isso passando a instância `quill` e o valor da variável
  function insertVariableInline(quill, value) {
    if (!value) return;

    // garante foco e seleção atual
    quill.focus();
    let range = quill.getSelection(true);

    // se não tiver seleção, insere no fim (antes do \n terminal)
    const insertAt = range ? range.index : Math.max(0, quill.getLength() - 1);

    const token = `{{${value}}}`;

    // se há texto selecionado, substitui; senão apenas insere
    if (range && range.length > 0) {
      quill.deleteText(insertAt, range.length, "user");
    }

    quill.insertText(insertAt, token, "user");

    // posiciona o caret após o token
    quill.setSelection(insertAt + token.length, 0, "silent");
  }

  const { setAlert } = useAlert();
  const userData = useCookie("userData").value;

  const loading = ref(false);
  const isNewModelo = ref(true);

  const props = defineProps({
    isDrawerOpen: {
      type: Boolean,
      required: true,
    },
    modeloData: Object,
    flowVariables: {
      type: Array,
      default: () => []
    }
  });

  const emit = defineEmits(["update:isDrawerOpen", "updateModelo"]);

  const modelo = ref({
    id: null,
    name: "",
    content: "",
    midia: null,
    created_at: null,
    viewInputFile: true,
  });

  const limparModelo = () => {
    modelo.value = {
      id: null,
      name: "",
      content: "",
      created_at: null,
    };
    isNewModelo.value = true;
    clienteSelected.value = null;
    messagePreview.value = "";
    statePreview.value = "";
    searchQuery.value = "";
    loading.value = false;
  };

  const closeNavigationDrawer = () => {
    emit("update:isDrawerOpen", false);
    limparModelo();
  };

  const handleDrawerModelValueUpdate = (val) => {
    if (!val) {
      return limparModelo();
    }
    emit("update:isDrawerOpen", val);
  };

  const clientes = ref([]);
  const searchQuery = ref("");
  const messagePreview = ref("");
  const clienteSelected = ref(null);
  const agendamentoSelected = ref(null);
  const statePreview = ref("");

  const getClientes = async () => {
    loading.value = true;

    try {
      const res = await $api("/clientes/list", {
        method: "GET",
        query: {
          q: searchQuery.value,
          itemsPerPage: 20,
          page: 1,
        },
      });

      console.log("res clientes", res);

      clientes.value = res.clientes;

      if (clientes.value?.length > 0 && !clienteSelected.value) {
        if (clientes.value?.length == 1) {
          clienteSelected.value = clientes.value[0];
        } else {
          let primeiroClienteComAgendamento = clientes.value.find(
            (c) => c.agendamentos?.length > 0
          );
          if (primeiroClienteComAgendamento) {
            clienteSelected.value = primeiroClienteComAgendamento;
          } else {
            clienteSelected.value = clientes.value[0];
          }
        }

        console.log("clienteSelected", clienteSelected.value);
        getAgendamentoCliente(clienteSelected.value?.cli_Id);
        handlePreview(modelo.value.content ?? "");
      }
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
    }

    loading.value = false;
  };

  const getAgendamentoCliente = async (id) => {
    console.log("getAgendamentoCliente", id);

    agendamentoSelected.value = null;

    if (!id) return;

    let index = clientes.value.findIndex((c) => c.cli_Id === id);
    if (index < 0 || !clientes.value[index]?.agendamentos?.length) return;

    try {
      const res = await $api(`/clientes/getAgendamentos/${id}`);

      console.log("res agendamentos cliente", res);

      clientes.value[index].agendamentos = res.agendamentos || [];

      if (res.agendamentos?.length > 0) {
        agendamentoSelected.value = res.agendamentos[0];
        handlePreview(modelo.value.content ?? "");
      }
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
    }
  };

  getClientes();

  const editorOptions = {
    theme: "snow",
    placeholder:
      "Escreva o conteúdo da mensagem que será enviada na campanha...",
    modules: {
      toolbar: "#toolbar",
    },
  };

  const handleMidiaControl = () => {
    modelo.value.midiaAlterada = true;
  };

  const removeMidia = () => {
    modelo.value.midia = null;
    modelo.value.midiaAlterada = true;
    modelo.value.viewInputFile = true;
  };

  const variavel = ref(null);
  const refQuillEditor = ref(null);
  const viewVariaveisTutorial = ref(false);
  const variaveisItens = ref([]);

  const getVariaveis = async () => {
    loading.value = true;

    try {
      const res = await $api("/disparos/variaveis", {
        method: "GET",
      });

      if (!res) return;

      console.log("variaveis ress", res);

      // Combinar variáveis da API com variáveis do fluxo
      const allVariables = [...res, ...props.flowVariables];
      variaveisItens.value = allVariables;
    } catch (error) {
      console.error("Error fetching user data", error, error.response);

      // Se houver erro na API, usar apenas variáveis do fluxo
      variaveisItens.value = props.flowVariables;
    }
    loading.value = false;
  };

  getVariaveis();

  const handleViewVariaveisTutorial = () => {
    viewVariaveisTutorial.value = !viewVariaveisTutorial.value;
  };

  const insertVariable = () => {
    let value = variavel.value;
    if (!value) return;

    let quill = refQuillEditor.value?.getQuill();
    if (!quill) return;

    insertVariableInline(quill, value);
    variavel.value = null;
  };

  const copyVariableToClipboard = (variableValue) => {
    const variableText = `{{${variableValue}}}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(variableText).then(() => {
        setAlert(`Variável ${variableText} copiada!`, 'success', 'tabler-copy', 2000);
      }).catch(() => {
        // Fallback para navegadores mais antigos
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

  const formatConteudo = async (conteudo) => {
    loading.value = true;
    try {
      let agendamento = agendamentoSelected.value ?? null;

      if (agendamento?.funcionario) {
        let profissional = Array.isArray(agendamento.funcionario)
          ? agendamento.funcionario.length > 0
            ? agendamento.funcionario[0]
            : {}
          : agendamento.funcionario;

        agendamento.profissional =
          profissional.fullName || profissional.nome || "";
      }

      const res = await $api("/disparos/format-content", {
        method: "POST",
        body: {
          content: conteudo,
          agendamento: agendamentoSelected.value ?? null,
          cliente: clienteSelected.value ?? null,
          limparHtml: false,
        },
      });

      if (!res) return;

      //console.log("format conteudo ress", res);

      let resp = res.formattedContent;

      if (resp && typeof resp != "string") {
        return conteudo;
      }

      loading.value = false;
      return resp;
    } catch (error) {
      console.error("Error fetching content", error, error.response);
      loading.value = false;
      return conteudo;
    }
  };

  const handlePreview = async (message = null) => {
    if (!message) {
      message = statePreview.value;
    }

    if (!clienteSelected.value) {
      statePreview.value = message;
      messagePreview.value = message;
      return;
    }

    statePreview.value = message;
    messagePreview.value = await formatConteudo(message);
  };

  const loadingSave = ref(false);

  const saveModelo = async () => {
    if (!modelo.value.name) {
      setAlert(
        "Informe o nome do modelo",
        "error",
        "tabler-alert-circle",
        3000
      );
      return;
    }

    if (!modelo.value.content) {
      setAlert(
        "Informe o conteúdo do modelo",
        "error",
        "tabler-alert-circle",
        3000
      );
      return;
    }

    loadingSave.value = true;

    if (modelo.value.midia && modelo.value.midiaAlterada) {
      let midia = await uploadFile(modelo.value.midia);

      if (midia) {
        modelo.value.viewInputFile = false;
        modelo.value.midia = midia;
      }
    }

    console.log("modelo save", modelo.value);

    try {
      const res = await $api("/templates", {
        method: isNewModelo.value ? "POST" : "PUT",
        body: {
          ...modelo.value,
          type: 'mensagem',
        }
      });

      if (!res) return;

      console.log("modelo ress", res);

      setAlert(
        isNewModelo.value
          ? "Modelo cadastrado com sucesso!"
          : "Modelo editado com sucesso!",
        "success",
        "tabler-alert-circle",
        3000
      );

      emit("updateModelo", res);
      closeNavigationDrawer();
    } catch (error) {
      console.error("Error saving modelo data", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao salvar o modelo. Tente novamente.",
        "error",
        "tabler-alert-circle",
        3000
      );
    }
    loadingSave.value = false;
  };

  const uploadFile = async (file) => {
    if (!file) return;

    console.log("file to upload:", file[0]);

    const formData = new FormData();
    formData.append("file", file[0]);

    try {
      const res = await $api("/templates/save-file", {
        method: "POST",
        body: formData,
      });

      if (!res) return;

      console.log("file uploaded:", res);

      return res;
    } catch (error) {
      console.error("Erro ao fazer upload do arquivo:", error, error.response);

      return null;
    }
  };

  if (props.modeloData) {
    console.log("props.modeloData", props.modeloData);
    modelo.value = props.modeloData;

    isNewModelo.value = !modelo.value.id;
    console.log(
      "midia",
      isNewModelo.value ? true : modelo.value.midia ? false : true
    );
    modelo.value.viewInputFile = isNewModelo.value
      ? true
      : modelo.value.midia
      ? false
      : true;
  }

  watch(
    () => props.modeloData,
    (newValue) => {
      if (newValue) {
        console.log("props.modeloData", newValue);

        modelo.value = newValue;
        isNewModelo.value = !modelo.value.id;
        modelo.value.viewInputFile = isNewModelo.value
          ? true
          : modelo.value.midia
          ? false
          : true;

        /*  console.log(
      "midia",
      isNewModelo.value ? true : modelo.value.midia ? false : true
    ); */

        console.log(`midia: ${isNewModelo.value ? "é novo" : "não é novo"}
    ${modelo.value.midia ? "tem midia" : "não tem midia"}
    `);
        getVariaveis();
        handlePreview(modelo?.value?.content ?? "");
      }
    },
    { immediate: true }
  );
</script>

<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText class="pt-0">
          <!-- 👉 Title -->
          <AppDrawerHeaderSection
            :title="isNewModelo ? 'Cadastrar Modelo' : 'Editar Modelo'"
            @cancel="closeNavigationDrawer"
          />

          <VRow>
            <VCol cols="12" md="7">
              <AppTextField
                v-model="modelo.name"
                label="Nome do modelo"
                placeholder="Informe o nome do modelo"
                density="compact"
                class="mb-4"
              />

              <p class="mb-1">Escreva o conteúdo do modelo.</p>

              <div>
                <a @click="handleViewVariaveisTutorial" class="cursor-pointer">
                  Ver variáveis disponíveis
                  <VIcon
                    :icon="
                      viewVariaveisTutorial
                        ? 'tabler-chevron-up'
                        : 'tabler-chevron-down'
                    "
                  />
                </a>

                <v-fade-transition>
                  <div v-if="viewVariaveisTutorial" style="font-size: 13px">
                    <p class="mt-2 mb-4">
                      Para usar as variações adicione dentro do texto pelo
                      seletor ou inserindo o nome da variação dentro de duas
                      chaves. Ex.:
                      <span class="font-weight-bold" v-pre>{{
                        cliente_nome
                      }}</span>
                    </p>
                    <VRow class="mb-4">
                      <VCol cols="12" md="4">
                        <strong>Dados do cliente:</strong><br />
                        <!-- <span class="font-weight-bold" v-pre>{{
                          cliente_nome
                        }}</span>
                        - Nome do cliente<br /> -->
                        <span
                          v-for="variavel in variaveisItens.filter(
                            (item) => item.type == 'cliente'
                          )"
                          :key="variavel.value"
                          class="cursor-pointer"
                          @click="copyVariableToClipboard(variavel.value)"
                          v-html="
                            `<span class='font-weight-bold text-primary' v-pre>${
                              '{{' + variavel.value + '}}'
                            }</span> - ${variavel.title} <VIcon icon='tabler-copy' size='small' /><br />`
                          "
                        />
                      </VCol>
                      <VCol cols="12" md="4">
                        <strong>Dados do pedido:</strong><br />
                        <span
                          v-for="variavel in variaveisItens.filter(
                            (item) => item.type == 'pedido'
                          )"
                          :key="variavel.value"
                          class="cursor-pointer"
                          @click="copyVariableToClipboard(variavel.value)"
                          v-html="
                            `<span class='font-weight-bold text-primary' v-pre>${
                              '{{' + variavel.value + '}}'
                            }</span> - ${variavel.title} <VIcon icon='tabler-copy' size='small' /><br />`
                          "
                        />
                      </VCol>
                      <VCol cols="12" md="4">
                        <strong>Dados de pagamento:</strong><br />
                        <span
                          v-for="variavel in variaveisItens.filter(
                            (item) => item.type == 'pagamento'
                          )"
                          :key="variavel.value"
                          class="cursor-pointer"
                          @click="copyVariableToClipboard(variavel.value)"
                          v-html="
                            `<span class='font-weight-bold text-primary' v-pre>${
                              '{{' + variavel.value + '}}'
                            }</span> - ${variavel.title} <VIcon icon='tabler-copy' size='small' /><br />`
                          "
                        />
                      </VCol>
                    </VRow>
                    
                    <!-- Variáveis do Fluxo -->
                    <VRow v-if="flowVariables.length > 0" class="mt-4">
                      <VCol cols="12">
                        <strong>Variáveis do Fluxo:</strong><br />
                        <span
                          v-for="variavel in flowVariables"
                          :key="variavel.value"
                          class="cursor-pointer"
                          @click="copyVariableToClipboard(variavel.value)"
                          v-html="
                            `<span class='font-weight-bold text-success' v-pre>${
                              '{{' + variavel.value + '}}'
                            }</span> - ${variavel.title || variavel.label || variavel.value} <VIcon icon='tabler-copy' size='small' /><br />`
                          "
                        />
                      </VCol>
                    </VRow>
                  </div>
                </v-fade-transition>
              </div>

              <div class="inputQP mt-3">
                <div id="toolbar">
                  <!-- Add a bold button -->
                  <button class="ql-bold"></button>
                  <!-- Add a italic button -->
                  <button class="ql-italic"></button>
                  <!-- Add a strike button -->
                  <button class="ql-strike"></button>

                  <AppSelect
                    v-model="variavel"
                    :items="variaveisItens"
                    @update:modelValue="insertVariable"
                    item-title="title"
                    item-value="value"
                    placeholder="Inserir variável"
                    class="select-var"
                  />
                </div>
                <QuillEditor
                  v-model:content="modelo.content"
                  :options="editorOptions"
                  class="inputQP mb-3"
                  contentType="html"
                  ref="refQuillEditor"
                  @update:content="handlePreview($event)"
                />
              </div>

              <p class="mb-3 text-caption">
                Adicione uma mídia a campanha. Pode ser um vídeo, documento ou
                imagem.
              </p>

              <VFileInput
                v-model="modelo.midia"
                label="Mídia"
                @change="handleMidiaControl()"
                accept="image/*, video/*, application/pdf"
                v-if="modelo.viewInputFile"
              />

              <div
                v-if="modelo.midia && modelo.midia.url && !modelo.viewInputFile"
                class="d-flex flex-column flex-md-row gap-3 align-center"
              >
                <a :href="modelo.midia.url" target="_blank">
                  <VIcon icon="tabler-external-link" class="me-2" />
                  Visualizar {{ modelo.midia.url.split("/").pop() }}
                </a>

                <VBtn
                  color="error"
                  variant="tonal"
                  size="small"
                  @click="removeMidia()"
                >
                  <VIcon icon="tabler-trash" class="me-2" />
                  Remover mídia
                </VBtn>
              </div>

              <div
                class="d-flex flex-row gap-3 justify-center align-center mt-4"
              >
                <VBtn
                  color="primary"
                  variant="tonal"
                  @click="closeNavigationDrawer()"
                  :disabled="loadingSave"
                >
                  <VIcon icon="tabler-x" class="me-2" />
                  Cancelar
                </VBtn>

                <VBtn @click="saveModelo" :loading="loadingSave">
                  <VIcon icon="tabler-check" class="me-2" />
                  Salvar
                </VBtn>
              </div>
            </VCol>

            <VCol cols="12" md="5">
              <div class="d-flex flex-row align-center gap-2 mb-4">
                <VSelect
                  v-model="clienteSelected"
                  :items="clientes"
                  :loading="loading"
                  item-title="cli_nome"
                  item-value="cli_Id"
                  return-object
                  label="Selecione um cliente"
                  placeholder="Selecionar cliente para visualizar"
                  @update:model-value="getAgendamentoCliente($event?.cli_Id); handlePreview(modelo.content ?? '')"
                  class="w-50"
                >
                  <template #prepend-item>
                    <VTextField
                      label="Pesquisar Cliente"
                      v-model="searchQuery"
                      placeholder="Pesquisar..."
                      class="mb-2 mx-2"
                      @update:model-value="getClientes()"
                    />
                    <VDivider />
                  </template>
                  <template #item="{ props, item }">
                    <VListItem
                      #title
                      v-bind="props"
                      style="display: flex; align-items: center; gap: 0"
                    >
                      <p class="mb-0">
                        {{ item.raw.cli_nome }}
                        <span class="text-caption">
                          ({{ item.raw.agendamentos?.length || 0 }}
                          agendamentos)
                        </span>
                      </p>
                    </VListItem>
                  </template>
                </VSelect>

                <VSelect
                  v-if="clienteSelected?.agendamentos?.length"
                  v-model="agendamentoSelected"
                  :items="clienteSelected.agendamentos"
                  :loading="loading"
                  item-title="age_data"
                  item-value="age_id"
                  return-object
                  label="Selecione um agendamento"
                  placeholder="Selecionar agendamento para visualizar"
                  @update:model-value="handlePreview(modelo.content ?? '')"
                  class="w-50"
                >
                  <template #selection="{ item }">
                    <p class="mb-0 text-no-wrap text-truncate">
                      {{
                        item.raw?.age_data
                          ? moment(item.raw?.age_data).format("DD/MM/YYYY") +
                            (item.raw?.age_horaInicio
                              ? " - " + item.raw?.age_horaInicio
                              : "")
                          : "Selecionar agendamento"
                      }}
                    </p>
                  </template>
                  <template #item="{ props, item }">
                    <VListItem
                      #title
                      v-bind="props"
                      style="display: flex; align-items: center; gap: 0"
                    >
                      <p class="mb-0">
                        {{ moment(item.raw?.age_data).format("DD/MM/YYYY") }}
                        {{
                          item.raw?.age_horaInicio
                            ? " - " + item.raw?.age_horaInicio
                            : ""
                        }}
                      </p>
                    </VListItem>
                  </template>
                </VSelect>
              </div>

              <PreviewZap
                :htmlContent="messagePreview"
                :loading="loading"
                :hideHeader="false"
                :headerData="clienteSelected?.cliente || {}"
              />

            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VDialog>
</template>
