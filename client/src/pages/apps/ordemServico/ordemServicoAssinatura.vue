<script setup>
import { temaAtual } from "@core/stores/config";
import moment from "moment";
import { useConfirm } from "@/utils/confirm.js";
import { useFunctions } from "@/composables/useFunctions";
const { escreverEndereco, debounce } = useFunctions();

import AssinaturaDialog from "./dialogAssinatura.vue";

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker?worker&url";
GlobalWorkerOptions.workerSrc = workerSrc;

const route = useRoute();
const router = useRouter();
const { setAlert } = useAlert();

const age_id = route.params.age_id;

if (!age_id) {
  setAlert(
    "Ordem de Serviço não encontrada",
    "error",
    "tabler-alert-triangle",
    8000
  );
  router.push("/");
}

const loading = ref(true);
const agendamento = ref(null);
const ordemServico = ref(null);

const userData = useCookie("userData").value;
const isMobile = window.innerWidth < 768;

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
const pageInitiCanvases = {};
const renderizando = ref(false);

const viewDialogAssinar = ref(false);

const getOrdemServico = async () => {
  try {
    const response = await $api(`/ordem-servico/${age_id}`);

    if (
      !response ||
      !response.age_ordemServico ||
      !response.age_ordemServico.assinaturaData
    )
      throw new Error("Erro ao obter ordem de serviço");

    console.log("Agendamento: ", response);
    console.log("Ordem de Serviço: ", response.age_ordemServico);

    agendamento.value = response;
    ordemServico.value = response.age_ordemServico;

    renderPDF();
  } catch (error) {
    console.error(error, error.response);

    setAlert(
      error.response?.data?.message || "Erro ao obter ordem de serviço",
      "error",
      "tabler-alert-triangle",
      8000
    );
    router.push("/");
  } finally {
    loading.value = false;
  }
};

async function renderAllPages() {
  if (!pdfDoc.value) return;
  if (renderizando.value) return; // Evita renderizar múltiplas vezes

  renderizando.value = true;

  for (let i = 1; i <= totalPages.value; i++) {
    const page = await pdfDoc.value.getPage(i);
    const canvasEl = pageInitiCanvases[i];
    if (!canvasEl) continue;

    const context = canvasEl.getContext("2d");
    // usa scale dinâmico
    const viewport = page.getViewport({ scale: scale.value });
    // alta resolução em retina/HDPI
    const outputScale = window.devicePixelRatio || 1;
    canvasEl.width = viewport.width * outputScale;
    canvasEl.height = viewport.height * outputScale;
    canvasEl.style.width = `${viewport.width}px`;
    canvasEl.style.height = `${viewport.height}px`;

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    await page.render({ canvasContext: context, viewport, transform }).promise;
  }

  renderizando.value = false;
}

const renderPDF = async () => {
  if (!ordemServico.value?.assinaturaData?.filePdf?.url) return;

  const loadingTask = getDocument({
    url: ordemServico.value.assinaturaData.filePdf.url,
  });
  const rawPdfDoc = await loadingTask.promise;
  pdfDoc.value = markRaw(rawPdfDoc);
  totalPages.value = pdfDoc.value.numPages;
  pagesArray.value = Array.from({ length: totalPages.value }, (_, i) => i + 1);
  await nextTick();
  // renderiza pela primeira vez com scale=1
  await renderAllPages();
};

watch(scale, () => {
  // só re-renderiza se já carregou o PDF
  console.log("Scale changed, re-rendering PDF with scale:", scale.value);
  if (pdfDoc.value) renderAllPages();
});

// Função para armazenar as referências dos canvases das páginas
const storePageCanvas = (page, el) => {
  if (el) {
    pageInitiCanvases[page] = el;
  }
};

const urlApp = import.meta.env.VITE_APP_URL;

const downloadAnexo = () => {
  const url = ordemServico.value?.assinaturaData?.filePdf?.url;
  if (!url) return;
  window.open(url, "_blank");
};

const copyAnexo = () => {
  const url = ordemServico.value?.assinaturaData?.filePdf?.url;
  if (!url) return;
  return copyLink(url);
};

await getOrdemServico();

const copyLink = (link) => {
  navigator.clipboard.writeText(urlApp + link).then(() => {
    setAlert("Link copiado com sucesso!", "success", "tabler-check", 5000);
  });
};
</script>
<template>
  <v-skeleton-loader type="article" v-if="loading"></v-skeleton-loader>

  <div v-else>
    <VCard class="my-4 mx-auto" max-width="1200">
      <VCardText>
        <div>
          <h3 class="text-center text-h6">
            Documento
            {{
              ordemServico?.assinaturaData?.filePdf?.fileName ??
              "Ordem de Serviço"
            }}
          </h3>
        </div>

        <VCard
        v-if="(ordemServico?.assinaturaData?.assinaturasDatas?.length > 0) && !loading"
        class="mt-4 mb-6 mx-auto"
        max-width="400"
        @click="ordemServico.viewAssinaturas = !ordemServico.viewAssinaturas"
      >
        <VCardText class="py-2">
          <p class="mb-0 text-center text-success">
            Este documento possuí
            {{ ordemServico?.assinaturaData?.assinaturasDatas?.length || 0 }} assinatura(s)

            <VIcon
              :icon="
              ordemServico.viewAssinaturas
                  ? 'tabler-chevron-up'
                  : 'tabler-chevron-down'
              "
              class="ml-2"
            />
          </p>

          <div v-if="ordemServico.viewAssinaturas" class="mt-2">
            <p class="mb-1 text-center text-caption" v-for="assinatura in ordemServico?.assinaturaData?.assinaturasDatas" :key="assinatura">
             Assinado em {{ assinatura }}
            </p>
          </div>
        </VCardText>
      </VCard>

        <div class="d-flex flex-row align-center py-1 gap-3 justify-center my-3">
          <VBtn
            color="primary"
            @click="downloadAnexo()"
            size="small"
            v-if="!isMobile"
          >
            <VIcon icon="tabler-download" class="mr-2" />
            Baixar arquivo
          </VBtn>

          <IconBtn
            @click="downloadAnexo()"
            color="primary"
            variant="flat"
            v-if="isMobile"
            size="45"
          >
            <VIcon icon="tabler-download" />
          </IconBtn>

          <VBtn
            color="primary"
            variant="outlined"
            @click="copyAnexo()"
            v-if="!isMobile"
          >
            <VIcon icon="tabler-copy" class="mr-2" />
            Copiar link
          </VBtn>

          <IconBtn
            @click="copyAnexo()"
            color="primary"
            variant="outlined"
            v-if="isMobile"
            size="45"
          >
            <VIcon icon="tabler-copy" />
          </IconBtn>

          <VBtn
            color="primary"
            variant="tonal"
            @click="viewDialogAssinar = true"
            v-if="!isMobile"
          >
            <VIcon icon="tabler-signature" class="mr-2" />
            Assinar documento
          </VBtn>

          <IconBtn
            @click="viewDialogAssinar = true"
            color="primary"
            variant="tonal"
            v-if="isMobile"
            size="45"
          >
            <VIcon icon="tabler-signature" />
          </IconBtn>
        </div>

        <div>
          <p class="mb-2 text-center text-caption">
            Mova para as laterais ou verticalmente para visualizar o documento
            completo.
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
            style="height: 550px; overflow: auto"
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
              <canvas :ref="(el) => storePageCanvas(page, el)"></canvas>
            </div>
          </div>
        </div>
      </VCardText>
    </VCard>

    <AssinaturaDialog
      v-model:isDrawerOpen="viewDialogAssinar"
      :ordemServico="ordemServico"
      :agendamentoData="agendamento"
      @updateOrdem="getOrdemServico()"
    />
  </div>
</template>

<style scoped>
/* Estilo opcional para o container do PDF */
.pdf-viewer-container {
  background: #d3d3d3;
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

.pdf-btns {
  position: sticky;
  top: 10px;
  left: 45%;
  z-index: 9;
}
</style>
