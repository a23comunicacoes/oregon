<script setup>
import { ref, computed, onMounted } from "vue";
import moment from "moment";

const { setAlert } = useAlert();

const loading = ref(false);

// Formatar valor
const formatValor = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Formatar data
const formatDate = (date) => {
  if (!date) return null;
  const data = new Date(date);
  const dia = data.getDate().toString().padStart(2, "0");
  const mes = (data.getMonth() + 1).toString().padStart(2, "0");
  const ano = data.getFullYear();
  return `${ano}-${mes}-${dia}`;
};

// Datas padrão (mês atual)
let mesAtual = new Date().getMonth() + 1;
let anoAtual = new Date().getFullYear();

const dataDe = ref(formatDate(`${anoAtual}-${mesAtual}-01`));
const dataAte = ref(
  formatDate(
    `${anoAtual}-${mesAtual}-${new Date(anoAtual, mesAtual, 0).getDate()}`
  )
);

const relatorios = ref(null);

// Buscar relatórios
const getRelatorios = async () => {
  if (dataAte.value < dataDe.value) {
    return setAlert(
      "A data de início não pode ser maior que a data final.",
      "error",
      "tabler-alert-triangle",
      5000
    );
  }

  loading.value = true;
  try {
    const res = await $api("/relatorios/get/crm", {
      query: {
        dataDe: dataDe.value,
        dataAte: dataAte.value,
      },
    });

    if (!res) return;

    console.log("Relatórios CRM:", res);
    relatorios.value = res;
  } catch (error) {
    console.error("Erro ao buscar relatórios:", error);
    setAlert(
      "Erro ao buscar relatórios de CRM",
      "error",
      "tabler-alert-triangle",
      5000
    );
    relatorios.value = null;
  }

  loading.value = false;
};

// Computed properties
const estatisticas = computed(() => relatorios.value?.estatisticas || {});
const dadosPorEtapa = computed(() => relatorios.value?.dadosPorEtapa || []);
const negociosPorDia = computed(() => relatorios.value?.negociosPorDia || []);
const top10Negocios = computed(() => relatorios.value?.top10Negocios || []);
const tempoMedioPorEtapa = computed(() => relatorios.value?.tempoMedioPorEtapa || []);
const motivosPerda = computed(() => relatorios.value?.motivosPerda || []);

// Atalhos de período
const setPeriodo = (tipo) => {
  const hoje = new Date();

  switch (tipo) {
    case "hoje":
      dataDe.value = formatDate(hoje);
      dataAte.value = formatDate(hoje);
      break;
    case "semana":
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      dataDe.value = formatDate(inicioSemana);
      dataAte.value = formatDate(hoje);
      break;
    case "mes":
      dataDe.value = formatDate(
        new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      );
      dataAte.value = formatDate(
        new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      );
      break;
    case "trimestre":
      const mesAtualNum = hoje.getMonth();
      const inicioTrimestre = Math.floor(mesAtualNum / 3) * 3;
      dataDe.value = formatDate(
        new Date(hoje.getFullYear(), inicioTrimestre, 1)
      );
      dataAte.value = formatDate(hoje);
      break;
    case "ano":
      dataDe.value = formatDate(new Date(hoje.getFullYear(), 0, 1));
      dataAte.value = formatDate(new Date(hoje.getFullYear(), 11, 31));
      break;
  }

  getRelatorios();
};

onMounted(() => {
  getRelatorios();
});
</script>

<template>
  <div>
    <!-- Dialog de Loading -->
    <VDialog v-model="loading" persistent max-width="500">
      <VCard>
        <VCardText class="text-center pa-8">
          <VProgressCircular indeterminate color="primary" size="64" />
          <p class="mt-4 mb-0">Carregando relatórios de CRM...</p>
        </VCardText>
      </VCard>
    </VDialog>

    <h2 class="text-h4 mb-2">Relatórios de CRM</h2>
    <p class="text-sm text-disabled mb-6">
      Análise completa dos negócios e funil de vendas
    </p>

    <!-- Filtros de Período -->
    <VCard class="mb-6">
      <VCardText>
        <VRow class="align-center">
          <VCol cols="12" md="3">
            <h4 class="mb-0">Filtros de Período</h4>
            <p class="text-sm text-disabled mb-0">Selecione o período desejado</p>
          </VCol>

          <VCol cols="12" md="9">
            <VRow class="align-end">
              <!-- Datas customizadas -->
              <VCol cols="12" sm="4">
                <AppTextField
                  v-model="dataDe"
                  type="date"
                  label="Data Inicial"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" sm="4">
                <AppTextField
                  v-model="dataAte"
                  type="date"
                  label="Data Final"
                  :disabled="loading"
                />
              </VCol>

              <VCol cols="12" sm="4">
                <VBtn
                  color="primary"
                  @click="getRelatorios"
                  :loading="loading"
                  block
                >
                  <VIcon icon="tabler-search" class="mr-1" />
                  Filtrar
                </VBtn>
              </VCol>

              <!-- Atalhos -->
              <VCol cols="12" class="py-0">
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <VBtn
                    size="small"
                    variant="tonal"
                    @click="setPeriodo('hoje')"
                    style="height: 30px"
                  >
                    Hoje
                  </VBtn>

                  <VBtn
                    size="small"
                    variant="tonal"
                    @click="setPeriodo('semana')"
                    style="height: 30px"
                  >
                    Esta Semana
                  </VBtn>

                  <VBtn
                    size="small"
                    variant="tonal"
                    @click="setPeriodo('mes')"
                    style="height: 30px"
                  >
                    Este Mês
                  </VBtn>

                  <VBtn
                    size="small"
                    variant="tonal"
                    @click="setPeriodo('trimestre')"
                    style="height: 30px"
                  >
                    Este Trimestre
                  </VBtn>

                  <VBtn
                    size="small"
                    variant="tonal"
                    @click="setPeriodo('ano')"
                    style="height: 30px"
                  >
                    Este Ano
                  </VBtn>
                </div>
              </VCol>
            </VRow>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <div v-if="relatorios">
      <!-- Cards de Estatísticas Gerais -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Total de Negócios</p>
                  <h3 class="text-h3 mb-0">{{ estatisticas.totalNegocios || 0 }}</h3>
                </div>
                <VAvatar color="primary" variant="tonal" size="42">
                  <VIcon icon="tabler-briefcase" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Valor Total</p>
                  <h3 class="text-h3 mb-0">{{ formatValor(estatisticas.valorTotalNegocios) }}</h3>
                </div>
                <VAvatar color="success" variant="tonal" size="42">
                  <VIcon icon="tabler-currency-dollar" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Taxa de Aprovação</p>
                  <h3 class="text-h3 mb-0">{{ estatisticas.taxaAprovacao || 0 }}%</h3>
                </div>
                <VAvatar color="success" variant="tonal" size="42">
                  <VIcon icon="tabler-chart-line" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Negócios Ganhos</p>
                  <h3 class="text-h3 mb-0 text-success">{{ estatisticas.negociosGanhos || 0 }}</h3>
                </div>
                <VAvatar color="success" variant="tonal" size="42">
                  <VIcon icon="tabler-trophy" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Segunda linha de cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Valor Ganho</p>
                  <h4 class="text-h4 mb-0 text-success">{{ formatValor(estatisticas.valorGanho) }}</h4>
                </div>
                <VAvatar color="success" variant="tonal" size="42">
                  <VIcon icon="tabler-coin" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Negócios Pendentes</p>
                  <h4 class="text-h4 mb-0 text-warning">{{ estatisticas.negociosPendentes || 0 }}</h4>
                </div>
                <VAvatar color="warning" variant="tonal" size="42">
                  <VIcon icon="tabler-clock" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Valor Pendente</p>
                  <h4 class="text-h4 mb-0 text-warning">{{ formatValor(estatisticas.valorPendente) }}</h4>
                </div>
                <VAvatar color="warning" variant="tonal" size="42">
                  <VIcon icon="tabler-hourglass" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Negócios Perdidos</p>
                  <h4 class="text-h4 mb-0 text-error">{{ estatisticas.negociosPerdidos || 0 }}</h4>
                </div>
                <VAvatar color="error" variant="tonal" size="42">
                  <VIcon icon="tabler-x" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Dados por Etapa do Funil -->
      <VRow class="mb-6">
        <VCol cols="12" md="12">
          <VCard>
            <VCardText>
              <h5 class="text-h5 mb-4">Negócios por Etapa do Funil</h5>
              <VTable>
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Probabilidade</th>
                    <th>Quantidade</th>
                    <th>Valor Total</th>
                    <th>Percentual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="etapa in dadosPorEtapa" :key="etapa.etapaId">
                    <td>{{ etapa.etapaNome }}</td>
                    <td>{{ etapa.probabilidade }}%</td>
                    <td>{{ etapa.quantidade }}</td>
                    <td>{{ formatValor(etapa.valor) }}</td>
                    <td>
                      <VChip color="primary" size="small">
                        {{ etapa.percentual }}%
                      </VChip>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Top 10 Negócios e Tempo Médio -->
      <VRow class="mb-6">
        <VCol cols="12" md="6">
          <VCard>
            <VCardText>
              <h5 class="text-h5 mb-4">Top 10 Negócios por Valor</h5>
              <VList>
                <VListItem
                  v-for="negocio in top10Negocios"
                  :key="negocio.id"
                  class="pa-2"
                >
                  <div class="d-flex justify-space-between align-center w-100">
                    <div>
                      <p class="text-sm font-weight-medium mb-1">{{ negocio.title }}</p>
                      <p class="text-caption text-medium-emphasis mb-0">
                        {{ moment(negocio.created_at).format('DD/MM/YYYY') }}
                      </p>
                    </div>
                    <div class="text-end">
                      <p class="text-sm font-weight-bold mb-1">{{ formatValor(negocio.valor) }}</p>
                      <VChip
                        :color="negocio.status === 'Ganho' ? 'success' : negocio.status === 'Perdido' ? 'error' : 'warning'"
                        size="x-small"
                      >
                        {{ negocio.status }}
                      </VChip>
                    </div>
                  </div>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" md="6">
          <VCard>
            <VCardText>
              <h5 class="text-h5 mb-4">Tempo Médio por Etapa (dias)</h5>
              <VList>
                <VListItem
                  v-for="tempo in tempoMedioPorEtapa"
                  :key="tempo.etapaId"
                  class="pa-2"
                >
                  <div class="d-flex justify-space-between align-center w-100">
                    <p class="text-sm font-weight-medium mb-0">{{ tempo.etapaNome }}</p>
                    <VChip color="info" size="small">
                      {{ tempo.tempoMedio }} dias
                    </VChip>
                  </div>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Motivos de Perda -->
      <VRow class="mb-6" v-if="motivosPerda.length > 0">
        <VCol cols="12">
          <VCard>
            <VCardText>
              <h5 class="text-h5 mb-4">Principais Motivos de Perda</h5>
              <VTable>
                <thead>
                  <tr>
                    <th>Motivo</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="motivo in motivosPerda" :key="motivo.motivo">
                    <td>{{ motivo.motivo }}</td>
                    <td>
                      <VChip color="error" size="small">
                        {{ motivo.quantidade }}
                      </VChip>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <VCard v-else-if="!loading">
      <VCardText class="text-center py-16">
        <VIcon icon="tabler-chart-line" size="64" class="mb-4 text-disabled" />
        <h4 class="text-h4 mb-2">Nenhum dado encontrado</h4>
        <p class="text-body-1 text-medium-emphasis">
          Selecione um período e clique em "Buscar" para visualizar os relatórios
        </p>
      </VCardText>
    </VCard>
  </div>
</template>

