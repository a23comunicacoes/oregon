<script setup>
  import { useAlert } from "@/composables/useAlert";
  import { useConfirm } from "@/utils/confirm.js";
  import { can } from "@layouts/plugins/casl";
  import moment from "moment";

  const loading = ref(false);

  const props = defineProps({
    isDrawerOpen: {
      type: Boolean,
      required: true,
    },
    contas: {
      type: Array,
      required: true,
    },
  });

  const emit = defineEmits([
    "update:isDrawerOpen",
    "updatePagar",
    "closeDrawer",
  ]);

  if (!can("pagar", "financeiro_despesa") && props.isDrawerOpen) {
    console.log("Não tem permissão para acessar essa funcionalidade!");
    setAlert(
      "Você não tem permissão para acessar esta funcionalidade.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    emit("update:isDrawerOpen", false);
  }

  console.log("Contas a pagar:", props.contas);

  const { setAlert } = useAlert();

  const atualUser = useCookie("userData").value;

  const formatValor = (valor) => {
    if (!valor) return "R$ 0,00";
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const saida = ref({
    sai_valor: props.contas.reduce((acc, curr) => acc + curr.valor, 0),
    sai_data: moment().format("YYYY-MM-DD"),
    sai_fpt: null,
    sai_contas: props.contas,
  });

  watch(
    () => props.contas,
    (val) => {
      console.log("Contas a pagar:", val);
      saida.value.sai_valor = val.reduce((acc, curr) => acc + curr.valor, 0);
      saida.value.sai_contas = val;
      console.log("Saida Contas:", saida.value.sai_contas);
    }
  );

  const removerConta = (conta) => {
    saida.value.sai_contas.splice(saida.value.sai_contas.indexOf(conta), 1);

    if (saida.value.sai_contas.length === 0) {
      setAlert(
        "Nenhuma conta a pagar!",
        "warning",
        "tabler-alert-triangle",
        3000
      );
      closeNavigationDrawer();
    }
  };

  const limparSaida = () => {
    saida.value = {
      sai_valor: 0,
      sai_data: moment().format("YYYY-MM-DD"),
      sai_fpt: null,
      sai_contas: [],
    };
  };

  const closeNavigationDrawer = () => {
    emit("update:isDrawerOpen", false);
    limparSaida();
  };

  const handleDrawerModelValueUpdate = (val) => {
    emit("update:isDrawerOpen", val);
  };

  const formasPagamentoSaida = ref([]);

  const getFormasPagamentoSaida = async () => {
    const res = await $api("/config/g/fpt_saida", {
      method: "GET",
    });

    if (!res) return;

    console.log("Formas de pagamento:", res);

    formasPagamentoSaida.value = res.map((r) => r.value);
  };

  await getFormasPagamentoSaida();

  const checkDateStatus = (date) => {
    if (!date) return { status: "Em aberto", color: "info" };

    if (moment(date).isBefore(moment(), "day")) {
      return { status: "Em atraso", color: "error" };
    } else if (moment(date).isSame(moment(), "day")) {
      return { status: "Pagar hoje", color: "warning" };
    }

    return { status: "Em aberto", color: "info" };
  };

  const lancarSaida = async () => {
    if (!saida.value.sai_fpt) {
      setAlert(
        "Selecione a forma de pagamento!",
        "warning",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    if (!saida.value.sai_data) {
      setAlert(
        "Informe a data do pagamento!",
        "warning",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    if (
      !(await useConfirm({
        message: `Confirma o lançamento do pagamento no valor de ${formatValor(
          saida.value.sai_valor
        )}?`,
      }))
    ) {
      return;
    }

    loading.value = true;

    try {
      const res = await $api("/pagamentos/lancarSaida", {
        method: "POST",
        body: saida.value,
      });

      if (!res) return;

      console.log("Saída lançada:", res);

      setAlert(
        "Pagamento lançado com sucesso!",
        "success",
        "tabler-check",
        3000
      );
      emit("updatePagar");
      closeNavigationDrawer();
    } catch (error) {
      console.error("Erro ao lançar saída:", error, error.response);
      setAlert(
        error?.response?._data?.message ||
          "Erro ao lançar pagamento! Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }

    loading.value = false;
  };
</script>

<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <VCard flat>
      <VCardText class="pt-2">
        <!-- 👉 Title -->
        <AppDrawerHeaderSection
          title="Lançar Pagamento"
          @cancel="closeNavigationDrawer"
        />

        <VRow>
          <VCol cols="12" md="4">
            <VLabel>
              <VIcon icon="tabler-calendar" class="mr-1" /> Data do pagamento
            </VLabel>
            <VTextField
              v-model="saida.sai_data"
              type="date"
              placeholder="Informe a data do pagamento"
            />
          </VCol>

          <VCol cols="12" md="4">
            <VLabel> <VIcon icon="tabler-coin" class="mr-1" /> Valor </VLabel>
            <Dinheiro v-model="saida.sai_valor" readonly />
          </VCol>

          <VCol cols="12" md="4">
            <VLabel>
              <VIcon icon="tabler-credit-card" class="mr-1" /> Forma de
              pagamento
            </VLabel>
            <VSelect
              v-model="saida.sai_fpt"
              :items="formasPagamentoSaida"
              placeholder="Selecione a forma de pagamento"
            />
          </VCol>
        </VRow>

        <p class="my-4 font-weight-bold">Contas a pagar</p>

        <VTable>
          <thead>
            <tr>
              <th
                style="max-width: 40px !important; width: 40px !important"
              ></th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Data de vencimento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="conta in saida.sai_contas" :key="conta.id">
              <td style="max-width: 40px !important; width: 40px !important">
                <VTooltip location="top">
                  <template #activator="{ props }">
                    <VIcon
                      icon="tabler-circle-minus"
                      color="error"
                      @click="removerConta(conta)"
                      v-bind="props"
                    />
                  </template>
                  <span>Remover conta</span>
                </VTooltip>
              </td>
              <td>
                <div
                  class="my-1 text-sm text-truncate"
                  style="max-width: 300px"
                  v-html="conta.descricao"
                />
              </td>
              <td>
                <VChip
                  :color="conta.tipo == 'Despesa' ? 'warning' : 'primary'"
                  class="text-capitalize"
                  label
                  variant="flat"
                >
                  {{ conta.tipo }}
                </VChip>
              </td>
              <td>
                <p class="mb-0">{{ formatValor(conta.valor) }}</p>
              </td>
              <td>
                <p class="mb-0">
                  {{
                    conta.data ? moment(conta.data).format("DD/MM/YYYY") : "-"
                  }}
                </p>
              </td>
              <td>
                <VChip
                  color="success"
                  v-if="conta.pago == 1"
                  label
                  variant="flat"
                  >Pago</VChip
                >
                <VChip
                  :color="checkDateStatus(conta.data).color"
                  v-else
                  label
                  variant="flat"
                >
                  {{ checkDateStatus(conta.data).status }}
                </VChip>
              </td>
            </tr>
          </tbody>
        </VTable>

        <div class="linha-flex justify-end mt-4">
          <VBtn
            class="me-3"
            variant="outlined"
            color="secondary"
            @click="closeNavigationDrawer"
          >
            Cancelar
          </VBtn>

          <VBtn
            class="me-3"
            @click="lancarSaida()"
            color="success"
            :loading="loading"
            :disabled="loading"
          >
            Lançar pagamento
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
