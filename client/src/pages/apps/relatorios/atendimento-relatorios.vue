<script setup>
import { ref, computed, onMounted } from "vue";
import moment from "moment";

const { setAlert } = useAlert();

const loading = ref(false);

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
    const res = await $api("/relatorios/get/atendimento", {
      query: {
        dataDe: dataDe.value,
        dataAte: dataAte.value,
      },
    });

    if (!res) return;

    console.log("Relatórios de Atendimento:", res);
    relatorios.value = res;
  } catch (error) {
    console.error("Erro ao buscar relatórios:", error);
    setAlert(
      "Erro ao buscar relatórios de atendimento",
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
const conversasPorFluxo = computed(() => relatorios.value?.conversasPorFluxo || []);
const conversasPorDia = computed(() => relatorios.value?.conversasPorDia || []);
const acoesPorTipo = computed(() => relatorios.value?.acoesPorTipo || []);

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
          <p class="mt-4 mb-0">Carregando relatórios de atendimento...</p>
        </VCardText>
      </VCard>
    </VDialog>

    <h2 class="text-h4 mb-2">Relatórios de Atendimento</h2>
    <p class="text-sm text-disabled mb-6">
      Análise completa do sistema de atendimento automatizado
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
                  <p class="text-sm text-medium-emphasis mb-1">Total de Conversas</p>
                  <h3 class="text-h3 mb-0">{{ estatisticas.totalConversas || 0 }}</h3>
                </div>
                <VAvatar color="primary" variant="tonal" size="42">
                  <VIcon icon="tabler-message-circle" size="24" />
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
                  <p class="text-sm text-medium-emphasis mb-1">Conversas Finalizadas</p>
                  <h3 class="text-h3 mb-0 text-success">{{ estatisticas.conversasFinalizadas || 0 }}</h3>
                </div>
                <VAvatar color="success" variant="tonal" size="42">
                  <VIcon icon="tabler-check" size="24" />
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
                  <p class="text-sm text-medium-emphasis mb-1">Em Andamento</p>
                  <h3 class="text-h3 mb-0 text-warning">{{ estatisticas.conversasEmAndamento || 0 }}</h3>
                </div>
                <VAvatar color="warning" variant="tonal" size="42">
                  <VIcon icon="tabler-loader" size="24" />
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
                  <p class="text-sm text-medium-emphasis mb-1">Tempo Médio</p>
                  <h3 class="text-h3 mb-0">{{ estatisticas.tempoMedioAtendimento || 0 }}min</h3>
                </div>
                <VAvatar color="info" variant="tonal" size="42">
                  <VIcon icon="tabler-clock" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Segunda linha de cards - Conversões -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Agendamentos Gerados</p>
                  <h4 class="text-h4 mb-0 text-success">{{ estatisticas.totalAgendamentosGerados || 0 }}</h4>
                </div>
                <VAvatar color="success" variant="tonal" size="42">
                  <VIcon icon="tabler-calendar-check" size="24" />
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
                  <p class="text-sm text-medium-emphasis mb-1">Taxa Conversão Agend.</p>
                  <h4 class="text-h4 mb-0 text-success">{{ estatisticas.taxaConversaoAgendamento || 0 }}%</h4>
                </div>
                <VAvatar color="success" variant="tonal" size="42">
                  <VIcon icon="tabler-percentage" size="24" />
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
                  <p class="text-sm text-medium-emphasis mb-1">Negócios Gerados</p>
                  <h4 class="text-h4 mb-0 text-info">{{ estatisticas.totalNegociosGerados || 0 }}</h4>
                </div>
                <VAvatar color="info" variant="tonal" size="42">
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
                  <p class="text-sm text-medium-emphasis mb-1">Taxa Conversão Negócio</p>
                  <h4 class="text-h4 mb-0 text-info">{{ estatisticas.taxaConversaoNegocio || 0 }}%</h4>
                </div>
                <VAvatar color="info" variant="tonal" size="42">
                  <VIcon icon="tabler-chart-line" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Terceira linha - Execuções -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard>
            <VCardText>
              <div class="d-flex justify-space-between align-center">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Total Execuções</p>
                  <h4 class="text-h4 mb-0">{{ estatisticas.totalExecucoes || 0 }}</h4>
                </div>
                <VAvatar color="primary" variant="tonal" size="42">
                  <VIcon icon="tabler-player-play" size="24" />
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
                  <p class="text-sm text-medium-emphasis mb-1">Completados</p>
                  <h4 class="text-h4 mb-0 text-success">{{ estatisticas.totalCompletados || 0 }}</h4>
                </div>
                <VAvatar color="success" variant="tonal" size="42">
                  <VIcon icon="tabler-circle-check" size="24" />
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
                  <p class="text-sm text-medium-emphasis mb-1">Cancelados</p>
                  <h4 class="text-h4 mb-0 text-error">{{ estatisticas.totalCancelados || 0 }}</h4>
                </div>
                <VAvatar color="error" variant="tonal" size="42">
                  <VIcon icon="tabler-x" size="24" />
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
                  <p class="text-sm text-medium-emphasis mb-1">Timeout</p>
                  <h4 class="text-h4 mb-0 text-warning">{{ estatisticas.totalTimeout || 0 }}</h4>
                </div>
                <VAvatar color="warning" variant="tonal" size="42">
                  <VIcon icon="tabler-clock-off" size="24" />
                </VAvatar>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Conversas por Fluxo -->
      <VRow class="mb-6">
        <VCol cols="12">
          <VCard>
            <VCardText>
              <h5 class="text-h5 mb-4">Conversas por Fluxo</h5>
              <VTable>
                <thead>
                  <tr>
                    <th>Fluxo</th>
                    <th>Conversas</th>
                    <th>Agendamentos</th>
                    <th>Negócios</th>
                    <th>Taxa de Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fluxo in conversasPorFluxo" :key="fluxo.flowId">
                    <td>{{ fluxo.flowNome }}</td>
                    <td>{{ fluxo.quantidade }}</td>
                    <td>
                      <VChip color="success" size="small">
                        {{ fluxo.agendamentos }}
                      </VChip>
                    </td>
                    <td>
                      <VChip color="info" size="small">
                        {{ fluxo.negocios }}
                      </VChip>
                    </td>
                    <td>
                      <VChip color="primary" size="small">
                        {{ fluxo.taxaConversao }}%
                      </VChip>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Ações Executadas -->
      <VRow class="mb-6">
        <VCol cols="12">
          <VCard>
            <VCardText>
              <h5 class="text-h5 mb-4">Ações Executadas</h5>
              <VTable>
                <thead>
                  <tr>
                    <th>Tipo de Ação</th>
                    <th>Quantidade</th>
                    <th>Sucesso</th>
                    <th>Erro</th>
                    <th>Taxa de Sucesso</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="acao in acoesPorTipo" :key="acao.tipo">
                    <td>{{ acao.tipo }}</td>
                    <td>{{ acao.quantidade }}</td>
                    <td>
                      <VChip color="success" size="small">
                        {{ acao.sucesso }}
                      </VChip>
                    </td>
                    <td>
                      <VChip color="error" size="small">
                        {{ acao.erro }}
                      </VChip>
                    </td>
                    <td>
                      <VChip 
                        :color="acao.taxaSucesso > 90 ? 'success' : acao.taxaSucesso > 70 ? 'warning' : 'error'" 
                        size="small"
                      >
                        {{ acao.taxaSucesso }}%
                      </VChip>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Conversas por Dia -->
      <VRow class="mb-6">
        <VCol cols="12">
          <VCard>
            <VCardText>
              <h5 class="text-h5 mb-4">Conversas por Dia</h5>
              <VTable>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Conversas</th>
                    <th>Agendamentos</th>
                    <th>Negócios</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="dia in conversasPorDia" :key="dia.data">
                    <td>{{ moment(dia.data).format('DD/MM/YYYY') }}</td>
                    <td>{{ dia.quantidade }}</td>
                    <td>
                      <VChip color="success" size="small">
                        {{ dia.agendamentos }}
                      </VChip>
                    </td>
                    <td>
                      <VChip color="info" size="small">
                        {{ dia.negocios }}
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
        <VIcon icon="tabler-message-off" size="64" class="mb-4 text-disabled" />
        <h4 class="text-h4 mb-2">Nenhum dado encontrado</h4>
        <p class="text-body-1 text-medium-emphasis">
          Selecione um período e clique em "Buscar" para visualizar os relatórios
        </p>
      </VCardText>
    </VCard>
  </div>
</template>

