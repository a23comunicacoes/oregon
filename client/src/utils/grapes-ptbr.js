// src/utils/grapes-ptbr.js
export function applyGrapesPtBr(editor) {
  if (!editor) return;

  // ===== Painéis / Botões (tooltips & labels) =====
  const pn = editor.Panels;

  // Options
  const opt = pn.getPanel('options');
  if (opt) {
    // Botões padrão do Grapes (se existirem)
    setBtnTitle(opt, 'fullscreen', 'Tela cheia');
    setBtnTitle(opt, 'preview', 'Pré-visualizar');
    setBtnTitle(opt, 'export-template', 'Exportar (HTML/CSS)');
    setBtnTitle(opt, 'sw-visibility', 'Mostrar/ocultar camadas');
    setBtnTitle(opt, 'open-sm', 'Estilos');
    setBtnTitle(opt, 'open-tm', 'Atributos');
    setBtnTitle(opt, 'open-layers', 'Camadas');
    setBtnTitle(opt, 'open-blocks', 'Blocos');
    setBtnTitle(opt, 'undo', 'Desfazer');
    setBtnTitle(opt, 'redo', 'Refazer');
    setBtnTitle(opt, 'app-save', 'Salvar'); // botão que criamos no componente
  }

  // Views (aba esquerda/direita)
  const views = pn.getPanel('views');
  if (views) {
    setBtnTitle(views, 'open-blocks', 'Blocos');
    setBtnTitle(views, 'open-layers', 'Camadas');
    setBtnTitle(views, 'open-sm', 'Estilos');
    setBtnTitle(views, 'open-tm', 'Atributos');
  }

  // ===== Device Manager (nomes de dispositivos) =====
  const dm = editor.DeviceManager;
  try {
    const list = dm.getDevices();
    list.forEach(d => {
      const name = (d.get && d.get('name')) || d.name;
      if (name?.toLowerCase() === 'desktop') d.set('name', 'Desktop');
      if (name?.toLowerCase() === 'tablet') d.set('name', 'Tablet');
      if (name?.toLowerCase().includes('mobile')) d.set('name', 'Celular');
    });
  } catch {}

  // ===== Block Manager (renomear blocos comuns) =====
  const bm = editor.BlockManager;
  // IDs variam por preset/versão; cobrimos os mais frequentes do core + newsletter
  setBlockLabel(bm, 'text', 'Texto');
  setBlockLabel(bm, "text-sect", 'Seção de Texto');
  setBlockLabel(bm, 'image', 'Imagem');
  setBlockLabel(bm, 'link', 'Link');
  setBlockLabel(bm, 'video', 'Vídeo');
  setBlockLabel(bm, 'map', 'Mapa');
  setBlockLabel(bm, 'quote', 'Citação');
  setBlockLabel(bm, 'button', 'Botão');
  setBlockLabel(bm, 'divider', 'Divisor');
  setBlockLabel(bm, 'spacer', 'Espaçador');

  // Newsletter preset: seções/colunas
  setBlockLabel(bm, 'sect100', 'Seção 100%');
  setBlockLabel(bm, 'sect50', 'Seção 50/50');
  setBlockLabel(bm, 'sect30', 'Seção 30/70');
  setBlockLabel(bm, 'sect37', 'Seção 37/63');
  setBlockLabel(bm, 'column1', 'Coluna 1');
  setBlockLabel(bm, 'column2', 'Colunas 2');
  setBlockLabel(bm, 'column3', 'Colunas 3');
  setBlockLabel(bm, 'list', 'Lista');
  setBlockLabel(bm, 'list-items', 'Itens de Lista');
  setBlockLabel(bm, 'grid-items', 'Grade de Itens');
  setBlockLabel(bm, 'grid-item', 'Item de Grade');

  // ===== Categorias de Blocos (se existirem) =====
  try {
    bm.getCategories().forEach(cat => {
      const id = (cat.get && cat.get('id')) || cat.id;
      // Mapeamento simples
      const mapping = {
        basic: 'Básicos',
        extra: 'Extras',
        layout: 'Layout',
        typography: 'Tipografia',
        media: 'Mídia',
        forms: 'Formulários',
        newsletter: 'Newsletter',
      };
      if (mapping[id]) cat.set('label', mapping[id]);
    });
  } catch {}

  // ===== Trait Manager / Style Manager (títulos) =====
  const tm = editor.TraitManager;
  try {
    const trSec = document.querySelector('.gjs-trt-traits');
    if (trSec) trSec.setAttribute('data-label-pt', 'Atributos');
  } catch {}

  const sm = editor.StyleManager;
  try {
    // Renomear setores comuns, se disponíveis
    const sectors = sm.getSectors();
    sectors.forEach(sec => {
      const id = sec.get('id');
      const map = {
        general: 'Geral',
        layout: 'Layout',
        dimension: 'Dimensões',
        typography: 'Tipografia',
        decorations: 'Decoração',
        extra: 'Extra',
      };
      if (map[id]) sec.set('name', map[id]);
    });
  } catch {}

  // ===== Asset Manager =====
  try {
    const am = editor.AssetManager;
    // O título do modal é montado internamente; traduza via atributos DOM quando abrir
    editor.on('asset:open', () => {
      const modal = editor.Modal.getContentEl();
      if (modal) {
        const titleEl = modal.closest('.gjs-mdl-container')?.querySelector('.gjs-mdl-title');
        if (titleEl) titleEl.textContent = 'Gerenciador de Arquivos';
      }
    });
  } catch {}

  // ===== Helpers =====
  function setBtnTitle(panel, id, title) {
    try {
      const btn = panel.getButton(panel.id, id) || panel.getButtons().get(id);
      btn && btn.set('attributes', { ...(btn.get('attributes') || {}), title });
      // Alguns botões mostram label textual:
      if (btn && btn.get('label')) btn.set('label', title);
    } catch {}
  }
  function setBlockLabel(bm, id, label) {
    try {
      const b = bm.get(id);
      b && b.set({ label });
    } catch {}
  }
}
