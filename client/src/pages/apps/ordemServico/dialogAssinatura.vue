<script setup>
import Vue3DraggableResizable from "vue3-draggable-resizable";
import "vue3-draggable-resizable/dist/Vue3DraggableResizable.css";

const isMobile = window.innerWidth < 768;

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker?worker&url";
GlobalWorkerOptions.workerSrc = workerSrc;

defineExpose({ Vue3DraggableResizable });

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
    default: false,
  },
  ordemServico: {
    type: Object,
    required: true,
    default: () => ({}),
  },
  agendamentoData: {
    type: Object,
    required: true,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:isDrawerOpen", "updateOrdem"]);

const handleDrawerModelValueUpdate = (val) => {
  emit("update:isDrawerOpen", val);
  if (!val) {
    clearSignatureCanvas();
    box.value = {
      x: 150,
      y: 50,
      w: 265,
      h: 85,
    };

    loadingAssinar.value = false;
    signatureData.value = null;
    blobSignature.value = null;
    stepDigital.value = 1;
    clearSignatureCanvas();
    box.value = {
      x: 150,
      y: 50,
      w: 265,
      h: 85,
    };
  }
};

const closeNavigationDrawer = () => {
  handleDrawerModelValueUpdate(false);
};

const { setAlert } = useAlert();
const router = useRouter();
const userData = useCookie("userData").value;

const loadingAssinar = ref(false);
const doc = ref(null);

watch(
  () => props.ordemServico,
  (newValue) => {
    if (newValue) {
      doc.value = newValue;
    }
  },
  { immediate: true }
);

watch(() => props.isDrawerOpen, async (newValue) => {
  if (newValue) {
    console.log("Inicializando canvas de assinatura 1");
    await nextTick();
    initSignatureCanvas(); // Inicializa o canvas de assinatura
  }
}, { immediate: true });

if (props.ordemServico) {
  doc.value = props.ordemServico;
}
const box = reactive({
  x: 150, // posição inicial em px
  y: 50,
  w: 265, // tamanho inicial em px
  h: 85,
});

// Refs para PDF.js e visualização
const pdfDoc = ref(null);
const totalPages = ref(0);
const pagesArray = ref([]); // Array para iterar as páginas
const pdfViewerRef = ref(null); // Container que receberá as páginas renderizadas
const scale = ref(1);
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
function clamp(v) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
}

// Usaremos um objeto para armazenar as referências aos canvases dos PDFs
const pageCanvases = {};
const renderizando = ref(false);
const renderizado = ref(false); // Estado para controlar se o PDF já foi renderizado
// Ref para o canvas de assinatura que ficará sobre a última página
const signatureCanvas = ref(null);
const blobSignature = ref(null); // Blob da assinatura (será obtido a partir do canvas de assinatura)

// Estado para a assinatura digital
const isDrawing = ref(false);
const signatureData = ref(null); // DataURL da assinatura (será obtida a partir do canvas de assinatura)
let ctxSignature = null; // Contexto do canvas de assinatura

// Variáveis para armazenar a bounding box da assinatura (posição desenhada na última página)
let minX = Infinity,
  minY = Infinity,
  maxX = -Infinity,
  maxY = -Infinity;

function initSignatureCanvas() {
  try {
    const canvas = signatureCanvas.value;
    const dpr = window.devicePixelRatio || 1;

    // largura/altura *visuais* (CSS) que o canvas ganhou no layout
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;

    // define atributos reais (back-store) em pixels físicos
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;

    // normaliza o contexto para o DPR
    ctxSignature = canvas.getContext("2d");
    ctxSignature.scale(dpr, dpr);
    ctxSignature.lineWidth = 2;
    ctxSignature.lineCap = "round";
    ctxSignature.strokeStyle = "#000";

    // zera canvas
    ctxSignature.clearRect(0, 0, canvas.width, canvas.height);
  } catch (error) {
    console.error("Erro ao inicializar o canvas de assinatura:", error);
  }
}

// ---------------------
// Funções para desenhar a assinatura na camada sobreposta
// ---------------------
function getSignaturePos(e) {
  const canvas = signatureCanvas.value;
  const rect = canvas.getBoundingClientRect();

  // usa clientX/clientY para mouse ou touches
  const clientX = e.touches?.[0]?.clientX ?? e.clientX;
  const clientY = e.touches?.[0]?.clientY ?? e.clientY;

  // como agora canvas.width/height == rect.width/height (DPR já aplicado),
  // basta subtrair left/top
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

/* ---------- desenho ---------- */
function startDrawing(e) {
  isDrawing.value = true;
  [minX, minY] = [Infinity, Infinity];
  [maxX, maxY] = [-Infinity, -Infinity];

  const { x, y } = getSignaturePos(e);
  ctxSignature.beginPath();
  ctxSignature.moveTo(x, y);

  minX = maxX = x;
  minY = maxY = y;
}

function draw(e) {
  if (!isDrawing.value) return;
  const { x, y } = getSignaturePos(e);
  ctxSignature.lineTo(x, y);
  ctxSignature.stroke();

  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
}

function stopDrawing() {
  if (!isDrawing.value || !ctxSignature) return;
  isDrawing.value = false;
  ctxSignature.closePath();

  // Salva a assinatura como DataURL
  blobSignature.value = signatureCanvas.value.toDataURL("image/png");
}

// Limpa somente o canvas de assinatura (última página)
function clearSignatureCanvas() {
  if (!signatureCanvas.value) return;
  ctxSignature.clearRect(
    0,
    0,
    signatureCanvas.value.width,
    signatureCanvas.value.height
  );
  signatureData.value = null;
  blobSignature.value = null;
  stepDigital.value = 1; // Reseta a etapa do processo de assinatura digital
  // Reseta a bounding box
  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;
}
// Função para armazenar as referências dos canvases das páginas
const storePageCanvas = (page, el) => {
  if (el) {
    pageCanvases[page] = el;
  }
};

const getNormalizedCoords = () => {
  const canvas = pageCanvases[totalPages.value];
  if (!canvas) return null;

  // usamos o retângulo *visível* (CSS-pixels) do canvas
  const {
    left,
    top,
    width: cssW,
    height: cssH,
  } = canvas.getBoundingClientRect();

  console.log("x original:", box.x, "x - 145:", box.x - 145);
  // posição e tamanho da caixa em CSS-pixels
  const xCss = box.x; // já vem em CSS-px
  const yCss = box.y;
  const wCss = box.w;
  const hCss = box.h;

  // frações independentes de scale / DPR
  return {
    page: totalPages.value,
    xNorm: xCss / cssW,
    yNorm: yCss / cssH,
    wNorm: wCss / cssW,
    hNorm: hCss / cssH,
  };
};

async function renderAllPages() {
  if (!pdfDoc.value) return;
  if (renderizando.value) return; // Evita renderizar múltiplas vezes

  renderizando.value = true;
  renderizado.value = false; // Reseta o estado de renderização
  for (let i = 1; i <= totalPages.value; i++) {
    const page = await pdfDoc.value.getPage(i);
    const canvasEl = pageCanvases[i];
    if (!canvasEl) continue;

    const divCtxSign = document.querySelector(`#page-doc-${i}-signature`);

    const context = canvasEl.getContext("2d");
    // usa scale dinâmico
    const viewport = page.getViewport({ scale: scale.value });
    // alta resolução em retina/HDPI
    const outputScale = window.devicePixelRatio || 1;
    canvasEl.width = viewport.width * outputScale;
    canvasEl.height = viewport.height * outputScale;
    canvasEl.style.width = `${viewport.width}px`;
    canvasEl.style.height = `${viewport.height}px`;

    //Se existir divCtxSign, coloca a larga e altura do canvas
    if (divCtxSign) {
      divCtxSign.style.width = `${viewport.width}px`;
      divCtxSign.style.height = `${viewport.height}px`;
    }
    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    await page.render({ canvasContext: context, viewport, transform }).promise;
  }

  renderizando.value = false;
  renderizado.value = true; // Marca como renderizado
}

const renderPDF = async () => {
  if (!doc.value?.assinaturaData?.filePdf?.url) return;

  const loadingTask = getDocument({
    url: doc.value.assinaturaData.filePdf.url,
  });
  const rawPdfDoc = await loadingTask.promise;
  pdfDoc.value = markRaw(rawPdfDoc);
  totalPages.value = pdfDoc.value.numPages;
  pagesArray.value = Array.from({ length: totalPages.value }, (_, i) => i + 1);
  await nextTick();
  // renderiza pela primeira vez com scale=1
  await renderAllPages();
};

watch(scale, async (oldValue, newValue) => {
  console.log("Scale changed from", oldValue, "to", newValue);
  // só re-renderiza se já carregou o PDF
  console.log("Scale changed, re-rendering PDF with scale:", scale.value);
  if (pdfDoc.value) renderAllPages();
});

const stepDigital = ref(1); // Etapa atual do processo de assinatura digital

const nextStepDigital = () => {
  if (stepDigital.value < 2) {
    stepDigital.value++;

    if (stepDigital.value == 1) {
      nextTick(() => {
        console.log("Inicializando canvas de assinatura 2");
        initSignatureCanvas(); // Inicializa o canvas de assinatura
      });
    } else {
      nextTick(() => {
        renderPDF();
      });
    }
  } else {
    // Se já estiver na última etapa, assina
    assinarDigitalmente();
  }
};

// ---------------------
// Enviar a assinatura para o backend
// ---------------------
const assinarDigitalmente = async () => {
  const assinaturaBlob = blobSignature.value;

  if (!assinaturaBlob) {
    setAlert(
      "Desenhe sua assinatura antes de enviar!",
      "error",
      "tabler-alert-circle",
      5000
    );
    return;
  }

  try {
    loadingAssinar.value = true;
    const coords = getNormalizedCoords();
    if (!coords) return;

    // 1) converte a assinatura para Blob pela url do canvas
    const croppedBlob = await fetch(assinaturaBlob);
    const blob = await croppedBlob.blob();
    // 2) cria um objeto File a partir do Blob
    const fileAssinatura = new File([blob], "assinatura.png", {
      type: "image/png",
    });

    if (!fileAssinatura) {
      setAlert(
        "Erro ao criar arquivo de assinatura",
        "error",
        "tabler-alert-circle",
        5000
      );
      return;
    }

    // 5) monta FormData e envia
    const formData = new FormData();
    formData.append("assinatura", fileAssinatura);
    formData.append("assinaturaCoordinates", JSON.stringify(coords));

    const res = await $api(`/ordem-servico/assinar/${props.agendamentoData.age_id}`, {
      method: "POST",
      body: formData,
    });
    if (!res) return;
    setAlert(
      "Documento assinado com sucesso!",
      "success",
      "tabler-check",
      5000
    );
    clearSignatureCanvas();
    emit("updateOrdem");
    closeNavigationDrawer();
  } catch (err) {
    console.error("Erro ao assinar doc:", err.response || err);
    setAlert(
      err?.response?._data?.message || "Erro ao assinar documento",
      "error",
      "tabler-alert-circle",
      5000
    );
  }
  loadingAssinar.value = false;
};

function updateBox(newProps) {
  // newProps tem { x, y, w, h } em px relativos ao container
  box.x = newProps.x || box.x;
  box.y = newProps.y || box.y;
}
</script>

<template>
  <!-- Diálogo para assinatura -->
  <VDialog
    fullscreen
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
    v-if="doc"
    persistent
  >
    <VCard rounded="0">
      <VCardText
        class="d-flex flex-column justify-center"
        :style="
          !isMobile
            ? 'max-width: 1000px; min-width: 1000px; margin: 0 auto'
            : ''
        "
      >
        <h4 class="text-center text-h6 mb-4">
          Assinar Documento<br />
          <span style="max-width: 400px">
            {{ doc?.filename ? doc.filename : "" }}
          </span>
        </h4>

        <!-- Se optou pela assinatura digital, renderiza o PDF com visualização scrollável -->
        <div>
          <div v-if="stepDigital <= 1">
            <p class="mb-3 text-center">Faça sua assinatura na área abaixo.</p>

            <div class="d-flex flex-column align-center justify-center">
              <canvas
                ref="signatureCanvas"
                id="signatureCanvas"
                class="signature-overlay elevation-2 rounded"
                style="
                  width: 100%;
                  max-width: 600px;
                  height: 250px;
                  touch-action: none;
                  border: 1px solid #ccc;
                "
                @mousedown="startDrawing"
                @mousemove="draw"
                @mouseup="stopDrawing"
                @mouseleave="stopDrawing"
                @touchstart.prevent="startDrawing"
                @touchmove.prevent="draw"
                @touchend.prevent="stopDrawing"
              ></canvas>
            </div>
          </div>

          <div v-else>
            <p class="mb-3 text-center">
              Arraste e posicione a área da assinatura na última página do PDF:
            </p>

            <div
              class="pdf-btns d-flex flex-row align-center justify-center mb-3"
            >
              <div
                class="rounded-pill elevation-2 d-flex flex-row align-center justify-center"
              >
                <IconBtn
                  color="primary"
                  @click="scale = clamp(scale - 0.5)"
                  :disabled="scale <= MIN_SCALE || renderizando"
                >
                  <VIcon icon="tabler-minus" size="20" />
                </IconBtn>
                <span class="mx-2">{{ (scale * 100).toFixed(0) }}%</span>
                <IconBtn
                  color="primary"
                  @click="scale = clamp(scale + 0.5)"
                  :disabled="scale >= MAX_SCALE || renderizando"
                >
                  <VIcon icon="tabler-plus" size="20" />
                </IconBtn>
              </div>
            </div>

            <div
              class="pdf-viewer-container border rounded position-relative"
              ref="pdfViewerRef"
              style="height: 450px; overflow: auto"
            >
              <!-- Itera para renderizar todas as páginas -->
              <div
                v-for="page in pagesArray"
                :key="page"
                class="pdf-page-container position-relative mb-3"
                :style="`
                      display: flex;
                      justify-content: ${isMobile ? 'start' : 'center'};
                      position: relative;
                  `"
                :id="`page-doc-${page}`"
              >
                <!-- Canvas onde o PDF é renderizado -->
                <canvas :ref="(el) => storePageCanvas(page, el)"> </canvas>

                <!-- caixinha só na última página -->
                <div
                  :id="`page-doc-${page}-signature`"
                  class="position-absolute"
                >
                  <vue3-draggable-resizable
                    v-if="page === totalPages && renderizado"
                    v-model:x="box.x"
                    v-model:y="box.y"
                    v-model:w="box.w"
                    v-model:h="box.h"
                    :initW="235"
                    :initH="85"
                    :resizable="true"
                    :lockAspectRatio="true"
                    :parent="true"
                    @resizing="updateBox"
                    @dragging="updateBox"
                    :handles="['tl', 'tr', 'bl', 'br']"
                    class="signature-box-digital"
                  >
                    <div
                      style="width: 100%; height: 100%; pointer-events: none"
                      class="d-flex justify-center align-center flex-column"
                    >
                      <VImg
                        :src="blobSignature"
                        class="signature-preview"
                        style="width: 100%; height: 100%"
                      />
                    </div>
                  </vue3-draggable-resizable>
                </div>
              </div>
            </div>
          </div>

          <VRow class="my-3 justify-center">
            <VCol cols="12" md="6" v-if="stepDigital == 1">
              <VBtn
                color="primary"
                variant="outlined"
                @click="clearSignatureCanvas"
                class="btn-padrao w-100"
                :disabled="loadingAssinar"
              >
                <VIcon icon="tabler-x" class="mr-2" />
                Limpar Assinatura
              </VBtn>
            </VCol>
            <VCol cols="12" md="6">
              <VBtn
                color="primary"
                @click="nextStepDigital()"
                class="btn-padrao w-100"
                :loading="loadingAssinar"
              >
                <VIcon icon="tabler-check" class="mr-2" />
                {{ stepDigital == 1 ? "Avançar" : "Assinar" }}
              </VBtn>
            </VCol>
          </VRow>
        </div>

        <VBtn
          color="primary"
          variant="text"
          @click="stepDigital > 1 ? (stepDigital = 0, nextStepDigital()) : closeNavigationDrawer()"
          
          class="w-100"
        >
          <VIcon icon="tabler-arrow-back" class="mr-2" />
          Voltar
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
/* Para evitar o scroll do navegador durante a assinatura em touch devices */
/* canvas {
    touch-action: none;
  }*/

.signature-box {
  box-shadow: rgb(255, 153, 0) 0px 0px 10px 0px;
  background-color: rgb(255, 255, 255);
  overflow: hidden;
  text-align: center;
  z-index: 9999999;
  cursor: move;
  border: 1px dashed rgb(150, 150, 150) !important;
  color: black;
}

.signature-box-digital {
  box-shadow: rgb(255, 153, 0) 0px 0px 10px 0px;
  overflow: hidden;
  text-align: center;
  z-index: 9999999;
  cursor: move;
  border: 1px dashed rgb(150, 150, 150) !important;
  color: black;
}
/* Estilo opcional para o container do PDF */
.pdf-viewer-container {
  background: #f9f9f9;
  padding: 10px;
}

/* Os canvases do PDF e a camada de assinatura se ajustarão conforme o conteúdo */
.pdf-page-container {
  position: relative;
  display: flex;
  justify-content: center;
}

/*
  * Mobile
  */
@media (max-width: 600px) {
  .pdf-viewer-container {
    height: 400px;
  }
  .pdf-page-container {
    padding-left: 10px;
  }
}
</style>
