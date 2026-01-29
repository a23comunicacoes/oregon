<script setup>
  import { PerfectScrollbar } from "vue3-perfect-scrollbar";
  import { useAlert } from "@/composables/useAlert";
  import moment from "moment";

  const loading = ref(false);
  const isNewLembrete = ref(true);

  const props = defineProps({
    isDrawerOpen: {
      type: Boolean,
      required: true,
    },
    lembreteData: Object,
    params: {
      type: String,
      default: null,
    },
  });

  const emit = defineEmits([
    "update:isDrawerOpen",
    "updateLembretes",
    "closeDrawer",
  ]);

  console.log("lembreteData:", props.lembreteData);

  const { setAlert } = useAlert();

  const lembrete = ref({
    id: 0,
    title: "",
    subtitle: "",
    params: null,
    agendado_time: "",
    repeat: 0,
    repeat_times: 0,
    repeat_type: "none",
    repeat_sucess: 0,
    notify_email: 0,
    notify_zap: 0,
    concluido: 0,
    created_at: null,
  });

  watch(
    () => props.lembreteData,
    (newVal) => {
      if (
        newVal &&
        newVal?.id !== null &&
        newVal?.id !== undefined &&
        newVal?.d !== 0
      ) {
        isNewLembrete.value = false;
        console.log("Não é novo lembrete:", newVal);
        lembrete.value = newVal;
        lembrete.value.agendado_time = moment(newVal.agendado_time).format(
          "YYYY-MM-DD HH:mm"
        );
      }
    }
  );

  watch(
    () => props.params,
    (newVal) => {
      if (newVal) {
        console.log("Params:", newVal);
        lembrete.value.params = newVal;
      }
    }
  );

  if (
    props.lembreteData &&
    props.lembreteData?.id !== null &&
    props.lembreteData?.id !== undefined &&
    props.lembreteData?.id !== 0
  ) {
    isNewLembrete.value = false;
    console.log("Não é nova lembrete:", props.lembreteData);
    lembrete.value = props.lembreteData;
    lembrete.value.agendado_time = moment(
      props.lembreteData.agendado_time
    ).format("YYYY-MM-DD HH:mm");
  }

  if (props.params) {
    console.log("Params:", props.params);
    lembrete.value.params = props.params;
  }

  const limparLembrete = () => {
    lembrete.value = {
      id: 0,
      title: "",
      subtitle: "",
      params: null,
      agendado_time: "",
      repeat: 0,
      repeat_times: 0,
      repeat_type: "none",
      repeat_sucess: 0,
      notify_email: 0,
      notify_zap: 0,
      concluido: 0,
      created_at: null,
    };
  };

  const closeNavigationDrawer = () => {
    emit("update:isDrawerOpen", false);
    limparLembrete();
  };

  const handleDrawerModelValueUpdate = (val) => {
    emit("update:isDrawerOpen", val);
  };

  const saveServico = async () => {
    console.log("Lembrete:", lembrete.value);

    if (
      !lembrete.value.title ||
      !lembrete.value.subtitle ||
      !lembrete.value.agendado_time
    ) {
      setAlert(
        "Preencha o título, texto e data e hora do lembrete para continuar!",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    let dataAgora = new Date();
    let dataAgendada = new Date(lembrete.value.agendado_time);

    if (dataAgendada < dataAgora) {
      setAlert(
        "A data e hora do lembrete não pode ser menor que a data e hora atual!",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    loading.value = true;

    let link = isNewLembrete.value
      ? "/lembretes/create"
      : `/lembretes/update/${lembrete.value.id}`;

    try {
      const res = await $api(link, {
        method: "POST",
        body: {
          lembreteData: lembrete.value,
        },
      });

      if (!res) return;

      console.log("Lembrete cadastrado com sucesso!", res);

      setAlert(
        `Lembrete ${
          isNewLembrete.value ? "cadastrado" : "atualizado"
        } com sucesso!`,
        "success",
        "tabler-user-check",
        3000
      );

      closeNavigationDrawer();
      emit("updateLembretes");
    } catch (error) {
      console.error("Erro ao cadastrar serviço:", error, error.response);
      setAlert(
        `Erro ao ${
          isNewLembrete.value ? "cadastrar" : "atualizar"
        } lembrete! Tente novamente.`,
        "error",
        "tabler-alert-triangle",
        3000
      );
    }

    loading.value = false;
  };

  const formatValor = (valor) => {
    if (!valor) return "";
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const repeatTimesOptions = [
    { value: 0, title: "Não Repetir" },
    { value: 100, title: "Repetir Sempre" },
    { value: 1, title: "1 vez" },
    { value: 2, title: "2 vezes" },
    { value: 3, title: "3 vezes" },
    { value: 4, title: "4 vezes" },
    { value: 5, title: "5 vezes" },
    { value: 6, title: "6 vezes" },
    { value: 7, title: "7 vezes" },
    { value: 8, title: "8 vezes" },
    { value: 9, title: "9 vezes" },
    { value: 10, title: "10 vezes" },
    { value: 11, title: "11 vezes" },
    { value: 12, title: "12 vezes" },
  ];

  const repeatTypeOptions = [
    { value: "none", title: "Não Repetir" },
    { value: "day", title: "Todo dia" },
    { value: "week", title: "Toda semana" },
    { value: "month", title: "Todo mês" },
    { value: "bi-month", title: "A cada 2 meses" },
    { value: "tri-month", title: "A cada 3 meses" },
    { value: "quadri-month", title: "A cada 4 meses" },
    { value: "semester", title: "A cada 6 meses" },
    { value: "year", title: "Todo ano" },
  ];
</script>
<template>
  <VDialog
    persistent
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
    width="700"
  >
    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText class="pt-2">
          <!-- 👉 Title -->
          <AppDrawerHeaderSection
            :title="isNewLembrete ? 'Cadastrar Lembrete' : 'Editar Lembrete'"
            @cancel="closeNavigationDrawer"
          />

          <VRow>
            <VCol cols="12">
              <VLabel>
                <VIcon icon="tabler-align-left" class="mr-2" /> Título
              </VLabel>
              <VTextField
                v-model="lembrete.title"
                placeholder="Insira o título do lembrete"
              />
            </VCol>

            <VCol cols="12">
              <VLabel>
                <VIcon icon="tabler-align-center" class="mr-2" /> Texto do
                Lembrete
              </VLabel>
              <VTextarea
                v-model="lembrete.subtitle"
                placeholder="Insira o texto do lembrete"
                active
                auto-grow
                rows="2"
              />
            </VCol>

            <VCol cols="12" class="d-flex flex-row gap-2">
              <p class="mb-0 mr-2">Notificar por</p>
              <VLabel>
                <VIcon icon="tabler-mail" class="mr-2" />
              </VLabel>
              <VSwitch v-model="lembrete.notify_email" :value="1"/>

              <VLabel>
                <VIcon icon="tabler-brand-whatsapp" class="mr-2" />
              </VLabel>
              <VSwitch v-model="lembrete.notify_zap" :value="1"/>
            </VCol>
          </VRow>

          <p class="my-4 font-weight-bold">Agende o lembrete</p>

          <VRow>
            <VCol cols="12">
              <VLabel>
                <VIcon icon="tabler-calendar" class="mr-2" /> Data e Hora
              </VLabel>
              <VTextField
                v-model="lembrete.agendado_time"
                type="datetime-local"
                placeholder="Insira a data e hora do lembrete"
                :min="moment().format('YYYY-MM-DD HH:mm')"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VLabel>
                <VIcon icon="tabler-repeat" class="mr-2" /> Repetir
              </VLabel>
              <VSelect
                v-model="lembrete.repeat"
                :items="repeatTimesOptions"
                placeholder="Selecione a quantidade de vezes que o lembrete irá repetir"
              />
            </VCol>

            <v-fade-transition>
              <VCol cols="12" md="6" v-if="lembrete.repeat !== 0">
                <VLabel>
                  <VIcon icon="tabler-repeat" class="mr-2" /> Frequência da
                  Repetição
                </VLabel>
                <VSelect
                  v-model="lembrete.repeat_type"
                  :items="repeatTypeOptions"
                  placeholder="Selecione a frequência da Repetição da repetição do lembrete"
                />

                <p
                  class="mt-1 mb-0 text-caption text-disabled"
                  v-if="lembrete.repeat_type != 'none'"
                >
                  O lembrete irá se repetir no mesmo dia e hora do agendamento
                  com base na frequência escolhida
                </p>
              </VCol>
            </v-fade-transition>
          </VRow>

          <VRow>
            <!-- 👉 Submit and Cancel -->
            <VCol cols="12" align="center">
              <VBtn
                class="me-3"
                @click="saveServico"
                color="primary"
                :loading="loading"
                :disabled="loading"
              >
                {{
                  loading
                    ? isNewLembrete
                      ? "Cadastrando..."
                      : "Atualizando..."
                    : isNewLembrete
                    ? "Cadastrar"
                    : "Atualizar"
                }}
              </VBtn>
              <VBtn
                variant="outlined"
                color="secondary"
                @click="closeNavigationDrawer"
              >
                Cancelar
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VDialog>
</template>
