<script setup>
  import { ref, onMounted, onBeforeUnmount, watch, defineExpose } from "vue";
  import grapesjs from "grapesjs";
  import "grapesjs/dist/css/grapes.min.css";
  import gjsNewsletter from "grapesjs-preset-newsletter";
  import { applyGrapesPtBr } from "@/utils/grapes-ptbr";
  import pt from "grapesjs/locale/pt";

  const svgSave = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" 
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
    class="icon icon-tabler icons-tabler-outline icon-tabler-device-floppy" style="fill: white !important;">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2"/>
        <path d="M12 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M14 4l0 4l-6 0l0 -4"/>
    </svg>`;
  /**
   * Componente global de construtor de e-mails (somente frontend)
   * - Baseado em GrapesJS + preset de newsletter (blocos drag & drop, tabela 600px, estilos inline)
   * - Props para carregar modelo existente (HTML ou JSON do projeto)
   * - Emits para "change" (edição em andamento) e "save" (salvar conteúdo)
   * - Sem export/download; quem persiste é o seu backend via @save
   */

  const props = defineProps({
    modelHtml: { type: String, default: "" },
    modelJson: { type: Object, default: null },
    height: { type: String, default: "100vh" },
    readOnly: { type: Boolean, default: false },
    variables: { type: Array, default: () => [] },
    flowVariables: { type: Array, default: () => [] },
  });

  const emit = defineEmits(["ready", "change", "save"]);

  const editor = ref(null);
  const containerRef = ref(null);
  const blocksRef = ref(null);
  let mountedOnce = false;

  onMounted(() => {
    if (mountedOnce) return;
    mountedOnce = true;

    const e = grapesjs.init({
      container: containerRef.value,
      fromElement: false,
      height: props.height,
      storageManager: false, // persistência por sua conta
      blockManager: { appendTo: blocksRef.value },
      deviceManager: {
        devices: [
          { name: "Desktop", width: "" },
          { name: "Mobile", width: "320px" },
        ],
      },
      assetManager: {
        upload: '/api/templates/upload-image',
        uploadName: 'file',
        uploadText: 'Arraste arquivos aqui ou clique para fazer upload',
        addBtnText: 'Adicionar imagem',
        uploadTitle: 'Carregar imagens',
        noAssets: 'Nenhuma imagem encontrada',
        multiUpload: false,
        autoAdd: true,
        autoUpload: true,
        acceptFiles: 'image/*',

        headers: {
          Authorization: `Bearer ${useCookie('accessToken').value}`,
        },
      },
      plugins: [gjsNewsletter],
      pluginsOpts: {
        "grapesjs-preset-newsletter": {
          modalTitleImport: "Importar HTML",
          // Você pode ajustar opções do preset aqui (ex.: bloqs default, styles, etc.)
        },
      },
      selectorManager: { componentFirst: true },
      i18n: {
        locale: "pt",
        messages: { pt },
      },
    });

    // Carrega conteúdo inicial
    if (props.modelJson) {
      e.loadProjectData(props.modelJson);
    } else if (props.modelHtml) {
      e.setComponents(props.modelHtml);
    } else {
      // Seed simples, email-safe
      e.setComponents(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f2f2;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background:#ffffff;">
              <tr><td style="padding:24px;">
                <h1 style="margin:0 0 12px 0; font-family:Arial,Helvetica,sans-serif;">Novo Email</h1>
                <p style="margin:0; font-family:Arial,Helvetica,sans-serif;">Comece a editar arrastando blocos à esquerda.</p>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>`);
    }

    applyGrapesPtBr(e);


    // Painéis: adiciona botões Salvar/Undo/Redo (sem export/download)
    const pn = e.Panels;
    pn.addButton("options", [
      {
        id: "app-save",
        label: svgSave,
        command: "app:save",
        attributes: {
          title: "Emitir conteúdo para salvar",
          class: "diminuir-botao-svg",
        },
      },
      {
        id: "undo",
        label: "Desfazer",
        command: "core:undo",
        attributes: { title: "Desfazer" },
      },
      {
        id: "redo",
        label: "Refazer",
        command: "core:redo",
        attributes: { title: "Refazer" },
      },
    ]);

    e.on("load", () => {
      // Ex.: remover só estes do painel 'options'
      [
        "export-template",
        "canvas-clear",
        "gjs-toggle-images",
        "gjs-open-import-template",
      ].forEach((id) => pn.removeButton("options", id));
    });

    // Comando de salvar: retorna HTML, CSS, HTML inline e JSON do projeto
    e.Commands.add("app:save", {
      run(ed) {
        const html = ed.getHtml();
        const css = ed.getCss();

        console.log('HTML:', html);
        let inlinedHtml = "";
        try {
          // Disponível no preset de newsletter
          inlinedHtml = ed.runCommand("gjs-get-inlined-html");
        } catch (err) {
          inlinedHtml = html; // fallback
        }
        const json = ed.getProjectData();
        emit("save", { html, css, inlinedHtml, json });
      },
    });

    // Propaga edições em tempo real (útil para preview do seu lado)
    const onAnyUpdate = () => {
      const html = e.getHtml();
      const css = e.getCss();

      console.log('Update do editor:', html, css);
      emit("change", { html, css });
    };
    e.on("update", onAnyUpdate);

    // Modo somente leitura básico
    if (props.readOnly) {
      e.setSelected(); // limpa seleção
      e.Canvas.getCanvasView().el.style.pointerEvents = "none";
    }

    // === Botão de inserção de variáveis na RTE ===
    function addVarsButton() {
      const rte = e.RichTextEditor;
      if (rte.get("vars")) return; // evita registrar 2x

      rte.add("vars", {
        icon: "{ }", // você pode trocar por um SVG aqui
        attributes: { title: "Inserir variável (Ctrl+M)" },
        result(rteInst) {
          // Combinar variáveis padrão com variáveis do fluxo
          const defaultVars = Array.isArray(props.variables) ? props.variables : [];
          const flowVars = Array.isArray(props.flowVariables) ? props.flowVariables : [];
          const vars = [...defaultVars, ...flowVars];
          
          if (!vars.length) {
            e.Modal.open({
              title: "Variáveis",
              content: "Nenhuma variável disponível.",
            });
            return;
          }

          const wrap = document.createElement("div");
          wrap.style.padding = "12px";
          wrap.innerHTML = `
        <label style="display:block;margin-bottom:8px;font:14px/1.2 sans-serif">Selecione a variável:</label>
        <select id="gjs-var-select" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px; color: black;">
          ${vars
            .map(
              (v) => `<option value="${v.value}">${v.title ?? v.label ?? v.value} ${v.type === 'dinamica' ? '(Fluxo)' : ''}</option>`
            )
            .join("")}
        </select>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
          <button id="gjs-var-cancel" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff">Cancelar</button>
          <button id="gjs-var-insert" style="padding:8px 12px;border:0;border-radius:8px;background:#111827;color:#fff">Inserir</button>
        </div>
      `;

          e.Modal.open({ title: "Inserir variável", content: wrap });

          const sel = wrap.querySelector("#gjs-var-select");
          wrap.querySelector("#gjs-var-cancel").onclick = () => e.Modal.close();
          wrap.querySelector("#gjs-var-insert").onclick = () => {
            const val = sel?.value?.trim();
            if (val) {
              const token = `{{${val}}}`;
              rteInst.insertHTML(token);
              
              // Aguardar o RTE processar a inserção
              setTimeout(() => {
                const selected = e.getSelected();
                if (selected) {
                  // Pegar o conteúdo HTML atual do elemento editável
                  const contentEl = rteInst.el;
                  if (contentEl) {
                    const currentContent = contentEl.innerHTML;
                    // Atualizar o conteúdo do componente com o HTML atual
                    selected.components(currentContent);
                    // Marcar como modificado
                    e.trigger('component:update', selected);
                  }
                }
              }, 100);
            }
            e.Modal.close();
          };
        },
      });
    }

    // registra o botão assim que a RTE estiver pronta
    e.on("rte:enable", addVarsButton);

    editor.value = e;
    emit("ready", e);
  });

  // Reagir à troca de props (carregar conteúdo novo sob demanda)
  watch(
    () => props.modelHtml,
    (val) => {
      if (!editor.value || !val) return;
      editor.value.setComponents(val);
    }
  );

  watch(
    () => props.modelJson,
    (val) => {
      console.log('Model JSON:', val);
      if (!editor.value || !val) return;
      editor.value.loadProjectData(val);
    }
  );

  onBeforeUnmount(() => {
    if (editor.value) {
      editor.value.destroy();
      editor.value = null;
    }
  });

  // Expor método para salvar programaticamente: this.$refs.builder.save()
  function save() {
    editor.value?.runCommand("app:save");
  }

  defineExpose({ save });
</script>

<template>
  <div class="gjs-wrapper" :style="{ height: props.height }">
    <div ref="blocksRef" class="gjs-blocks"></div>
    <div ref="containerRef" class="gjs-canvas"></div>
  </div>
</template>

<style scoped>
  .gjs-wrapper {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 8px;
  }
  .gjs-blocks {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: auto;
    background: #fff;
  }
  .gjs-canvas {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }
  :deep(.gjs-pn-panels) {
    border-bottom: 1px solid #eef0f4;
  }
  :deep(.gjs-one-bg) {
    background: #fff;
  }
  :deep(.gjs-two-color) {
    color: #111827;
  }
  :deep(.gjs-three-bg) {
    background: #f9fafb;
  }
  :deep(.gjs-four-color) {
    color: #374151;
  }
</style>
