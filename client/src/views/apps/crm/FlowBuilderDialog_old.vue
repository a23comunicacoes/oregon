<script setup>
import { PerfectScrollbar } from "vue3-perfect-scrollbar";
import { useRoute, useRouter } from "vue-router";
import { temaAtual } from "@core/stores/config";

//Comps
import MessageZapBlock from "./fluxo-comps/message-block.vue";
import EmailBlock from "./fluxo-comps/email-block.vue";
import ConditionBlock from "./fluxo-comps/condition-block.vue";
import AiDecisionBlock from "./fluxo-comps/ai-decision-block.vue";
import CreateAgendamentoBlock from "./fluxo-comps/create-agendamento-block.vue";
import CreateNegocioBlock from "./fluxo-comps/create-negocio-block.vue";
import UpdateAgendamentoBlock from "./fluxo-comps/update-agendamento-block.vue";
import UpdateClienteBlock from "./fluxo-comps/update-cliente-block.vue";
import AiActionsBlock from "./fluxo-comps/ai-actions-block.vue";
import WaitReplyBlock from "./fluxo-comps/wait-reply-block.vue";
import WaitReplyConditionalBlock from "./fluxo-comps/wait-reply-conditional-block.vue";
import RedirectFlowBlock from "./fluxo-comps/redirect-flow-block.vue";

const { setAlert } = useAlert();

const route = useRoute();
const router = useRouter();

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  flowData: Object,
});

const emit = defineEmits(["update:isDrawerOpen", "updateFlows", "closeDrawer"]);

const loading = ref(false);
const isNewFlow = ref(true);

const flow = ref({
  id: null,
  name: "Fluxo",
  description: "",
  status: "ativo",
  trigger_type: null,
  webhook_key: "",
  trigger_conditions: [],
});
const nodes = ref([]); // {id?, type, label, position_x, position_y, config}
const edges = ref([]); // {source_node_id?, target_node_id?, label}

const palette = [
  {
    type: "send_whatsapp",
    categoria: "Ações",
    title: "Enviar Mensagem",
    icon: "tabler-brand-whatsapp",
    color: "success",
  },
  {
    type: "send_email",
    categoria: "Ações",
    title: "Enviar Email",
    icon: "tabler-mail",
    color: "info",
  },
  {
    type: "send_ai",
    categoria: "IA",
    title: "Mensagem/Resposta IA",
    icon: "tabler-message-chatbot",
    color: "warning",
  },
  {
    type: "http",
    categoria: "Ações",
    title: "Requisição HTTP",
    icon: "tabler-cloud",
    color: "#0097A7",
  },
  {
    type: "create_agendamento",
    categoria: "Sistema",
    title: "Criar Agendamento",
    icon: "tabler-calendar-plus",
    color: "primary",
  },
  {
    type: "atualizar_agendamento",
    categoria: "Sistema",
    title: "Atualizar Agendamento",
    icon: "tabler-calendar-up",
    color: "primary",
  },
  {
    type: "create_negocio",
    categoria: "Sistema",
    title: "Criar Negócio",
    icon: "tabler-businessplan",
    color: "warning",
  },
  {
    type: "atualizar_cliente",
    categoria: "Sistema",
    title: "Atualizar Cliente",
    icon: "tabler-user-up",
    color: "primary",
  },
  {
    type: "ai_actions",
    categoria: "IA",
    title: "Ações IA",
    icon: "tabler-robot",
    color: "warning",
  },
  {
    type: "condition",
    title: "Condição",
    categoria: "Lógica",
    icon: "tabler-git-branch",
    color: "#512DA8",
  },
  {
    type: "ia_decision",
    categoria: "IA",
    title: "Decisão IA",
    icon: "tabler-brain",
    color: "error",
  },
  {
    type: "delay",
    title: "Delay",
    icon: "tabler-hourglass",
    color: "#AFB42B",
    categoria: "Tempo",
  },
  {
    type: "wait_reply",
    title: "Aguardar Resposta",
    icon: "tabler-message-circle",
    color: "#00796B",
    categoria: "Tempo",
  },
  {
    type: "wait_reply_conditional",
    title: "Aguardar Resposta Condicional",
    icon: "tabler-message-circle-question",
    color: "#FF9800",
    categoria: "Tempo",
  },
  {
    type: "redirect_flow",
    title: "Redirecionar para outro Fluxo",
    icon: "tabler-arrow-right-circle",
    color: "#E91E63",
    categoria: "Ações",
  },
];

// Drag & Drop
const canvasRef = ref(null);
const drag = reactive({ active: false, nodeId: null, offsetX: 0, offsetY: 0 });
const connecting = reactive({
  active: false,
  sourceId: null,
  targetId: null,
  mouseX: 0,
  mouseY: 0,
});

// Pan (arrastar canvas) e Zoom
const canvas = reactive({
  pan: { active: false, startX: 0, startY: 0, x: 0, y: 0 },
  zoom: 1,
  minZoom: 0.25,
  maxZoom: 2,
});

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;

const addNode = (t) => {
  let defaultConfig = {};

  switch (t) {
    case "send_whatsapp":
      defaultConfig = {
        content: "",
        idModelo: null,
      };
      break;
    case "send_email":
      defaultConfig = {
        content: "",
        idModelo: null,
      };
      break;
    case "send_ai":
      defaultConfig = {
        instructions: "",
      };
      break;

      break;
    case "http":
      defaultConfig = {
        method: "GET",
        url: "",
        body: "",
      };
      break;
    case "condition":
      defaultConfig = {
        conditions: [],
      };
      break;
    case "ia_decision":
      defaultConfig = {
        instructions: "",
      };
      break;
    case "create_agendamento":
      defaultConfig = {
        data: "",
        horaInicio: "",
        horaFim: "",
        funcionarioId: null,
        statusId: 1,
        observacoes: "",
      };
      break;
    case "create_negocio":
      defaultConfig = {
        titulo: "",
        etapaId: null,
        valor: null,
        origem: "",
        descricao: "",
      };
      break;
    case "atualizar_agendamento":
      defaultConfig = {
        agendamentoId: "",
        data: "",
        horaInicio: "",
        horaFim: "",
        funcionarioId: null,
        statusId: null,
        observacoes: "",
      };
      break;
    case "atualizar_cliente":
      defaultConfig = {
        clienteId: "",
        nome: "",
        email: "",
        celular: "",
        genero: "",
        tags: [],
        funilId: null,
        observacoes: "",
      };
      break;
    case "ai_actions":
      defaultConfig = {
        instructions: "",
        capabilities: {
          createAppointment: true,
          updateAppointment: true,
          cancelAppointment: true,
          createBusiness: true,
          updateBusiness: true,
          updateClient: true,
          sendMessage: true,
          askQuestions: true,
          collectData: true
        },
        fallbackActions: [],
        maxAttempts: 3,
        timeoutSeconds: 300
      };
      break;
    case "delay":
      defaultConfig = {
        seconds: 0,
      };
      break;
    case "wait_reply":
      defaultConfig = {
        timeoutSeconds: 0,
        useAI: false,
        aiInstructions: "",
        variables: [],
      };
      break;
    case "wait_reply_conditional":
      defaultConfig = {
        timeoutSeconds: 0,
        useAI: false,
        aiInstructions: "",
        variables: [],
        conditions: [],
      };
      break;
    case "redirect_flow":
      defaultConfig = {
        targetFlowId: null,
        message: "",
      };
      break;
    default:
      defaultConfig = {};
      break;
  }

  const paletteItem = palette.find((p) => p.type === t);
  const newNode = {
    id: `node_${Date.now()}`,
    type: t,
    label:
      t === "start" ? "Início" : t === "end" ? "Fim" : paletteItem?.title || t,
    position_x: 100 + nodes.value.length * 50,
    position_y: 100 + nodes.value.length * 30,
    config: defaultConfig,
  };
  nodes.value.push(newNode);
};

const selected = ref(null);
const selectNode = (n) => {
  selected.value = n;
};

// Drag handlers
// Funções de Pan (arrastar canvas)
const onCanvasMouseDown = (e) => {
  // Não ativa pan se clicar em um nó ou em um ponto de conexão
  if (e.target.closest('.node-card') || e.target.closest('.connection-point')) {
    return;
  }
  
  // Ativa o pan para qualquer outra área (incluindo SVG)
  canvas.pan.active = true;
  canvas.pan.startX = e.clientX - canvas.pan.x;
  canvas.pan.startY = e.clientY - canvas.pan.y;
  canvasRef.value.style.cursor = 'grabbing';
};

const onCanvasMouseMove = (e) => {
  if (canvas.pan.active) {
    canvas.pan.x = e.clientX - canvas.pan.startX;
    canvas.pan.y = e.clientY - canvas.pan.startY;
  }
};

const onCanvasMouseUp = () => {
  if (canvas.pan.active) {
    canvas.pan.active = false;
    canvasRef.value.style.cursor = 'grab';
  }
};

// Funções de Zoom
const zoomIn = () => {
  if (canvas.zoom < canvas.maxZoom) {
    canvas.zoom = Math.min(canvas.zoom + 0.1, canvas.maxZoom);
  }
};

const zoomOut = () => {
  if (canvas.zoom > canvas.minZoom) {
    canvas.zoom = Math.max(canvas.zoom - 0.1, canvas.minZoom);
  }
};

const resetZoom = () => {
  canvas.zoom = 1;
  canvas.pan.x = 0;
  canvas.pan.y = 0;
};

// Zoom com scroll do mouse
const onCanvasWheel = (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  canvas.zoom = Math.max(canvas.minZoom, Math.min(canvas.maxZoom, canvas.zoom + delta));
};

const onMouseDownNode = (e, nodeId) => {
  e.preventDefault();
  e.stopPropagation();

  const node = nodes.value.find((n) => n.id === nodeId);
  if (!node) return;

  const rect = canvasRef.value.getBoundingClientRect();
  drag.active = true;
  drag.nodeId = nodeId;
  drag.offsetX = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom - node.position_x;
  drag.offsetY = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom - node.position_y;

  // Adicionar classe de drag
  const nodeElement = e.currentTarget;
  nodeElement.classList.add("dragging");

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const onMouseMove = (e) => {
  if (!drag.active) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const node = nodes.value.find((n) => n.id === drag.nodeId);
  if (!node) return;

  node.position_x = Math.max(0, (e.clientX - rect.left - canvas.pan.x) / canvas.zoom - drag.offsetX);
  node.position_y = Math.max(0, (e.clientY - rect.top - canvas.pan.y) / canvas.zoom - drag.offsetY);
};

const onMouseUp = () => {
  // Remover classe de drag
  if (drag.nodeId) {
    const nodeElement = document.querySelector(
      `[data-node-id="${drag.nodeId}"]`
    );
    if (nodeElement) {
      nodeElement.classList.remove("dragging");
    }
  }

  drag.active = false;
  drag.nodeId = null;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
};

// Connection handlers
const startConnection = (e, nodeId, label = null) => {
  e.preventDefault();
  e.stopPropagation();

  const rect = canvasRef.value.getBoundingClientRect();
  connecting.active = true;
  connecting.sourceId = nodeId;
  connecting.label = label;
  connecting.mouseX = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom;
  connecting.mouseY = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom;

  document.addEventListener("mousemove", onConnectionMove);
  document.addEventListener("mouseup", onConnectionEnd);
};

const onConnectionMove = (e) => {
  if (!connecting.active) return;

  const rect = canvasRef.value.getBoundingClientRect();
  connecting.mouseX = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom;
  connecting.mouseY = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom;
};

const onConnectionEnd = (e) => {
  if (!connecting.active) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom;
  const mouseY = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom;

  // Find target node
  const targetNode = nodes.value.find((node) => {
    return (
      mouseX >= node.position_x &&
      mouseX <= node.position_x + NODE_WIDTH &&
      mouseY >= node.position_y &&
      mouseY <= node.position_y + NODE_HEIGHT &&
      node.id !== connecting.sourceId
    );
  });

  if (targetNode) {
    addEdge(connecting.sourceId, targetNode.id, connecting.label || null);
  }

  connecting.active = false;
  connecting.sourceId = null;
  document.removeEventListener("mousemove", onConnectionMove);
  document.removeEventListener("mouseup", onConnectionEnd);
};

const addEdge = (sourceId, targetId, label = null) => {
  if (sourceId === targetId) return;

  // Check if edge already exists
  const exists = edges.value.find(
    (e) =>
      e.source_node_id === sourceId &&
      e.target_node_id === targetId &&
      e.label === label
  );
  if (exists) return;

  edges.value.push({
    source_node_id: sourceId,
    target_node_id: targetId,
    label: label,
  });
};

const removeEdge = (index) => {
  edges.value.splice(index, 1);
};

const removeEdgeById = (edgeId) => {
  const index = edges.value.findIndex(e => e.id === edgeId);
  if (index >= 0) {
    edges.value.splice(index, 1);
  }
};

const removeEdgeByConnection = (sourceId, targetId, label = null) => {
  const index = edges.value.findIndex(e => 
    e.source_node_id === sourceId && 
    e.target_node_id === targetId && 
    (label === null || e.label === label)
  );
  if (index >= 0) {
    edges.value.splice(index, 1);
  }
};

// Estado para menu de contexto de conexões
const edgeMenu = ref({
  show: false,
  x: 0,
  y: 0,
  edge: null,
  index: -1
});

const showEdgeMenu = (event, edge, index) => {
  edgeMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    edge: edge,
    index: index
  };
};

const hideEdgeMenu = () => {
  edgeMenu.value.show = false;
};

const confirmRemoveEdge = () => {
  if (edgeMenu.value.index >= 0) {
    removeEdge(edgeMenu.value.index);
    hideEdgeMenu();
  }
};

const resetNodeConnections = (nodeId) => {
  // Remove todas as conexões relacionadas a este nó
  edges.value = edges.value.filter(
    (e) => e.source_node_id !== nodeId && e.target_node_id !== nodeId
  );
};

// Variáveis para condicionais do gatilho
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

const addTriggerCondition = () => {
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
  
  flow.value.trigger_conditions = [...(flow.value.trigger_conditions || []), newCondition];
};

const removeTriggerCondition = (index) => {
  const newConditions = [...(flow.value.trigger_conditions || [])];
  newConditions.splice(index, 1);
  flow.value.trigger_conditions = newConditions;
};

const handleTriggerFieldSelect = async (condition) => {
  condition.valueIsSelect = false;
  condition.valueIsDinheiro = false;
  condition.itensValueSelect = [];
  
  if (condition.field === 'variavel') {
    condition.valueIsSelect = true;
    const allVars = await getAllVariables();
    condition.itensValueSelect = allVars;
  } else if (condition.field === 'tags') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = tags.value.map(tag => ({ title: tag, value: tag }));
  } else if (condition.field === 'estado') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = infos.value.filter(info => info.type === 'estado').map(info => ({ title: info.title, value: info.value }));
  } else if (condition.field === 'cidade') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = infos.value.filter(info => info.type === 'cidade').map(info => ({ title: info.title, value: info.value }));
  } else if (condition.field === 'origem') {
    condition.valueIsSelect = true;
    condition.itensValueSelect = fontesClientes.value.map(fonte => ({ title: fonte, value: fonte }));
  } else if (condition.field === 'valor_gasto' || condition.field === 'quantidade_agendamentos' || condition.field === 'quantidade_negocios') {
    condition.valueIsDinheiro = true;
  }
};

// Funções para carregar dados das condicionais
const getInfos = async () => {
  try {
    const res = await $api('/infos', { method: 'GET' });
    if (res) {
      infos.value = res.map(info => ({
        title: info.title,
        value: info.value,
        type: info.type,
        desc: info.desc || ''
      }));
    }
  } catch (error) {
    console.error('Erro ao obter informações:', error);
  }
};

const getTags = async () => {
  try {
    const res = await $api('/tags', { method: 'GET' });
    if (res) {
      tags.value = res.map(tag => tag.title);
    }
  } catch (error) {
    console.error('Erro ao obter tags:', error);
  }
};

const getFunis = async () => {
  try {
    const res = await $api('/crm/list/funil', { method: 'GET' });
    if (res) {
      funis.value = res.map(funil => ({
        title: funil.title,
        value: funil.value,
        desc: funil.desc || ''
      }));
    }
  } catch (error) {
    console.error('Erro ao obter funis:', error);
  }
};

const getConfig = async () => {
  try {
    const res = await $api('/config', { method: 'GET' });
    if (res) {
      fontesClientes.value = res
        .filter((r) => r.type === "fonte_cliente")
        .map(r => r.value);
    }
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
  }
};

// SVG path calculation
const getNodeCenter = (node) => ({
  x: node.position_x + NODE_WIDTH / 2,
  y: node.position_y + NODE_HEIGHT / 2,
});

const getConnectionPath = (sourceId, targetId) => {
  const sourceNode = nodes.value.find((n) => n.id === sourceId);
  const targetNode = nodes.value.find((n) => n.id === targetId);

  if (!sourceNode || !targetNode) return "";

  const start = getNodeCenter(sourceNode);
  const end = getNodeCenter(targetNode);

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  const controlPoint1 = { x: start.x + dx * 0.5, y: start.y };
  const controlPoint2 = { x: end.x - dx * 0.5, y: end.y };

  return `M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${end.x} ${end.y}`;
};

const getActiveConnectionPath = () => {
  if (!connecting.active || !connecting.sourceId) return "";

  const sourceNode = nodes.value.find((n) => n.id === connecting.sourceId);
  if (!sourceNode) return "";

  const start = getNodeCenter(sourceNode);
  return `M ${start.x} ${start.y} L ${connecting.mouseX} ${connecting.mouseY}`;
};

const getConnectionLabelX = (sourceId, targetId) => {
  const sourceNode = nodes.value.find((n) => n.id === sourceId);
  const targetNode = nodes.value.find((n) => n.id === targetId);

  if (!sourceNode || !targetNode) return 0;

  const start = getNodeCenter(sourceNode);
  const end = getNodeCenter(targetNode);

  return (start.x + end.x) / 2;
};

const getConnectionLabelY = (sourceId, targetId) => {
  const sourceNode = nodes.value.find((n) => n.id === sourceId);
  const targetNode = nodes.value.find((n) => n.id === targetId);

  if (!sourceNode || !targetNode) return 0;

  const start = getNodeCenter(sourceNode);
  const end = getNodeCenter(targetNode);

  return (start.y + end.y) / 2;
};

const load = async () => {
  if (props.flowData && props.flowData.id) {
    isNewFlow.value = false;
    loading.value = true;
    try {
      const res = await $api(`/flows/${props.flowData.id}`, { method: "GET" });
      if (res) {
        flow.value = {
          ...res.flow,
          trigger_conditions: res.flow.trigger_conditions || []
        };
        nodes.value = res.nodes.map((n) => ({
          ...n,
          id:
            n.id ||
            `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          config: n.config
            ? typeof n.config === "string"
              ? JSON.parse(n.config)
              : n.config
            : {},
        }));
        edges.value = res.edges;
      }
    } catch (e) {
      console.error("Erro carregando fluxo", e);
    }
    loading.value = false;
  } else {
    isNewFlow.value = true;
    nodes.value = [
      {
        id: "node_start",
        type: "start",
        label: "Início",
        position_x: 100,
        position_y: 100,
        config: {},
      },
      {
        id: "node_end",
        type: "end",
        label: "Fim",
        position_x: 500,
        position_y: 100,
        config: {},
      },
    ];
    edges.value = [];
  }
  
  // Carregar dados para condicionais
  await loadConditionalData();
};

const loadConditionalData = async () => {
  await Promise.all([
    getInfos(),
    getTags(),
    getFunis(),
    getConfig()
  ]);
  
  // Carregar campos disponíveis
  fieldItens.value = [
    { title: "Variável", value: "variavel" },
    { title: "Tags", value: "tags" },
    { title: "Origem", value: "origem" },
    { title: "Email", value: "email" },
    { title: "Gênero", value: "genero" },
    { title: "Bairro", value: "bairro" },
    { title: "Estado", value: "estado" },
    { title: "Cidade", value: "cidade" },
    { title: "Valor Ganho", value: "valor_gasto" },
    { title: "Data de Cadastro", value: "data_cadastro" },
    { title: "Data do Último Agendamento", value: "data_ultimo_agendamento" },
    { title: "Quantidade de Agendamentos", value: "quantidade_agendamentos" },
    { title: "Quantidade de Negócios", value: "quantidade_negocios" },
    { title: "Etapa do Funil de Vendas", value: "etapa_funil_vendas" },
    // Adicionar variáveis do sistema
    { title: "Data Atual", value: "data_atual" },
    { title: "Hora Atual", value: "hora_atual" },
    { title: "Dia da Semana", value: "dia_semana" },
    { title: "Mês Atual", value: "mes_atual" }
  ].sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));
};

watch(
  () => props.isDrawerOpen,
  (newVal) => {
    if (newVal) {
      load();
    } else {
      limparFlow();
    }
  }
);

watch(
  () => props.flowData,
  (newVal) => {
    if (newVal && newVal.id) {
      isNewFlow.value = false;
      load();
    }
  }
);

const limparFlow = () => {
  flow.value = {
    id: null,
    name: "Fluxo",
    description: "",
    status: "ativo",
    trigger_type: null,
    webhook_key: "",
    trigger_conditions: [],
  };
  nodes.value = [];
  edges.value = [];
  selected.value = null;
};

const closeNavigationDrawer = () => {
  emit("update:isDrawerOpen", false);
  limparFlow();
};

const handleDrawerModelValueUpdate = (val) => {
  emit("update:isDrawerOpen", val);
};

const save = async () => {
  loading.value = true;
  try {
    // Preparar os nós com informações adicionais
    const preparedNodes = nodes.value.map((node, index) => ({
      ...node,
      originalIndex: index
    }));
    
    // Preparar as conexões com índices para facilitar o mapeamento no backend
    const preparedEdges = edges.value.map(edge => {
      const sourceIndex = nodes.value.findIndex(n => n.id === edge.source_node_id);
      const targetIndex = nodes.value.findIndex(n => n.id === edge.target_node_id);
      
      return {
        ...edge,
        sourceIndex: sourceIndex >= 0 ? sourceIndex : null,
        targetIndex: targetIndex >= 0 ? targetIndex : null,
        source_label: nodes.value.find(n => n.id === edge.source_node_id)?.label || null,
        target_label: nodes.value.find(n => n.id === edge.target_node_id)?.label || null
      };
    });
    
    const body = { 
      ...flow.value, 
      nodes: preparedNodes, 
      edges: preparedEdges 
    };
    
    if (flow.value.id) {
      await $api(`/flows/${flow.value.id}`, { method: "PUT", body });
    } else {
      const idNew = await $api("/flows", { method: "POST", body });
      if (idNew?.id) flow.value.id = idNew.id;
    }

    setAlert(
      `Fluxo ${isNewFlow.value ? "criado" : "atualizado"} com sucesso!`,
      "success",
      "tabler-check",
      3000
    );

    closeNavigationDrawer();
    emit("updateFlows");
  } catch (e) {
    console.error("Erro salvando fluxo", e);
    setAlert(
      e?.response?._data?.message ||
        `Erro ao ${isNewFlow.value ? "criar" : "atualizar"} fluxo!`,
      "error",
      "tabler-alert-triangle",
      3000
    );
  }
  loading.value = false;
};

const removeNode = (nodeId) => {
  // Remove o nó
  const nodeIndex = nodes.value.findIndex((n) => n.id === nodeId);
  if (nodeIndex > -1) {
    nodes.value.splice(nodeIndex, 1);
  }

  // Remove todas as conexões relacionadas a este nó
  edges.value = edges.value.filter(
    (e) => e.source_node_id !== nodeId && e.target_node_id !== nodeId
  );

  // Deseleciona se o nó removido estava selecionado
  if (selected.value?.id === nodeId) {
    selected.value = null;
  }
};

// Funções auxiliares
const getNodeDescription = (node) => {
  switch (node.type) {
    case "start":
      return "Ponto de início do fluxo";
    case "end":
      return "Fim do fluxo";
    case "send_whatsapp":
      return "Enviar mensagem WhatsApp";
    case "send_email":
      return "Enviar email";
    case "send_ai":
      return "Resposta automática com IA";
    case "http":
      return "Requisição HTTP";
    case "condition":
      return "Verificar condição";
    case "delay":
      return "Aguardar tempo";
    case "wait_reply":
      return "Aguardar resposta do usuário";
    default:
      return "Bloco de ação";
  }
};

const getNodePalette = (nodeType) => {
  const paletteItem = palette.find((p) => p.type === nodeType);
  if (paletteItem) return paletteItem;

  // Para blocos start e end que não estão na paleta
  if (nodeType === "start") {
    return {
      type: "start",
      title: "Gatilho/Start",
      icon: "tabler-bolt",
      color: "primary",
    };
  }
  if (nodeType === "end") {
    return {
      type: "end",
      title: "Saída/End",
      icon: "tabler-door-exit",
      color: "error",
    };
  }

  return {
    type: nodeType,
    title: nodeType,
    icon: "tabler-square-rounded",
    color: "grey",
  };
};

const getHttpMethodColor = (method) => {
  switch (method?.toUpperCase()) {
    case "GET":
      return "success";
    case "POST":
      return "primary";
    case "PUT":
      return "warning";
    case "DELETE":
      return "error";
    default:
      return "grey";
  }
};

const getNodeLabel = (nodeId) => {
  const node = nodes.value.find((n) => n.id === nodeId);
  return node?.label || "Nó não encontrado";
};

// Função para obter todas as variáveis do fluxo
const getAllFlowVariables = () => {
  const variables = [];
  
  // Adicionar variáveis dos blocos wait_reply e wait_reply_conditional
  nodes.value.forEach(node => {
    if (node.type === 'wait_reply' || node.type === 'wait_reply_conditional') {
      const config = node.config || {};
      if (config.variables && Array.isArray(config.variables)) {
        config.variables.forEach(variable => {
          if (variable.name) {
            variables.push({
              value: variable.name,
              title: variable.label || variable.name,
              type: 'dinamica'
            });
          }
        });
      }
    }
  });
  
  return variables;
};
</script>

<template>
  <VDialog
    persistent
    fullscreen
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <VCard flat v-if="flow" rounded="0">
      <VCardText class="pt-5">
        <div class="linha-flex justify-space-between align-center mb-4">
          <div style="max-width: 350px; width: 100%">
            <AppTextEdit
              v-model="flow.name"
              tag="h2"
              class="text-h5"
              type="text"
              @save="flow.name = $event"
            />
          </div>
          <div class="linha-flex">
            <VBtn
              variant="outlined"
              color="secondary"
              @click="closeNavigationDrawer"
            >
              Fechar
            </VBtn>
            <VBtn color="primary" @click="save" :loading="loading">
              <VIcon icon="tabler-device-floppy" class="mr-2" />Salvar
            </VBtn>
          </div>
        </div>

        <VRow style="height: calc(100% - 50px)" class="match-height">
          <VCol cols="12" md="3">
            <div v-if="selected">
              <div class="linha-flex justify-space-between align-center mb-4">
                <div>
                  <p class="mb-0 font-weight-bold">
                    {{ selected.label || selected.type }}
                  </p>
                  <p class="mb-0 text-disabled text-caption">
                    Configuração do bloco
                  </p>
                </div>

                <IconBtn @click="selected = null">
                  <VIcon icon="tabler-x" />
                </IconBtn>
              </div>

              <VRow>
                <VCol cols="12">
                  <AppTextField v-model="selected.label" label="Rótulo" />
                </VCol>

                <template v-if="selected.type === 'start'">
                  <VCol cols="12">
                    <AppSelect
                      v-model="flow.trigger_type"
                      :items="[
                        { value: 'webhook', title: 'Webhook' },
                        {
                          value: 'novo_agendamento',
                          title: 'Novo Agendamento',
                        },
                        {
                          value: 'status_agendamento',
                          title: 'Alteração Status Agendamento',
                        },
                        { value: 'novo_pagamento', title: 'Novo Pagamento' },
                        {
                          value: 'pagamento_efetuado',
                          title: 'Pagamento Efetuado',
                        },
                        {
                          value: 'mensagem_whatsapp',
                          title: 'Mensagem WhatsApp',
                        },
                      ]"
                      label="Trigger Principal"
                      placeholder="Selecione"
                    />
                  </VCol>
                  <VCol cols="12" v-if="flow.trigger_type === 'webhook'">
                    <label
                      class="v-label mb-1 text-body-2 text-high-emphasis cursor-pointer"
                    >
                      Chave Webhook

                      <VIcon
                        icon="tabler-info-circle-filled"
                        class="ml-1"
                        color="primary"
                      />

                      <VTooltip activator="parent">
                        <p
                          class="text-sm mb-0 text-center"
                          style="max-width: 300px"
                        >
                          Defina uma URL para o webhook. Você poderá utilizar a
                          chave webhook de qualquer sistema externo para
                          disparar este fluxo.<br />
                          Exemplo:
                          https://app.oregonservicos.com.br/webhook/:chave
                        </p>
                      </VTooltip>
                    </label>
                    <AppTextField
                      v-model="flow.webhook_key"
                      placeholder="/webhook/:chave"
                      persistent-hint
                    />
                  </VCol>
                  
                  <!-- Condicionais do Gatilho -->
                  <VCol cols="12">
                    <VDivider class="my-4" />
                    <div class="d-flex justify-space-between align-center mb-3">
                      <h6 class="text-h6 mb-0">Condicionais do Gatilho</h6>
                      <VBtn
                        @click="addTriggerCondition"
                        variant="tonal"
                        color="primary"
                        size="small"
                        style="height: 30px"
                      >
                        <VIcon class="me-1" icon="tabler-plus" />
                        Condição
                      </VBtn>
                    </div>

                    <div v-for="(condition, index) in flow.trigger_conditions" :key="condition.id" class="v-row align-items-center mb-4">
                      <VCol cols="12" md="6">
                        <AppSelect 
                          v-model="condition.field" 
                          :items="fieldItens" 
                          label="Campo" 
                          required 
                          placeholder="Selecione o campo"
                          @update:model-value="handleTriggerFieldSelect(condition)"
                        />
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
                          v-if="flow.trigger_conditions.length > 1 && index < flow.trigger_conditions.length - 1"
                        />
                        <IconBtn @click="removeTriggerCondition(index)" variant="tonal" color="error">
                          <VIcon icon="tabler-trash" />
                        </IconBtn>
                      </VCol>
                      <VCol cols="12" class="pa-0 d-flex flex-row align-center justify-center">
                        <VDivider />
                        <span class="text-caption mx-2">{{ index === flow.trigger_conditions.length - 1 ? "-" : condition.logicalOperator === "or" ? "OU" : "&" }}</span>
                        <VDivider />
                      </VCol>
                    </div>
                    
                    <div v-if="flow.trigger_conditions.length === 0" class="text-center py-4 text-medium-emphasis">
                      <VIcon icon="tabler-info-circle" class="mb-2" size="48" />
                      <p class="mb-0">Nenhuma condição configurada</p>
                      <p class="text-caption">Adicione condições para filtrar quando o gatilho deve ser executado</p>
                    </div>
                  </VCol>
                </template>

                <template v-if="selected.type === 'send_whatsapp'">
                  <VCol cols="12">
                    <MessageZapBlock
                      :message="selected.config.content"
                      :flowVariables="getAllFlowVariables()"
                      @update:message="
                        selected.config.content = $event.content;
                        selected.config.idModelo = $event.idModelo;
                      "
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'send_email'">
                  <VCol cols="12">
                    <EmailBlock
                      :email="selected.config.content"
                      @update:email="
                        selected.config.content = $event.content;
                        selected.config.idModelo = $event.idModelo;
                      "
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'send_ai'">
                  <VCol cols="12">
                    <label class="v-label mb-1 text-body-2 text-high-emphasis">
                      Instruções para a IA

                      <VIcon
                        icon="tabler-info-circle-filled"
                        class="ml-1"
                        color="primary"
                      />

                      <VTooltip activator="parent">
                        <p
                          class="text-sm mb-0 text-center"
                          style="max-width: 350px"
                        >
                          Dê instruções personalizadas para a IA conduzir o
                          fluxo.
                          <br />
                          Exemplo: "O usuário está em um fluxo de novo
                          agendamento, você deve dar detalhes sobre o
                          agendamento caso ele solicite..."
                        </p>
                      </VTooltip>
                    </label>
                    <AppTextarea
                      v-model="selected.config.instructions"
                      placeholder="Forneça instruções claras para a IA"
                      active
                      rows="3"
                      auto-grow
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'http'">
                  <VCol cols="12" md="4">
                    <AppSelect
                      v-model="selected.config.method"
                      :items="['GET', 'POST', 'PUT', 'DELETE']"
                      label="Método"
                    />
                  </VCol>
                  <VCol cols="12" md="8">
                    <AppTextField v-model="selected.config.url" label="URL" />
                  </VCol>
                  <VCol cols="12">
                    <AppTextarea
                      v-model="selected.config.body"
                      label="Body (JSON)"
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'condition'">
                  <VCol cols="12">
                    <ConditionBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'ia_decision'">
                  <VCol cols="12">
                    <AiDecisionBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'create_agendamento'">
                  <VCol cols="12">
                    <CreateAgendamentoBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'create_negocio'">
                  <VCol cols="12">
                    <CreateNegocioBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'atualizar_agendamento'">
                  <VCol cols="12">
                    <UpdateAgendamentoBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'atualizar_cliente'">
                  <VCol cols="12">
                    <UpdateClienteBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'ai_actions'">
                  <VCol cols="12">
                    <AiActionsBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'delay'">
                  <VCol cols="12">
                    <AppTextField
                      v-model.number="selected.config.seconds"
                      type="number"
                      label="Segundos"
                      placeholder="Informe o tempo em segundos"
                    />
                  </VCol>
                </template>

                <template v-else-if="selected.type === 'wait_reply'">
                  <VCol cols="12">
                    <WaitReplyBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>

                <template
                  v-else-if="selected.type === 'wait_reply_conditional'"
                >
                  <VCol cols="12">
                    <WaitReplyConditionalBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>


                <template v-else-if="selected.type === 'redirect_flow'">
                  <VCol cols="12">
                    <RedirectFlowBlock
                      :config="selected.config"
                      @update:config="selected.config = $event"
                    />
                  </VCol>
                </template>
              </VRow>

              <div class="text-right mt-4">
                <VBtn
                  color="error"
                  variant="tonal"
                  size="small"
                  @click="removeNode(selected.id)"
                  v-if="selected.type !== 'start' && selected.type !== 'end'"
                >
                  <VIcon icon="tabler-trash" class="mr-1" />
                  Remover
                </VBtn>
              </div>
            </div>

            <div class="d-flex flex-column gap-4" v-else>
              <p class="mb-0 text-sm">Ações</p>
              <VList>
                <VListItem
                  v-for="p in palette.filter((p) => p.categoria === 'Ações')"
                  :key="p.type"
                  @click="addNode(p.type)"
                >
                  <VIcon
                    :icon="p.icon"
                    class="mr-2"
                    :color="p.color ? p.color : 'primary'"
                  />
                  {{ p.title }}
                </VListItem>
              </VList>

              <p class="mb-0 text-sm">Lógica</p>
              <VList>
                <VListItem
                  v-for="p in palette.filter((p) => p.categoria === 'Lógica')"
                  :key="p.type"
                  @click="addNode(p.type)"
                >
                  <VIcon
                    :icon="p.icon"
                    class="mr-2"
                    :color="p.color ? p.color : 'primary'"
                  />
                  {{ p.title }}
                </VListItem>
              </VList>

              <p class="mb-0 text-sm">Sistema</p>
              <VList>
                <VListItem
                  v-for="p in palette.filter((p) => p.categoria === 'Sistema')"
                  :key="p.type"
                  @click="addNode(p.type)"
                >
                  <VIcon
                    :icon="p.icon"
                    class="mr-2"
                    :color="p.color ? p.color : 'primary'"
                  />
                  {{ p.title }}
                </VListItem>
              </VList>

              <p class="mb-0 text-sm">IA</p>
              <VList>
                <VListItem
                  v-for="p in palette.filter((p) => p.categoria === 'IA')"
                  :key="p.type"
                  @click="addNode(p.type)"
                >
                  <VIcon
                    :icon="p.icon"
                    class="mr-2"
                    :color="p.color ? p.color : 'primary'"
                  />
                  {{ p.title }}
                </VListItem>
              </VList>

              <p class="mb-0 text-sm">Tempo</p>
              <VList>
                <VListItem
                  v-for="p in palette.filter((p) => p.categoria === 'Tempo')"
                  :key="p.type"
                  @click="addNode(p.type)"
                >
                  <VIcon
                    :icon="p.icon"
                    class="mr-2"
                    :color="p.color ? p.color : 'primary'"
                  />
                  {{ p.title }}
                </VListItem>
              </VList>
            </div>
          </VCol>

          <VCol cols="12" md="9" class="position-relative">
            <!-- Controles de Zoom -->
            <div class="position-absolute" style="top: 15px; right: 15px; z-index: 100;">
              <VBtnGroup variant="elevated">
                <VBtn
                  @click="zoomIn"
                  color="primary"
                  size="small"
                  :disabled="canvas.zoom >= canvas.maxZoom"
                  style="height: 35px;"
                  rounded="lg"
                >
                  <VIcon icon="tabler-zoom-in" />
                  <VTooltip activator="parent">Aumentar Zoom</VTooltip>
                </VBtn>
                <VBtn
                  @click="resetZoom"
                  color="secondary"
                  size="small"
                  style="height: 35px;"
                  rounded="lg"
                >
                  {{ Math.round(canvas.zoom * 100) }}%
                  <VTooltip activator="parent">Resetar Zoom e Posição</VTooltip>
                </VBtn>
                <VBtn
                  @click="zoomOut"
                  color="primary"
                  size="small"
                  :disabled="canvas.zoom <= canvas.minZoom"
                  style="height: 35px;"
                  rounded="lg"
                >
                  <VIcon icon="tabler-zoom-out" />
                  <VTooltip activator="parent">Diminuir Zoom</VTooltip>
                </VBtn>
              </VBtnGroup>
            </div>

            <div
              ref="canvasRef"
              class="position-relative"
              style="
                height: 100%;
                background: #f8f9fa;
                border-radius: 5px;
                background-image: radial-gradient(
                  circle,
                  #ddd 1px,
                  transparent 1px
                );
                background-size: 20px 20px;
                overflow: hidden;
                cursor: grab;
              "
              @mousedown="onCanvasMouseDown"
              @mousemove="onCanvasMouseMove"
              @mouseup="onCanvasMouseUp"
              @mouseleave="onCanvasMouseUp"
              @wheel="onCanvasWheel"
            >
              <!-- Container com transform para zoom e pan -->
              <div
                :style="{
                  transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom})`,
                  transformOrigin: '0 0',
                  width: '10000px',
                  height: '10000px',
                  position: 'relative'
                }"
              >
              <!-- SVG para as conexões -->
              <svg
                class="position-absolute"
                style="
                  top: 0;
                  left: 0;
                  width: 10000px;
                  height: 10000px;
                  z-index: 1;
                  pointer-events: auto;
                "
              >
                <!-- Conexões existentes -->
                <g v-for="(edge, i) in edges" :key="'edge-' + i">
                  <path
                    :d="
                      getConnectionPath(
                        edge.source_node_id,
                        edge.target_node_id
                      )
                    "
                    stroke="#5c6ac4"
                    stroke-width="2"
                    fill="none"
                    stroke-dasharray="5,5"
                    class="cursor-pointer"
                    @click="removeEdge(i)"
                    @contextmenu.prevent="showEdgeMenu($event, edge, i)"
                  />
                  <!-- Label da conexão -->
                  <text
                    v-if="edge.label"
                    :x="
                      getConnectionLabelX(
                        edge.source_node_id,
                        edge.target_node_id
                      )
                    "
                    :y="
                      getConnectionLabelY(
                        edge.source_node_id,
                        edge.target_node_id
                      )
                    "
                    text-anchor="middle"
                    font-size="12"
                    fill="#5c6ac4"
                    font-weight="bold"
                    class="cursor-pointer"
                    @click="removeEdge(i)"
                    @contextmenu.prevent="showEdgeMenu($event, edge, i)"
                  >
                    {{ edge.label }}
                  </text>
                </g>

                <!-- Conexão ativa (arrastando) -->
                <path
                  v-if="connecting.active"
                  :d="getActiveConnectionPath()"
                  stroke="#ff6b6b"
                  stroke-width="2"
                  fill="none"
                  stroke-dasharray="3,3"
                />
              </svg>

              <!-- Nós -->
              <div
                v-for="node in nodes"
                :key="node.id"
                :data-node-id="node.id"
                class="position-absolute rounded-lg node-card cursor-grab transition-all duration-200 hover:shadow-lg"
                :class="[
                  selected?.id === node.id ? 'ring-2 ring-primary' : '',
                  `bg-${getNodePalette(node.type).color}-50`,
                  `border-${getNodePalette(node.type).color}-300`,
                  drag.active && drag.nodeId === node.id
                    ? 'cursor-grabbing'
                    : 'cursor-grab',
                ]"
                :style="{
                  left: node.position_x + 'px',
                  top: node.position_y + 'px',
                  width: NODE_WIDTH + 'px',
                  zIndex: selected?.id === node.id ? 10 : 2,
                }"
                @mousedown="(e) => onMouseDownNode(e, node.id)"
                @click="selectNode(node)"
                @contextmenu.prevent="node.viewMenu = true"
              >
                <VMenu
                  v-model="node.viewMenu"
                  activator="parent"
                  v-if="node.viewMenu"
                >
                  <VList>
                    <VListItem @click="selectNode(node)">
                      <VIcon
                        icon="tabler-settings"
                        class="mr-2"
                        color="primary"
                      />
                      Configurar
                    </VListItem>
                    <VListItem @click="resetNodeConnections(node.id)">
                      <VIcon
                        icon="tabler-refresh"
                        class="mr-2"
                        color="warning"
                      />
                      Resetar Conexões
                    </VListItem>
                    <VListItem
                      @click="removeNode(node.id)"
                      v-if="node.type !== 'start' && node.type !== 'end'"
                    >
                      <VIcon icon="tabler-trash" class="mr-2" color="error" />
                      Remover
                    </VListItem>
                  </VList>
                </VMenu>
                <!-- Header do nó -->
                <div class="d-flex align-center pa-3 pb-2">
                  <VAvatar
                    :color="getNodePalette(node.type).color"
                    size="32"
                    class="mr-3"
                  >
                    <VIcon :icon="getNodePalette(node.type).icon" />
                  </VAvatar>
                  <div class="flex-grow-1">
                    <p
                      class="text-sm font-weight-medium mb-0 text-h6 text-black"
                    >
                      {{ node.label }}
                    </p>
                    <p class="text-xs text-medium-emphasis mb-0 text-black">
                      {{ getNodeDescription(node) }}
                    </p>
                  </div>
                </div>

                <!-- Conteúdo específico do nó -->
                <div class="px-3 pb-3">
                  <div v-if="node.type === 'send_whatsapp'" class="text-xs">
                    <div class="bg-white rounded pa-2 border">
                      <div
                        class="text-caption text-medium-emphasis mb-1 text-disabled text-black"
                      >
                        Preview:
                      </div>
                      <VCard
                        color="#fff"
                        rounded="0"
                        class="pa-3"
                        variant="flat"
                      >
                        <div
                          class="html-content"
                          style="max-height: 100px; overflow-y: auto"
                          v-html="node.config?.content || 'Mensagem...'"
                        ></div>
                      </VCard>
                    </div>
                  </div>

                  <div v-else-if="node.type === 'send_email'" class="text-xs">
                    <div class="bg-white rounded pa-2 border">
                      <div
                        class="text-caption text-medium-emphasis mb-1 text-disabled text-black"
                      >
                        Preview:
                      </div>
                      <VCard
                        color="#fff"
                        rounded="0"
                        class="pa-3"
                        variant="flat"
                      >
                        <div
                          class="html-content"
                          style="max-height: 100px; overflow-y: auto"
                          v-html="node.config?.content?.html || 'Mensagem...'"
                        ></div>
                      </VCard>
                    </div>
                  </div>

                  <div v-else-if="node.type === 'send_ai'" class="text-xs">
                    <div
                      class="text-caption text-medium-emphasis mb-1 text-disabled text-black"
                    >
                      Instruções para a IA
                    </div>
                    <VCard color="#fff" rounded="0" class="pa-3" variant="flat">
                      <p class="text-truncate mb-0">
                        {{ node.config?.instructions || "Instruções..." }}
                      </p>
                    </VCard>
                  </div>

                  <div v-else-if="node.type === 'http'" class="text-xs">
                    <VChip
                      size="x-small"
                      :color="getHttpMethodColor(node.config?.method)"
                      class="mr-1"
                    >
                      {{ node.config?.method || "GET" }}
                    </VChip>
                    <div class="text-truncate mt-1">
                      {{ node.config?.url || "URL..." }}
                    </div>
                  </div>

                  <div v-else-if="node.type === 'condition'" class="text-xs">
                    <div class="text-caption text-medium-emphasis">
                      Condições ({{ node.config?.conditions?.length || 0 }})
                    </div>
                    <div
                      v-if="node.config?.conditions?.length > 0"
                      class="text-truncate"
                    >
                      {{ node.config.conditions[0].field || "campo" }}
                      {{ node.config.conditions[0].operator || "op" }}
                      {{ node.config.conditions[0].value || "valor" }}
                      <span v-if="node.config.conditions.length > 1">
                        ... +{{ node.config.conditions.length - 1 }} mais
                      </span>
                    </div>
                    <div v-else class="text-truncate">
                      Nenhuma condição configurada
                    </div>
                  </div>

                  <div v-else-if="node.type === 'ia_decision'" class="text-xs">
                    <div class="text-caption text-medium-emphasis">
                      Decisão IA
                    </div>
                    <VCard color="#fff" rounded="0" class="pa-3" variant="flat">
                      <p class="text-truncate mb-0">
                        {{ node.config?.instructions || "Instruções..." }}
                      </p>
                    </VCard>
                  </div>

                  <div
                    v-else-if="node.type === 'create_agendamento'"
                    class="text-xs"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Criar Agendamento
                    </div>
                    <div class="text-truncate">
                      {{ node.config?.data || "Data" }} -
                      {{ node.config?.horaInicio || "Hora" }}
                    </div>
                  </div>

                  <div
                    v-else-if="node.type === 'create_negocio'"
                    class="text-xs"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Criar Negócio
                    </div>
                    <div class="text-truncate">
                      {{ node.config?.titulo || "Título..." }}
                    </div>
                  </div>

                  <div
                    v-else-if="node.type === 'atualizar_agendamento'"
                    class="text-xs"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Atualizar Agendamento
                    </div>
                    <div class="text-truncate">
                      ID: {{ node.config?.agendamentoId || "..." }}
                    </div>
                  </div>

                  <div
                    v-else-if="node.type === 'atualizar_cliente'"
                    class="text-xs"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Atualizar Cliente
                    </div>
                    <div class="text-truncate">
                      ID: {{ node.config?.clienteId || "..." }}
                    </div>
                  </div>

                  <div
                    v-else-if="node.type === 'ai_actions'"
                    class="text-xs"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Ações IA
                    </div>
                    <VCard color="#fff" rounded="0" class="pa-3" variant="flat">
                      <p class="text-truncate mb-0">
                        {{ node.config?.instructions || "Instruções..." }}
                      </p>
                    </VCard>
                  </div>

                  <div v-else-if="node.type === 'delay'" class="text-xs">
                    <div class="text-caption text-medium-emphasis">
                      Aguardar
                    </div>
                    <div>{{ node.config?.seconds || 0 }} segundos</div>
                  </div>

                  <div v-else-if="node.type === 'wait_reply'" class="text-xs">
                    <div class="text-caption text-medium-emphasis">
                      Aguardar Resposta
                    </div>
                    <div class="text-truncate">
                      {{ node.config?.timeoutSeconds || "∞" }}s timeout
                      <span v-if="node.config?.useAI" class="ml-2"> + IA </span>
                      <span
                        v-if="node.config?.variables?.length > 0"
                        class="ml-2"
                      >
                        + {{ node.config.variables.length }} var
                      </span>
                    </div>
                  </div>

                  <div
                    v-else-if="node.type === 'wait_reply_conditional'"
                    class="text-xs"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Aguardar Resposta Condicional
                    </div>
                    <div class="text-truncate">
                      {{ node.config?.timeoutSeconds || "∞" }}s timeout
                      <span v-if="node.config?.useAI" class="ml-2"> + IA </span>
                      <span
                        v-if="node.config?.variables?.length > 0"
                        class="ml-2"
                      >
                        + {{ node.config.variables.length }} var
                      </span>
                      <span
                        v-if="node.config?.conditions?.length > 0"
                        class="ml-2"
                      >
                        + {{ node.config.conditions.length }} cond
                      </span>
                    </div>
                  </div>


                  <div v-else-if="node.type === 'redirect_flow'" class="text-xs">
                    <div class="text-caption text-medium-emphasis">
                      Redirecionar Fluxo
                    </div>
                    <div class="text-truncate">
                      {{ node.config?.targetFlowId ? 'Fluxo selecionado' : 'Nenhum fluxo' }}
                    </div>
                  </div>
                </div>

                <!-- Conectores -->
                <!-- Conectores de entrada -->
                <div
                  class="connection-point connection-in position-absolute"
                  style="left: -8px; top: 50%; transform: translateY(-50%)"
                >
                  <div class="connection-dot">
                    <VIcon icon="tabler-arrows-move" size="12" />
                  </div>
                </div>

                <!-- Conectores de saída -->
                <template
                  v-if="
                    node.type === 'condition' ||
                    node.type === 'ia_decision' ||
                    node.type === 'wait_reply_conditional'
                  "
                >
                  <!-- Saída SIM -->
                  <div
                    class="connection-point connection-out position-absolute"
                    style="right: -8px; top: 40%; transform: translateY(-50%)"
                    @mousedown="(e) => startConnection(e, node.id, 'SIM')"
                  >
                    <div class="connection-dot connection-sim"></div>
                    <div class="connection-label">SIM</div>
                  </div>

                  <!-- Saída NÃO -->
                  <div
                    class="connection-point connection-out position-absolute"
                    style="right: -8px; top: 60%; transform: translateY(-50%)"
                    @mousedown="(e) => startConnection(e, node.id, 'NÃO')"
                  >
                    <div class="connection-dot connection-nao"></div>
                    <div class="connection-label">NÃO</div>
                  </div>

                  <!-- Saída Tempo Expirado -->
                  <div
                    v-if="node.type === 'wait_reply_conditional'"
                    class="connection-point connection-out position-absolute"
                    style="right: -8px; top: 80%; transform: translateY(-50%)"
                    @mousedown="
                      (e) => startConnection(e, node.id, 'Tempo Expirado')
                    "
                  >
                    <div class="connection-dot connection-nao"></div>
                    <div class="connection-label">Tempo Expirado</div>
                  </div>
                </template>

                <!-- Conector de saída padrão -->
                <template v-else-if="node.type !== 'redirect_flow' && node.type !== 'end'">
                  <div
                    class="connection-point connection-out position-absolute"
                    style="right: -8px; top: 50%; transform: translateY(-50%)"
                    @mousedown="(e) => startConnection(e, node.id)"
                  >
                    <div class="connection-dot"></div>
                  </div>

                   
                  <!-- Saída Tempo Expirado -->
                  <div
                    v-if="node.type === 'wait_reply'"
                    class="connection-point connection-out position-absolute"
                    style="right: -8px; top: 80%; transform: translateY(-50%)"
                    @mousedown="
                      (e) => startConnection(e, node.id, 'Tempo Expirado')
                    "
                  >
                    <div class="connection-dot connection-nao"></div>
                    <div class="connection-label">Tempo Expirado</div>
                  </div>
                </template>
              </div>
              </div>
            </div>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
    
    <!-- Menu de contexto para conexões -->
    <VMenu
      v-model="edgeMenu.show"
      :location="`${edgeMenu.x}px ${edgeMenu.y}px`"
      @update:model-value="hideEdgeMenu"
    >
      <VList density="compact">
        <VListItem @click="confirmRemoveEdge">
          <VIcon icon="tabler-trash" class="me-2" color="error" />
          Remover Conexão
        </VListItem>
        <VListItem @click="hideEdgeMenu">
          <VIcon icon="tabler-x" class="me-2" />
          Cancelar
        </VListItem>
      </VList>
    </VMenu>
  </VDialog>
</template>

<style scoped>
.connection-point {
  width: 16px;
  height: 16px;
  cursor: pointer;
  z-index: 5;
}

.connection-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #5c6ac4;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  color: #fff !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.connection-point:hover .connection-dot {
  background: #4c5ac4;
  transform: scale(1.2);
}

.connection-out .connection-dot {
  background: #5c6ac4;
}

.connection-in .connection-dot {
  background: #28a745;
}

.connection-sim {
  background: #28a745 !important;
}

.connection-nao {
  background: #dc3545 !important;
}

.connection-label {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: bold;
  color: #666;
  pointer-events: none;
  white-space: nowrap;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-grabbing {
  cursor: grabbing;
}

.cursor-grab {
  cursor: grab;
}

/* Estilo para quando está arrastando */
.dragging {
  transform: rotate(2deg);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

/* Impedir seleção de texto durante o drag */
.no-select {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Estilo para o canvas quando está em modo pan */
.canvas-panning {
  cursor: grabbing !important;
}
</style>
