<script setup>
  import { temaAtual } from "@core/stores/config";
  import lembreteTable from "@/views/apps/lembretes/lembreteTable.vue";
  import moment from "moment";
  const isMobile = window.innerWidth < 768;
  import { useFunctions } from "@/composables/useFunctions";
  import { can } from "@layouts/plugins/casl";
  import { useConfirm } from "@/utils/confirm.js";

  const { setAlert } = useAlert();
  
  const {
    escreverEndereco,
    formatDateAgendamento,
    copyEndereco,
    enderecoWaze,
    enderecoMaps,
  } = useFunctions();

  const sizeIconBtn = ref(isMobile ? 35 : 30);
  const sizeIcon = ref(isMobile ? 25 : 20);

  const loading = ref(false);
  const isNewPagamento = ref(true);

  const props = defineProps({
    isDrawerOpen: {
      type: Boolean,
      required: true,
    },
    ReceberData: Object,
  });

  const emit = defineEmits([
    "update:isDrawerOpen",
    "updateReceber",
    "closeDrawer",
  ]);

  if (!can("view", "financeiro_recebimento") && props.isDrawerOpen) {
    console.log("Não tem permissão para acessar essa funcionalidade!");
    setAlert(
      "Você não tem permissão para acessar essa funcionalidade!",
      "error",
      "tabler-alert-triangle",
      3000
    );
    emit("update:isDrawerOpen", false);
  }

  console.log("ReceberData:", props.ReceberData);

  const atualUser = useCookie("userData").value;

  const pagamento = ref({
    pgt_id: 0,
    age_id: 0,
    pgt_valor: 0,
    pgt_data: null,
    pgt_json: [],
    fpg_id: 0,
    update_at: null,
    created_at: null,
    agendamento: [],
    pgt_nota_fiscal: "",
    pgt_numero_nota_fiscal: "",
    pgt_obs: "",
    pago: false,
  });

  const disabled = ref(false);

  const handleProps = (newVal) => {
    if (!newVal) {
      isNewPagamento.value = true;
      return;
    }

    if (
      newVal?.pgt_id !== null &&
      newVal?.pgt_id !== undefined &&
      newVal?.pgt_id !== 0
    ) {
      disabled.value = newVal.pago || !can("edit", "financeiro_recebimento");

      isNewPagamento.value = false;
      console.log("Não é novo pagamento:", newVal);
      pagamento.value = newVal;
      pagamento.value.created_at = moment(
        newVal.created_at ? newVal.created_at : new Date()
      ).format("YYYY-MM-DD");
      pagamento.value.pgt_data = moment(newVal.pgt_data).format("YYYY-MM-DD");
      pagamento.value.fpg_id = pagamento.value.fpg_id
        ? pagamento.value.fpg_id
        : 4;
    }
  };

  watch(
    () => props.ReceberData,
    (newVal) => {
      handleProps(newVal);
    }
  );

  if (
    props.ReceberData &&
    props.ReceberData?.pgt_id !== null &&
    props.ReceberData?.pgt_id !== undefined &&
    props.ReceberData?.pgt_id !== 0
  ) {
    handleProps(props.ReceberData);
  }

  const limparPagamento = () => {
    pagamento.value = {
      pgt_id: 0,
      age_id: 0,
      pgt_valor: 0,
      pgt_data: null,
      pgt_json: [],
      fpg_id: 0,
      update_at: null,
      created_at: null,
      agendamento: [],
      pgt_nota_fiscal: "",
      pgt_numero_nota_fiscal: "",
      pgt_obs: "",
      pago: false,
    };
  };

  const closeNavigationDrawer = () => {
    emit("update:isDrawerOpen", false);
    limparPagamento();
  };

  const handleDrawerModelValueUpdate = (val) => {
    emit("update:isDrawerOpen", val);
  };

  const savePagamento = async (marcarComoPago) => {
    handleValuePgtJson();
    console.log("Salvando pagamento:", pagamento.value, marcarComoPago);

    if (!can("edit", "financeiro_recebimento")) {
      setAlert(
        "Você não tem permissão para realizar essa ação!",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    if (!pagamento.value.pgt_valor || pagamento.value.pgt_valor === "") {
      console.log("Valor do pagamento:", pagamento.value.pgt_valor);
      setAlert(
        "Digite um valor para o pagamento!",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }
    if (!pagamento.value.pgt_data) {
      setAlert(
        "Selecione uma data para o pagamento!",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    if (marcarComoPago) {
      if (
        !(await useConfirm({
          message: `Tem certeza que deseja marcar este pagamento como pago? Não será possível editá-lo depois.`,
        }))
      )
        return;
    }

    loading.value = true;

    let link = isNewPagamento.value
      ? "/pagamentos/create"
      : `/pagamentos/update/receber/${pagamento.value.pgt_id}`;

    try {
      const res = await $api(link, {
        method: "POST",
        body: {
          pagamentoData: pagamento.value,
          marcarComoPago: marcarComoPago,
        },
      });

      if (!res) return;

      console.log("Pagamento cadastrado com sucesso!", res);

      setAlert(res, "success", "tabler-credit-card", 3000);

      if (marcarComoPago) {
        disabled.value = true;
      }
      closeNavigationDrawer();
      emit("updateReceber");
    } catch (error) {
      console.error("Erro ao cadastrar pagamento:", error, error.response);
      setAlert(
        error?.response?._data?.message ||
        `Erro ao ${
          isNewPagamento.value ? "cadastrar" : "atualizar"
        } pagamento! Tente novamente.`,
        "error",
        "tabler-alert-triangle",
        3000
      );
    }

    loading.value = false;
  };

  const formatValor = (valor) => {
    if (!valor) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const formasPagamento = ref([]);

  const getFormasPagamentos = async () => {
    const resPagamentoEntrada = await $api("/pagamentos/forma_entrada", {
      method: "GET",
    });

    if (!resPagamentoEntrada) {
      formasPagamento.value = [
        { fpg_id: 3, fpg_nome: "Cartão de Crédito" },
        { fpg_id: 4, fpg_nome: "Dinheiro" },
        { fpg_id: 5, fpg_nome: "Cartão de Débito" },
        { fpg_id: 6, fpg_nome: "Pix" },
        { fpg_id: 7, fpg_nome: "Transferência PJ" },
        { fpg_id: 8, fpg_nome: "Boleto" },
      ];
    } else {
      formasPagamento.value = resPagamentoEntrada.map((pagamento) => {
        return {
          fpg_id: pagamento.fpg_id,
          fpg_nome: pagamento.fpg_descricao,
        };
      });
    }
  };

  await getFormasPagamentos();

  const uploadNota = async (e) => {
    console.log("Upload Nota:", e.target.files[0]);

    if (!e.target.files[0]) return;

    const formData = new FormData();
    formData.append("nota", e.target.files[0]);

    try {
      const res = await $api(
        `/pagamentos/anexar-nota/${pagamento.value.pgt_id}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res) return;

      console.log("Nota fiscal enviada com sucesso!", res);
      setAlert(
        "Nota fiscal anexada com sucesso!",
        "success",
        "tabler-file-check",
        3000
      );

      pagamento.value.pgt_nota_fiscal = res;
    } catch (error) {
      console.error("Erro ao enviar nota fiscal:", error, error.response);
      setAlert(
        "Erro ao anexar nota fiscal! Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const isTableLembreteVisible = ref(false);
  const viewLembretes = () => {
    if (isNewPagamento.value)
      return setAlert(
        "Salve o pagamento antes de adicionar lembretes!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    isTableLembreteVisible.value = true;
  };

  const handleValuePgtJson = () => {
    let json = pagamento.value.pgt_json;

    console.log("Novo valor:", json);

    // Converte valores para número antes de somar para evitar concatenação de strings
    let totalValor = json.reduce(
      (acc, item) => acc + parseFloat(item.pgt_valor),
      0
    );

    console.log("Total valor:", totalValor);

    if (totalValor > (pagamento.value.agendamento[0]?.valorNaoPago || 0)) {
      setAlert(
        "O valor total dos pagamentos não pode ser maior que o valor pendente do agendamento!",
        "error",
        "tabler-alert-triangle",
        3000
      );
      pagamento.value.pgt_valor =
        pagamento.value.agendamento[0]?.valorNaoPago || 0;
      for (let i = 0; i < json.length; i++) {
        if (i === 0) {
          json[i].pgt_valor = pagamento.value.pgt_valor;
        } else {
          json[i].pgt_valor = 0;
        }
      }
      return;
    }

    if (json.length > 0) {
      pagamento.value.pgt_valor = totalValor.toFixed(2); // Formata o valor para duas casas decimais
    }
  };

  const addValuePgtJson = () => {
    pagamento.value.pgt_json.push({ fpg_id: 4, pgt_valor: 0 });
  };

  const removeValuePgtJson = (index) => {
    pagamento.value.pgt_json.splice(index, 1);

    let json = pagamento.value.pgt_json;

    // Converte valores para número antes de somar para evitar concatenação de strings
    let totalValor = json.reduce(
      (acc, item) => acc + parseFloat(item.pgt_valor),
      0
    );

    console.log("Total valor:", totalValor);

    if (json.length > 0) {
      pagamento.value.pgt_valor = totalValor.toFixed(2); // Formata o valor para duas casas decimais
    }
  };

  const expansionModel = ref([0]);

  const loadingDelete = ref(false);

  const deletePagamento = async () => {
    if (!can("delete", "financeiro_recebimento")) {
      setAlert(
        "Você não tem permissão para realizar essa ação!",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    //Confirmação de exclusão
    const confirm = await useConfirm({
      message:
        "Tem certeza que deseja excluir esse pagamento? Essa ação não pode ser desfeita.",
    });

    if (!confirm) {
      return;
    }

    loadingDelete.value = true;

    try {
      const res = await $api(
        `/pagamentos/delete/receber/${pagamento.value.pgt_id}`,
        {
          method: "DELETE",
        }
      );

      if (!res) return;

      console.log("Pagamento excluído com sucesso!", res);

      setAlert(
        "Pagamento excluído com sucesso!",
        "success",
        "tabler-trash",
        3000
      );

      closeNavigationDrawer();
      emit("updateReceber");
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error, error.response);
      setAlert(
        error?.response?._data?.message ||
        `Erro ao excluir pagamento! Tente novamente.`,
        "error",
        "tabler-alert-triangle",
        3000
      );
    }

    loadingDelete.value = false;
  };
</script>
<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
    width="900"
  >
    <VCard flat>
      <VCardText class="pt-2">
        <!-- 👉 Title -->
        <AppDrawerHeaderSection @cancel="closeNavigationDrawer">
          <template #title>
            <h5 class="text-h5 mb-0 d-flex flex-row gap-3 align-center">
              {{ isNewPagamento ? "Cadastrar" : "Editar" }} Pagamento
              <VChip
                color="success"
                class="font-weight-bold"
                label
                variant="flat"
                v-if="pagamento.pago"
              >
                Pago em {{ moment(pagamento.pgt_data).format("DD/MM/YYYY") }}
              </VChip>
              <VChip
                color="warning"
                class="font-weight-bold"
                label
                variant="flat"
                v-else
              >
                Pendente
              </VChip>

              <IconBtn
                color="warning"
                @click="viewLembretes"
                :size="sizeIconBtn"
              >
                <VIcon icon="tabler-bell" :size="sizeIcon" />
              </IconBtn>
            </h5>
          </template>
        </AppDrawerHeaderSection>

        <VRow>
          <VCol cols="6">
            <VExpansionPanels multiple v-model="expansionModel" class="mb-3">
              <VExpansionPanel
                :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
                rounded="md"
              >
                <VExpansionPanelTitle>
                  <p class="mb-0 font-weight-bold">
                    <VIcon icon="tabler-coin" class="mr-1" />
                    Detalhes financeiros
                  </p>
                </VExpansionPanelTitle>

                <VExpansionPanelText class="pt-4">
                  <div class="d-flex flex-row gap-4 align-center mb-3">
                    <div
                      style="
                        border-right: 1px solid #ffffff4a;
                        padding-right: 8px;
                      "
                    >
                      <p class="mb-0 text-h5 text-warning">
                        {{
                          formatValor(pagamento.agendamento[0]?.valorNaoPago)
                        }}
                      </p>
                      <p class="mb-0 text-caption">Valor Pendente</p>
                    </div>

                    <div
                      style="
                        border-right: 1px solid #ffffff4a;
                        padding-right: 8px;
                      "
                    >
                      <p class="mb-0 text-h5 text-success">
                        {{ formatValor(pagamento.agendamento[0]?.valorPago) }}
                      </p>
                      <p class="mb-0 text-caption">Valor Pago</p>
                    </div>

                    <div>
                      <p class="mb-0 text-h5">
                        {{ formatValor(pagamento.agendamento[0]?.age_valor) }}
                      </p>
                      <p class="mb-0 text-caption">Valor Total</p>
                    </div>
                  </div>
                  <p class="mb-1 text-sm">
                    <strong>Subtotal: </strong>
                    {{ formatValor(pagamento.agendamento[0]?.age_valor) }}
                    -
                    <strong>Desconto: </strong>
                    {{ formatValor(pagamento.agendamento[0]?.age_desconto) }}
                  </p>

                  <div v-if="pagamento.pgt_valor > 0" class="mt-3">
                    <VDivider class="mb-3" />

                    <p class="mb-1 text-sm">Detalhes do pagamento:</p>

                    <div class="d-flex flex-row gap-4 align-center mb-3">
                      <div
                        style="
                          border-right: 1px solid #ffffff4a;
                          padding-right: 8px;
                        "
                      >
                        <p class="mb-0 text-h5 text-warning">
                          {{
                            pagamento.agendamento[0]?.valorNaoPago -
                              pagamento.pgt_valor <
                            0
                              ? formatValor(0)
                              : formatValor(
                                  pagamento.agendamento[0]?.valorNaoPago -
                                    parseFloat(pagamento.pgt_valor)
                                )
                          }}
                        </p>
                        <p class="mb-0 text-caption">Valor Pendente</p>
                      </div>

                     <!--  <div
                        style="
                          border-right: 1px solid #ffffff4a;
                          padding-right: 8px;
                        "
                      >
                        <p class="mb-0 text-h5 text-success">
                          {{
                            formatValor(
                              pagamento.agendamento[0]?.valorPago +
                                parseFloat(pagamento.pgt_valor)
                            )
                          }}
                        </p>
                        <p class="mb-0 text-caption">Valor Pago</p>
                      </div>
 -->
                      <div>
                        <p class="mb-0 text-h5 text-success">
                          {{ formatValor(pagamento.pgt_valor) }}
                        </p>
                        <p class="mb-0 text-caption">Valor do Pagamento</p>
                      </div>
                    </div>
                  </div>
                </VExpansionPanelText>
              </VExpansionPanel>

              <VExpansionPanel
                :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
                rounded="md"
                v-if="pagamento.agendamento[0]?.outrosPagamentos?.length > 0"
              >
                <VExpansionPanelTitle>
                  <p class="mb-0 font-weight-bold">
                    <VIcon icon="tabler-cash" class="mr-1" />
                    Outros pagamentos
                  </p>
                </VExpansionPanelTitle>

                <VExpansionPanelText class="pt-4">
                  <VTable>
                    <thead>
                      <tr>
                        <th>Forma de Pagamento</th>
                        <th>Valor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="outroPagamento in pagamento.agendamento[0]
                          ?.outrosPagamentos"
                        :key="outroPagamento.fpg_id"
                      >
                        <td v-if="outroPagamento.fpg_id">
                          {{
                            formasPagamento.find(
                              (f) => f.fpg_id == outroPagamento.fpg_id
                            ).fpg_nome
                          }}
                        </td>
                        <td v-else>-</td>
                        <td>{{ formatValor(outroPagamento.pgt_valor) }}</td>
                        <td>
                          <VChip
                            :color="
                              outroPagamento.pgt_data ? 'success' : 'warning'
                            "
                            label
                          >
                            {{
                              outroPagamento.pgt_data
                                ? `Pago em ${new Date(
                                    outroPagamento.pgt_data
                                  ).toLocaleDateString()}`
                                : "Pendente"
                            }}
                          </VChip>
                        </td>
                      </tr>
                    </tbody>
                  </VTable>
                </VExpansionPanelText>
              </VExpansionPanel>

              <VExpansionPanel
                :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
                rounded="md"
              >
                <VExpansionPanelTitle>
                  <p class="mb-0 font-weight-bold">
                    <VIcon icon="tabler-user" class="mr-1" />
                    Detalhes do cliente
                  </p>
                </VExpansionPanelTitle>

                <VExpansionPanelText class="pt-4">
                  <p class="mb-1">
                    <VIcon icon="tabler-user" class="mr-1" />
                    {{ pagamento.agendamento[0]?.cliente[0]?.cli_nome }}
                  </p>
                  <p
                    class="mb-1"
                    v-if="pagamento.agendamento[0]?.cliente[0]?.cli_celular"
                  >
                    <VIcon icon="tabler-phone" class="mr-1" />
                    {{ pagamento.agendamento[0]?.cliente[0]?.cli_celular }}
                  </p>
                  <p
                    class="mb-1"
                    v-if="pagamento.agendamento[0]?.cliente[0]?.cli_email"
                  >
                    <VIcon icon="tabler-mail" class="mr-1" />
                    {{ pagamento.agendamento[0]?.cliente[0]?.cli_email }}
                  </p>
                </VExpansionPanelText>
              </VExpansionPanel>

              <VExpansionPanel
                :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
                rounded="md"
              >
                <VExpansionPanelTitle>
                  <p class="mb-0 font-weight-bold">
                    <VIcon icon="tabler-calendar" class="mr-1" />
                    Detalhes do agendamento
                  </p>
                </VExpansionPanelTitle>

                <VExpansionPanelText class="pt-4">
                  <p class="mb-1">
                    <VIcon icon="tabler-list-details" class="mr-1" />
                    <VChip
                      label
                      :color="pagamento.agendamento[0]?.bkColor"
                      class="ml-2"
                    >
                      {{ pagamento.agendamento[0]?.status }}
                    </VChip>
                  </p>
                  <p class="mb-1">
                    <VIcon icon="tabler-calendar" class="mr-1" />
                    {{
                      formatDateAgendamento(
                        pagamento.agendamento[0]?.age_data,
                        pagamento.agendamento[0]?.age_horaInicio,
                        pagamento.agendamento[0]?.age_horaFim
                      )
                    }}
                  </p>
                  <p class="mb-1" v-if="pagamento.agendamento[0]?.age_dataFim">
                    <VIcon icon="tabler-calendar-x" class="mr-1" />
                    {{
                      formatDateAgendamento(
                        pagamento.agendamento[0]?.age_dataFim,
                        pagamento.agendamento[0]?.age_horaInicioFim,
                        pagamento.agendamento[0]?.age_horaFimFim
                      )
                    }}
                  </p>
                  <p
                    class="mb-1"
                    v-if="pagamento.agendamento[0]?.funcionario?.[0]"
                  >
                    <VIcon icon="tabler-user-cog" class="mr-1" />
                    {{ pagamento.agendamento[0]?.funcionario[0]?.fullName }}
                  </p>
                  <p
                    class="mb-1"
                    v-if="pagamento.agendamento[0]?.endereco?.[0]"
                  >
                    <VIcon icon="tabler-map-pin" class="mr-1" />
                    {{
                      escreverEndereco(pagamento.agendamento[0]?.endereco[0])
                    }}
                  </p>
                  <div class="mb-1" v-if="pagamento.agendamento[0]?.servicos">
                    <p class="mb-1">Serviços:</p>
                    <ul
                      v-if="pagamento.agendamento[0]?.servicos?.length > 0"
                      style="list-style-type: decimal"
                      class="ml-5"
                    >
                      <li
                        v-for="servico in pagamento.agendamento[0]?.servicos"
                        class="text-sm"
                      >
                        {{ servico.ser_nome }} - {{ servico.ser_descricao }} -
                        {{ formatValor(servico.ser_valor) }} -
                        <strong>Qtd:</strong> {{ servico.ser_quantity }}
                      </li>
                    </ul>
                    <span v-else>Nenhum serviço cadastrado</span>
                  </div>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </VCol>

          <VCol cols="6">
            <VRow>
              <VCol cols="12">
                <VBtn
                  class="mb-2"
                  color="primary"
                  size="small"
                  style="height: 30px"
                  @click="addValuePgtJson"
                  v-if="!disabled"
                >
                  <VIcon icon="tabler-plus" /> Adicionar Valor
                </VBtn>

                <div class="mb-2">
                  <div
                    v-for="(item, index) in pagamento.pgt_json"
                    :key="index"
                    class="d-flex flex-row gap-2 align-end mb-3"
                  >
                    <div>
                      <VLabel
                        class="v-label mb-1 text-body-2 text-high-emphasis"
                      >
                        Valor do pagamento
                      </VLabel>
                      <Dinheiro
                        v-model="item.pgt_valor"
                        @update:modelValue="handleValuePgtJson"
                        class="altura-input"
                        :readonly="disabled"
                      />
                    </div>
                    <AppSelect
                      :readonly="disabled"
                      v-model="item.fpg_id"
                      :items="formasPagamento"
                      outlined
                      dense
                      item-value="fpg_id"
                      item-title="fpg_nome"
                      label="Forma do pagamento"
                      placeholder="Insira a forma que o usuário efetuou o pagamento."
                    />
                    <IconBtn
                      v-if="!disabled"
                      class="mb-1"
                      color="error"
                      @click="removeValuePgtJson(index)"
                    >
                      <VIcon icon="tabler-trash" />
                    </IconBtn>
                  </div>
                </div>

                <VDivider />
              </VCol>
              <VCol cols="12" md="6">
                <VLabel class="mb-1 text-body-2 text-high-emphasis">
                  Nota Fiscal
                  <VBtn
                    color="primary"
                    @click="$refs.nota_file.click()"
                    size="small"
                    variant="tonal"
                    class="ml-2"
                    style="height: 30px"
                    :disabled="!pagamento.pgt_id || pagamento.pgt_id === 0"
                  >
                    <VIcon icon="tabler-file-plus" class="mr-1" />
                    {{
                      !pagamento.pgt_nota_fiscal ||
                      pagamento.pgt_nota_fiscal == ""
                        ? "Nota Fiscal"
                        : "Alterar"
                    }}
                  </VBtn>
                </VLabel>
                <input
                  type="file"
                  ref="nota_file"
                  style="display: none"
                  accept=".pdf,.jpg,.jpeg,.png"
                  @change="uploadNota"
                />
                <a
                  class="mb-0 mt-2 d-flex flex-row justify-space-between cursor-pointer"
                  :href="pagamento.pgt_nota_fiscal"
                  target="_blank"
                  v-if="
                    pagamento.pgt_nota_fiscal &&
                    pagamento.pgt_nota_fiscal !== ''
                  "
                >
                  <span class="text-truncate text-sm">
                    <VIcon icon="tabler-file-text" class="mr-1" />
                    {{ pagamento.pgt_nota_fiscal.split("/").pop() }}
                  </span>

                  <VIcon
                    icon="tabler-download"
                    class="cursor-pointer"
                    size="small"
                  />
                </a>
                <p class="mb-2 mt-2 text-disabled text-caption" v-else>
                  Nenhuma nota fiscal anexada.
                </p>
              </VCol>
              <VCol cols="12" md="6">
                <VLabel class="mb-1 text-body-2 text-high-emphasis"
                  >Número da Nota Fiscal</VLabel
                >
                <VTextField
                  v-model="pagamento.pgt_numero_nota_fiscal"
                  outlined
                  dense
                  placeholder="Insira o número da nota fiscal"
                  :readonly="disabled"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VLabel class="mb-1 text-body-2 text-high-emphasis">
                  Data do pagamento
                </VLabel>

                <VTextField
                  v-model="pagamento.pgt_data"
                  type="date"
                  outlined
                  dense
                  class="mb-3"
                  :readonly="disabled"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VLabel class="mb-1 text-body-2 text-high-emphasis"
                  >Observações do Pagamento</VLabel
                >
                <VTextarea
                  v-model="pagamento.pgt_obs"
                  auto-grow
                  active
                  class="mb-3"
                  placeholder="Insira observações sobre o pagamento"
                  rows="1"
                  :readonly="disabled"
                />
              </VCol>
            </VRow>
          </VCol>
        </VRow>

        <div class="linha-flex justify-end mt-4">
          <VBtn
            variant="outlined"
            color="secondary"
            @click="closeNavigationDrawer"
          >
            Fechar
          </VBtn>
          <VBtn
            variant="outlined"
            color="error"
            @click="deletePagamento()"
            :loading="loadingDelete"
            v-if="
              !isNewPagamento &&
              !disabled &&
              can('delete', 'financeiro_recebimento')
            "
          >
            Excluir
          </VBtn>
         <!--  <VBtn
            v-if="!disabled"
            @click="savePagamento(false)"
            color="primary"
            :loading="loading"
            :disabled="loading"
          >
            Salvar
          </VBtn> -->
          <VBtn
            v-if="!disabled"
            color="success"
            @click="savePagamento(true)"
            :loading="loading"
            :disabled="loading"
          >
            Recebido
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <lembreteTable
      :isDrawerOpen="isTableLembreteVisible"
      @update:isDrawerOpen="isTableLembreteVisible = $event"
      type="Pagamento"
      :params="`https://app.oregonhigienizacao.com.br/pagamentos?tab=receber&viewPagamento=${pagamento.pgt_id}`"
    />
  </VDialog>
</template>
