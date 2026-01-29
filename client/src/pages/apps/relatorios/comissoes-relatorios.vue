<script setup>
import { ref, computed, onMounted } from "vue";
import GraficoEvolucaoComissoes from "@/views/apps/relatorios/grafico-evolucao-comissoes.vue";
import GraficoPizzaFormasComissoes from "@/views/apps/relatorios/grafico-pizza-formas-comissoes.vue";
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
    const res = await $api("/relatorios/get/comissoes", {
      query: {
        dataDe: dataDe.value,
        dataAte: dataAte.value,
      },
    });

    if (!res) return;

    console.log("Relatórios comissões:", res);

    relatorios.value = res;
  } catch (error) {
    console.error("Erro ao buscar relatórios:", error);
    setAlert(
      "Erro ao buscar relatórios de comissões",
      "error",
      "tabler-alert-triangle",
      5000
    );
    relatorios.value = null;
  }

  loading.value = false;
};

// Computed properties
const resumo = computed(() => relatorios.value?.resumo || {});
const evolucao = computed(() => relatorios.value?.evolucao || {});
const comissoesPorFuncionario = computed(
  () => relatorios.value?.comissoesPorFuncionario || []
);
const formasPagamento = computed(() => relatorios.value?.formasPagamento || []);
const comissoes = computed(() => relatorios.value?.comissoes || []);

// Filtros para tabela de funcionários
const filtroFuncionarios = ref({
  nome: "",
  valorMin: "",
  valorMax: "",
  status: "todos", // todos, pagas, pendentes
});

// Filtros para tabela de comissões
const filtroComissoes = ref({
  funcionario: "",
  cliente: "",
  valorMin: "",
  valorMax: "",
  status: "todos",
});

// Funcionários filtrados
const funcionariosFiltrados = computed(() => {
  let result = [...comissoesPorFuncionario.value];

  if (filtroFuncionarios.value.nome) {
    result = result.filter((f) =>
      f.fullName
        ?.toLowerCase()
        .includes(filtroFuncionarios.value.nome.toLowerCase())
    );
  }

  if (filtroFuncionarios.value.valorMin) {
    const min = parseFloat(filtroFuncionarios.value.valorMin);
    result = result.filter((f) => f.total >= min);
  }

  if (filtroFuncionarios.value.valorMax) {
    const max = parseFloat(filtroFuncionarios.value.valorMax);
    result = result.filter((f) => f.total <= max);
  }

  if (filtroFuncionarios.value.status !== "todos") {
    if (filtroFuncionarios.value.status === "pagas") {
      result = result.filter((f) => f.valorPagoQtd > 0);
    } else if (filtroFuncionarios.value.status === "pendentes") {
      result = result.filter((f) => f.valorNaoPagoQtd > 0);
    }
  }

  return result;
});

// Comissões filtradas
const comissoesFiltradas = computed(() => {
  let result = [...comissoes.value];

  if (filtroComissoes.value.funcionario) {
    result = result.filter((c) =>
      c.fullName
        ?.toLowerCase()
        .includes(filtroComissoes.value.funcionario.toLowerCase())
    );
  }

  if (filtroComissoes.value.cliente) {
    result = result.filter((c) =>
      c.cli_nome
        ?.toLowerCase()
        .includes(filtroComissoes.value.cliente.toLowerCase())
    );
  }

  if (filtroComissoes.value.valorMin) {
    const min = parseFloat(filtroComissoes.value.valorMin);
    result = result.filter((c) => c.com_valor >= min);
  }

  if (filtroComissoes.value.valorMax) {
    const max = parseFloat(filtroComissoes.value.valorMax);
    result = result.filter((c) => c.com_valor <= max);
  }

  if (filtroComissoes.value.status !== "todos") {
    if (filtroComissoes.value.status === "pagas") {
      result = result.filter((c) => c.com_paga);
    } else if (filtroComissoes.value.status === "pendentes") {
      result = result.filter((c) => !c.com_paga);
    }
  }

  return result;
});

// Limpar filtros
const limparFiltrosFuncionarios = () => {
  filtroFuncionarios.value = {
    nome: "",
    valorMin: "",
    valorMax: "",
    status: "todos",
  };
};

const limparFiltrosComissoes = () => {
  filtroComissoes.value = {
    funcionario: "",
    cliente: "",
    valorMin: "",
    valorMax: "",
    status: "todos",
  };
};

onMounted(() => {
  getRelatorios();
});

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

const imprimirComissoes = async (fun_id) => {
  try {
    const res = await $api("/relatorios/print/comissoes", {
      method: "POST",
      body: {
        fun_id: fun_id,
        dataDe: dataDe.value,
        dataAte: dataAte.value,
      },
    });

    console.log("Relatórios de comissões:", res);


    if(!res || !res.url) throw new Error("URL não encontrada");


    window.open(res.url, "_blank");
  } catch (error) {
    console.error("Erro ao imprimir relatórios de comissões:", error);
    setAlert(
      "Erro ao imprimir relatórios de comissões",
      "error",
      "tabler-alert-triangle",
      5000
    );
  }
};
</script>

<template>
  <!-- Dialog de Loading -->
  <VDialog v-model="loading" persistent max-width="500">
    <VCard>
      <VCardText class="text-center pa-8">
        <VProgressCircular indeterminate color="primary" size="64" />
        <p class="mt-4 mb-0">Carregando relatórios de comissões...</p>
      </VCardText>
    </VCard>
  </VDialog>

  <h2 class="text-h4 mb-2">Relatórios de Comissões</h2>
  <p class="text-sm text-disabled mb-6">
    Visualize e analise as comissões dos funcionários
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

  <!-- Cards de Resumo -->
  <VRow class="mb-6" v-if="relatorios">
    <!-- Total de Comissões -->
    <VCol cols="12" md="3">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-2">
            <VAvatar color="primary" variant="tonal" rounded size="42">
              <VIcon icon="tabler-gift-card" size="28" />
            </VAvatar>
            <VChip color="primary" size="small">
              {{ resumo.totalComissoes }}
            </VChip>
          </div>

          <h3 class="text-h3 mt-4 mb-1">
            {{ formatValor(resumo.valorTotalComissoes) }}
          </h3>
          <p class="text-sm mb-0">Total de Comissões</p>

          <div class="d-flex align-center mt-3 text-sm">
            <span class="text-disabled">Ticket Médio:</span>
            <span class="ml-2 font-weight-medium">{{
              formatValor(resumo.ticketMedioTotal)
            }}</span>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Comissões Pagas -->
    <VCol cols="12" md="3">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-2">
            <VAvatar color="success" variant="tonal" rounded size="42">
              <VIcon icon="tabler-check" size="28" />
            </VAvatar>
            <VChip color="success" size="small">
              {{ resumo.totalComissoesPagas }}
            </VChip>
          </div>

          <h3 class="text-h3 mt-4 mb-1">
            {{ formatValor(resumo.valorTotalComissoesPagas) }}
          </h3>
          <p class="text-sm mb-0">Comissões Pagas</p>

          <div class="d-flex align-center mt-3 text-sm">
            <span class="text-disabled">Ticket Médio:</span>
            <span class="ml-2 font-weight-medium">{{
              formatValor(resumo.ticketMedioPago)
            }}</span>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Comissões Pendentes -->
    <VCol cols="12" md="3">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-2">
            <VAvatar color="warning" variant="tonal" rounded size="42">
              <VIcon icon="tabler-clock" size="28" />
            </VAvatar>
            <VChip color="warning" size="small">
              {{ resumo.totalComissoesNaoPagas }}
            </VChip>
          </div>

          <h3 class="text-h3 mt-4 mb-1">
            {{ formatValor(resumo.valorTotalComissoesNaoPagas) }}
          </h3>
          <p class="text-sm mb-0">Comissões Pendentes</p>

          <div class="d-flex align-center mt-3 text-sm">
            <span class="text-disabled">A Pagar</span>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Taxa de Pagamento -->
    <VCol cols="12" md="3">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-2">
            <VAvatar color="info" variant="tonal" rounded size="42">
              <VIcon icon="tabler-percentage" size="28" />
            </VAvatar>
            <VChip color="info" size="small">
              {{ resumo.taxaPagamento }}%
            </VChip>
          </div>

          <h3 class="text-h3 mt-4 mb-1">Taxa de Pagamento</h3>
          <p class="text-sm mb-0">Comissões Liquidadas</p>

          <div class="d-flex align-center mt-3 text-sm">
            <VProgressLinear
              :model-value="parseFloat(resumo.taxaPagamento)"
              color="info"
              height="6"
              rounded
            />
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- Gráfico de Evolução -->
  <VRow class="mb-6" v-if="relatorios">
    <VCol cols="12">
      <GraficoEvolucaoComissoes :dados="evolucao" />
    </VCol>
  </VRow>

  <!-- Tabela de Comissões por Funcionário -->
  <VRow class="mb-6" v-if="relatorios">
    <VCol cols="12">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <h5 class="text-h5 mb-1">Comissões por Funcionário</h5>
              <p class="text-sm text-disabled mb-0">
                {{ funcionariosFiltrados.length }} de
                {{ comissoesPorFuncionario.length }} funcionários
              </p>
            </div>
            <VAvatar color="primary" variant="tonal" rounded size="42">
              <VIcon icon="tabler-users" size="28" />
            </VAvatar>
          </div>

          <!-- Filtros -->
          <VRow class="mb-4">
            <VCol cols="12" sm="3">
              <AppTextField
                v-model="filtroFuncionarios.nome"
                placeholder="Filtrar por funcionário"
                density="compact"
                clearable
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-user" size="20" />
                </template>
              </AppTextField>
            </VCol>
            <VCol cols="12" sm="2">
              <AppTextField
                v-model="filtroFuncionarios.valorMin"
                placeholder="Valor mín."
                type="number"
                density="compact"
                clearable
              />
            </VCol>
            <VCol cols="12" sm="2">
              <AppTextField
                v-model="filtroFuncionarios.valorMax"
                placeholder="Valor máx."
                type="number"
                density="compact"
                clearable
              />
            </VCol>
            <VCol cols="12" sm="3">
              <AppSelect
                v-model="filtroFuncionarios.status"
                :items="[
                  { value: 'todos', title: 'Todos' },
                  { value: 'pagas', title: 'Com Comissões Pagas' },
                  { value: 'pendentes', title: 'Com Comissões Pendentes' },
                ]"
                density="compact"
              />
            </VCol>
            <VCol cols="12" sm="2">
              <VBtn
                color="secondary"
                variant="tonal"
                @click="limparFiltrosFuncionarios"
                block
                density="compact"
              >
                <VIcon icon="tabler-x" size="18" />
                Limpar
              </VBtn>
            </VCol>
          </VRow>

          <!-- Tabela -->
          <div style="max-height: 400px; overflow-y: auto">
            <VTable v-if="funcionariosFiltrados.length > 0">
              <thead
                style="
                  position: sticky;
                  top: 0;
                  background: inherit;
                  z-index: 1;
                "
              >
                <tr>
                  <th>Funcionário</th>
                  <th>Qtd.</th>
                  <th>Valor Pago</th>
                  <th>Valor Pendente</th>
                  <th>Total</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="funcionario in funcionariosFiltrados"
                  :key="funcionario.fun_id"
                >
                  <td>
                    <div class="d-flex align-center">
                      <VAvatar
                        :color="funcionario.color || 'primary'"
                        size="32"
                        class="mr-2"
                      >
                        <span class="text-xs" v-if="!funcionario.avatar">{{
                          funcionario.fullName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                        }}</span>

                        <VImg
                          v-else
                          :src="funcionario.avatar"
                          cover
                          width="32"
                          height="32"
                          class="rounded-full"
                        />
                      </VAvatar>
                      <p class="mb-0 font-weight-medium">
                        {{ funcionario.fullName }}
                      </p>
                    </div>
                  </td>
                  <td>
                    <p class="mb-0">
                      <span class="text-disabled mr-2">Pagas:</span>
                      <VChip size="small" color="success" variant="tonal">
                        {{ funcionario.valorPagoQtd }}
                      </VChip>
                    </p>

                    <p class="mb-0">
                      <span class="text-disabled mr-2">Pendentes:</span>
                      <VChip size="small" color="warning" variant="tonal">
                        {{ funcionario.valorNaoPagoQtd }}
                      </VChip>
                    </p>
                  </td>
                  <td class="font-weight-medium text-success">
                    {{ formatValor(funcionario.valorPago) }}
                  </td>
                  <td class="font-weight-medium text-warning">
                    {{ formatValor(funcionario.valorNaoPago) }}
                  </td>
                  <td class="font-weight-bold text-primary">
                    {{ formatValor(funcionario.total) }}
                  </td>
                  <td>
                    <IconBtn
                      @click="imprimirComissoes(funcionario.fun_id)"
                      icon="tabler-printer"
                      size="small"
                      variant="text"
                    />
                  </td>
                </tr>
              </tbody>
            </VTable>

            <div v-else class="text-center py-8">
              <VIcon
                icon="tabler-users"
                size="48"
                color="disabled"
                class="mb-2"
              />
              <p class="text-disabled mb-0">
                {{
                  comissoesPorFuncionario.length === 0
                    ? "Nenhum funcionário no período"
                    : "Nenhum funcionário encontrado com os filtros aplicados"
                }}
              </p>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- Tabela Completa de Comissões -->
  <VRow class="mb-6" v-if="relatorios">
    <VCol cols="12">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <h5 class="text-h5 mb-1">Todas as Comissões</h5>
              <p class="text-sm text-disabled mb-0">
                {{ comissoesFiltradas.length }} de {{ comissoes.length }}
                comissões
              </p>
            </div>
            <VAvatar color="info" variant="tonal" rounded size="42">
              <VIcon icon="tabler-list" size="28" />
            </VAvatar>
          </div>

          <!-- Filtros -->
          <VRow class="mb-4">
            <VCol cols="12" sm="2">
              <AppTextField
                v-model="filtroComissoes.funcionario"
                placeholder="Funcionário"
                density="compact"
                clearable
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-user" size="20" />
                </template>
              </AppTextField>
            </VCol>
            <VCol cols="12" sm="2">
              <AppTextField
                v-model="filtroComissoes.cliente"
                placeholder="Cliente"
                density="compact"
                clearable
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-user-check" size="20" />
                </template>
              </AppTextField>
            </VCol>
            <VCol cols="12" sm="2">
              <AppTextField
                v-model="filtroComissoes.valorMin"
                placeholder="Valor mín."
                type="number"
                density="compact"
                clearable
              />
            </VCol>
            <VCol cols="12" sm="2">
              <AppTextField
                v-model="filtroComissoes.valorMax"
                placeholder="Valor máx."
                type="number"
                density="compact"
                clearable
              />
            </VCol>
            <VCol cols="12" sm="2">
              <AppSelect
                v-model="filtroComissoes.status"
                :items="[
                  { value: 'todos', title: 'Todos' },
                  { value: 'pagas', title: 'Pagas' },
                  { value: 'pendentes', title: 'Pendentes' },
                ]"
                density="compact"
              />
            </VCol>
            <VCol cols="12" sm="2">
              <VBtn
                color="secondary"
                variant="tonal"
                @click="limparFiltrosComissoes"
                block
                density="compact"
              >
                <VIcon icon="tabler-x" size="18" />
                Limpar
              </VBtn>
            </VCol>
          </VRow>

          <!-- Tabela -->
          <div style="max-height: 500px; overflow-y: auto">
            <VTable v-if="comissoesFiltradas.length > 0">
              <thead
                style="
                  position: sticky;
                  top: 0;
                  background: inherit;
                  z-index: 1;
                "
              >
                <tr>
                  <th style="width: 220px">Agendamento</th>
                  <th style="width: 250px">Serviços</th>
                  <th>Vlr. Agend.</th>
                  <th>Vlr. Comissão</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="comissao in comissoesFiltradas"
                  :key="comissao.com_id"
                >
                  <td>
                    <div>
                      <p class="mb-0 mt-2 font-weight-medium text-sm">
                          N° #{{ comissao.age_id }}
                      </p>
                      <p class="mb-0 text-sm">
                        Data:{{ moment(comissao.age_data).format("DD/MM/YYYY") }}
                      </p>
                      <p class="mb-2 text-sm text-truncate" style="max-width: 300px; width: 300px;">
                        Cliente: {{ comissao.cli_nome }}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div v-if="comissao.servicos && comissao.servicos.length > 0" class="my-2">
                      <p 
                        v-for="(servico, idx) in comissao.servicos"
                        :key="idx"
                        class="mb-0 text-sm"
                      >
                        {{ servico.ser_quantity || 1 }}x {{ servico.ser_nome }}
                      </p>
                    </div>
                    <span v-else class="text-disabled text-sm">N/A</span>
                  </td>
                  <td class="font-weight-medium text-disabled">
                    {{ formatValor(comissao.age_valor) }}
                  </td>
                  <td class="font-weight-medium text-primary">
                    {{ formatValor(comissao.com_valor) }}
                  </td>
                  <td>
                    <VChip
                      size="small"
                      :color="comissao.com_paga ? 'success' : 'warning'"
                    >
                      {{ comissao.com_paga ? "Paga" : "Pendente" }}
                    </VChip>
                  </td>
                </tr>
              </tbody>
            </VTable>

            <div v-else class="text-center py-8">
              <VIcon
                icon="tabler-list"
                size="48"
                color="disabled"
                class="mb-2"
              />
              <p class="text-disabled mb-0">
                {{
                  comissoes.length === 0
                    ? "Nenhuma comissão no período"
                    : "Nenhuma comissão encontrada com os filtros aplicados"
                }}
              </p>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- Estado vazio -->
  <VRow v-if="!relatorios && !loading">
    <VCol cols="12">
      <VCard>
        <VCardText class="text-center py-16">
          <VIcon
            icon="tabler-gift-card"
            size="64"
            color="disabled"
            class="mb-4"
          />
          <h4 class="text-h4 mb-2">Selecione um período</h4>
          <p class="text-disabled mb-0">
            Configure o período desejado e clique em Filtrar para visualizar os
            relatórios de comissões
          </p>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
