<script setup>
import { ref } from "vue";
import moment from "moment";
import MessageBlock from "@/views/apps/crm/fluxo-comps/message-block.vue";
import MessageBlockEmail from "@/views/apps/crm/fluxo-comps/email-block.vue";
import PreviewZap from "@/views/apps/crm/previews/preview-zap.vue";
import PreviewEmail from "@/views/apps/crm/previews/preview-email.vue";
import { temaAtual } from "@core/stores/config";

const loading = ref(false);
const isNewCampanha = ref(true);
const salvo = ref(false);

const router = useRouter();

const id = router.currentRoute.value.params.id
  ? router.currentRoute.value.params.id
  : null;

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
};

const formatValue = (value) => {
  if (!value) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const { setAlert } = useAlert();

const atualUser = useCookie("userData").value;

const campanha = ref({
  id: 0,
  types: ["zap", "email"],
  intervalo: 45, //45 segundos em segundos
  name: "",
  description: "",
  data_envio: null,
  hora_envio: null,
  status: "",
  logFile: null,
  segmentacao: null,
  created_at: null,
  updated_at: null,
});
const previewSelected = ref(null);
const searchQuery = ref("");
const statePreview = ref(null);
const messagePreview = ref(null);

const getCampanha = async () => {
  if (!id) {
    loading.value = true;
    await getSegmentacoes();

    isNewCampanha.value = true;
    loading.value = false;
    return;
  }

  loading.value = true;

  try {
    const res = await $api(`/disparos/campanhas/get/${id}`, {
      method: "GET",
    });

    if (!res) return;

    console.log("campanha gett:", res);

    campanha.value = res;
    isNewCampanha.value = false;

    await getSegmentacoes();
  } catch (error) {
    console.error("Erro ao buscar campanha:", error, error.response);
  }

  loading.value = false;
};

const segmentacoes = ref([]);

const getSegmentacoes = async () => {
  try {
    const res = await $api("/disparos/seg/gets", {
      method: "GET",
    });

    console.log("segs:", res);

    if (!res) return;

    segmentacoes.value = res;
  } catch (error) {
    console.error("Erro ao buscar segmentações:", error, error.response);
  }
};

getCampanha();

const loadingSave = ref(false);

const saveCampanha = async () => {
  if (campanha.value.name === "") {
    setAlert(
      "O nome do segmentação é obrigatório",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  }

  if (!campanha.value.segmentacao) {
    setAlert(
      "Selecione uma segmentação para a campanha",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  }

  let dataAgora = moment();

  if (
    campanha.value.data_envio === null ||
    campanha.value.hora_envio === null
  ) {
    setAlert(
      "Selecione a data e hora de envio da campanha",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  }

  let dataEnvio = moment(
    campanha.value.data_envio + " " + campanha.value.hora_envio
  );

  if (dataEnvio.isBefore(dataAgora)) {
    setAlert(
      "A data e hora de envio da campanha não pode ser anterior a data e hora atual",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  }

  //Verificiar se a diferença da data de envio pra data atual é maior que 5 minutos
  if (dataEnvio.diff(dataAgora, "minutes") < 5) {
    setAlert(
      "A data e hora de envio da campanha deve ser no mínimo 5 minutos após a data e hora atual",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  }

  if(!campanha.value.types?.length) {
    setAlert(
      "Selecione pelo menos um tipo de disparo para a campanha",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  }

  if(!campanha.value.modeloEmail && campanha.value.types.includes('email')) {
    setAlert(
      "Selecione um modelo de email para a campanha",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  }

  if (!campanha.value.modeloMensagem && campanha.value.types.includes('zap')) {
    setAlert(
      "Selecione um modelo de mensagem para a campanha",
      "error",
      "tabler-info-triangle",
      3000
    );
    return;
  }

  //intervalo
  console.log("campanha:", campanha.value);
  loadingSave.value = true;

  try {
    const res = await $api("/disparos/campanhas/save", {
      method: "POST",
      body: {
        data: campanha.value,
      },
    });

    if (!res) return;

    console.log("campanha cadastrado com sucesso!", res);
    salvo.value = true;
    setAlert(
      `Campanha ${
        isNewCampanha.value ? "cadastrada" : "atualizada"
      } com sucesso!`,
      "success",
      "tabler-user-check",
      3000
    );

    setTimeout(() => {
      router.push("/crm/campanhas");
    }, 1500);
  } catch (error) {
    console.error("Erro ao cadastrar campanha:", error, error.response);
    setAlert(
      error.response?._data?.message ||
      `Erro ao ${
        isNewCampanha.value ? "cadastrar" : "atualizar"
      } campanha! Tente novamente.`,
      "error",
      "tabler-alert-triangle",
      3000
    );
  }

  loadingSave.value = false;
};

function getDuracaoEnvio() {
  const segmentacao = segmentacoes.value.find(
    (s) => s.id === campanha.value.segmentacao
  );
  if (!segmentacao) return "-";

  let totalUsers = segmentacao.totalUsers?.total || 0;
  let intervalo = campanha.value.intervalo || 0;
  const minutos = Math.ceil((totalUsers * intervalo) / 60);
  const duracao = moment.duration(minutos, "minutes");

  let texto = "";
  if (duracao.asDays() >= 1) {
    texto = `${Math.floor(duracao.asDays())} dia${
      Math.floor(duracao.asDays()) > 1 ? "s" : ""
    }`;
    const horasRestantes = duracao.hours();
    if (horasRestantes)
      texto += ` e ${horasRestantes} hora${horasRestantes > 1 ? "s" : ""}`;
  } else if (duracao.asHours() >= 1) {
    texto = `${Math.floor(duracao.asHours())} hora${
      Math.floor(duracao.asHours()) > 1 ? "s" : ""
    }`;
    const minutosRestantes = duracao.minutes();
    if (minutosRestantes)
      texto += ` e ${minutosRestantes} minuto${
        minutosRestantes > 1 ? "s" : ""
      }`;
  } else {
    texto = `${duracao.minutes()} minuto${duracao.minutes() > 1 ? "s" : ""}`;
  }

  return texto;
}
</script>

<template>
  <div class="carregando" v-if="loading">
    <v-progress-circular
      indeterminate
      :size="44"
      :width="5"
    ></v-progress-circular>
  </div>

  <div v-else>
    <div class="mb-5">
      <VBtn variant="tonal" size="small" @click="router.push('/crm/campanhas')">
        <VIcon icon="tabler-chevron-left" />
        <span class="text-none">Voltar a lista de campanhas</span>
      </VBtn>
      <h2 class="text-h4 mb-0 mt-2">
        {{ isNewCampanha ? "Cadastrar Campanha" : "Editar Campanha" }}
      </h2>
    </div>

    <VCard class="mb-5">
      <VCardText>
        <p class="mb-0 font-weight-bold">Informações da campanha</p>
        <p class="mb-3 text-caption">
          Escolha um nome para identificar a campanha, escolha os tipos de
          disparo e adicione uma descrição caso deseje.
        </p>
        <VRow>
          <VCol cols="12" md="6">
            <AppTextField
              v-model="campanha.name"
              required
              :rules="[requiredValidator]"
              placeholder="Insira o nome da campanha"
              label="Nome da campanha"
            />

            <VLabel class="v-label mb-1 text-body-2 text-high-emphasis mt-3"
              >Tipos de disparo</VLabel
            >
            <div class="linha-flex">
              <VCheckbox
                v-model="campanha.types"
                label="Disparo por WhatsApp"
                value="zap"
                class="mr-4"
              />

              <VCheckbox
                v-model="campanha.types"
                label="Disparo por Email"
                value="email"
              />
            </div>
          </VCol>
          <VCol cols="12" md="6">
            <AppTextarea
              v-model="campanha.description"
              label="Descrição da Campanha (opcional)"
              placeholder="Insira uma descrição para a campanha"
              rows="4"
              auto-grow
              active
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
    <VRow class="match-height">
      <VCol cols="12" md="6">
        <VCard>
          <VCardText>
            <p class="mb-0 font-weight-bold">Segmentação</p>
            <p class="mb-3 text-caption">
              Selecione a segmentação que deseja utilizar para a campanha.
            </p>
            <VSelect
              v-model="campanha.segmentacao"
              :items="segmentacoes"
              item-title="name"
              item-value="id"
              placeholder="Selecione a segmentação"
            />
            <v-fade-transition>
              <div v-if="campanha.segmentacao">
                <p class="mb-0 mt-2 text-center">
                  Essa campanha será enviada para
                  {{
                    segmentacoes.find((s) => s.id === campanha.segmentacao)
                      ?.totalUsers?.total
                  }}
                  clientes.
                </p>
                <p
                  v-if="campanha.types.length > 0"
                  class="mb-0 mt-1 text-center text-sm d-flex flex-row gap-4 align-center justify-center"
                >
                  <span v-if="campanha.types.includes('zap')">
                    <VIcon icon="tabler-brand-whatsapp" />
                    {{
                      segmentacoes.find((s) => s.id === campanha.segmentacao)
                        ?.totalUsers?.totalWhatsapp
                    }}

                    Clientes
                  </span>
                  <span v-if="campanha.types.includes('email')">
                    <VIcon icon="tabler-mail" />
                    {{
                      segmentacoes.find((s) => s.id === campanha.segmentacao)
                        ?.totalUsers?.totalEmails
                    }}
                    Clientes
                  </span>
                </p>
              </div>
            </v-fade-transition>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard>
          <VCardText>
            <p class="mb-0 font-weight-bold">Data e Hora de Envio</p>
            <p class="mb-3 text-caption">
              Selecione a data e hora que deseja enviar a campanha.
            </p>
            <VRow class="mt-3 mb-2">
              <VCol cols="12" md="4" class="py-0">
                <AppTextField
                  v-model="campanha.data_envio"
                  type="date"
                  label="Data"
                  :min="moment().format('YYYY-MM-DD')"
                />
              </VCol>
              <VCol cols="12" md="4" class="py-0">
                <AppTextField
                  v-model="campanha.hora_envio"
                  type="time"
                  label="Hora"
                />
              </VCol>
              <VCol
                cols="12"
                md="4"
                class="py-0"
                v-if="campanha.types?.includes('zap')"
              >
                <VLabel class="v-label mb-1 text-body-2 text-high-emphasis">
                  Intervalo (segundos)

                  <VIcon
                    icon="tabler-info-circle-filled"
                    class="ml-1 cursor-pointer"
                    color="primary"
                  />
                  <VTooltip activator="parent">
                    <p class="text-sm mb-0">
                      Intervalo de envio entre os envios de mensagens do
                      WhatsApp!<br /><br />
                      <strong>Atenção!</strong> Quanto menor o intervalo, maior
                      a chance de ser bloqueado pelo WhatsApp!<br /><br />
                      <strong>Recomendado:</strong> 30 a 60 segundos.
                    </p>
                  </VTooltip>
                </VLabel>
                <AppTextField
                  v-model="campanha.intervalo"
                  type="number"
                  placeholder="Intervalo de envio"
                />
              </VCol>
            </VRow>
            <v-fade-transition>
              <VRow v-if="campanha.data_envio && campanha.hora_envio">
                <VCol cols="12">
                  <p class="mb-1 text-center font-weight-bold text-sm">
                    A campanha será enviada em
                    {{ moment(campanha.data_envio).format("DD/MM/YYYY") }} às
                    {{
                      moment(campanha.hora_envio, "HH:mm:ss").format("HH:mm")
                    }}
                    <span v-if="campanha.types.includes('zap')">
                      <br />
                      com intervalo de {{ campanha.intervalo }} segundos entre
                      os envios.
                    </span>
                  </p>
                </VCol>
                <VCol cols="12" md="6" v-if="campanha.types.includes('zap')">
                  <p class="mb-1 text-center text-sm">
                    <VIcon icon="tabler-brand-whatsapp" />
                    Envio por WhatsApp:
                  </p>
                  <p class="mb-0 text-center text-sm">
                    Tempo estimado:
                    {{ getDuracaoEnvio() }}
                  </p>
                  <p class="mb-0 text-center text-sm">
                    Término estimado:
                    {{
                      moment(campanha.data_envio)
                        .add(
                          campanha.intervalo *
                            segmentacoes.find(
                              (s) => s.id === campanha.segmentacao
                            )?.totalUsers?.total,
                          "seconds"
                        )
                        .format("DD/MM/YYYY HH:mm")
                    }}
                  </p>
                </VCol>
                <VCol cols="12" md="6" v-if="campanha.types.includes('email')">
                  <p class="mb-1 text-center text-sm">
                    <VIcon icon="tabler-mail" />
                    Envio por Email:
                  </p>
                  <p class="mb-0 text-center text-sm">
                    O envio por Email é feito de forma instantânea.
                  </p>
                </VCol>
              </VRow>
            </v-fade-transition>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6" v-if="campanha.types.includes('zap')">
        <VCard>
          <VCardText>
            <p class="mb-1 font-weight-bold">
              <VIcon icon="tabler-brand-whatsapp" />
              Mensagem
            </p>
            <p class="mb-3 text-caption">
              Selecione o modelo de mensagem do WhatsApp que deseja utilizar
              para a campanha.
            </p>
            <MessageBlock
              :message="campanha.modeloDataZap?.content || ''"
              :modeloSelected="campanha.modeloDataZap ?? null"
              @update:message="
                if (!campanha.modeloDataZap?.content)
                  campanha.modeloDataZap = { content: '' };
                campanha.modeloDataZap.content = $event.content;
                campanha.modeloMensagem = $event.idModelo;
              "
            />

            <VExpansionPanels v-if="campanha.modeloMensagem" class="mt-3">
              <VExpansionPanel
                title="Preview"
                :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
              >
                <VExpansionPanelText>
                  <div
                    v-if="campanha.modeloMensagem"
                    style="max-height: 250px; overflow-y: auto"
                    class="mt-2 rounded-xl"
                  >
                    <PreviewZap
                      :htmlContent="campanha.modeloDataZap?.content || ''"
                      :loading="false"
                      :hideHeader="true"
                      :headerData="{}"
                    />
                  </div>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6" v-if="campanha.types.includes('email')">
        <VCard>
          <VCardText>
            <p class="mb-1 font-weight-bold">
              <VIcon icon="tabler-mail" />
              Email
            </p>
            <p class="mb-3 text-caption">
              Selecione o modelo de email que deseja utilizar para a campanha.
            </p>
            <MessageBlockEmail
              :email="campanha.modelo?.content || ''"
              :modeloSelected="campanha.modeloDataEmail ?? null"
              @update:email="
                if (!campanha.modeloDataEmail?.content)
                  campanha.modeloDataEmail = { content: '' };
                campanha.modeloDataEmail.content = $event.content;
                campanha.modeloEmail = $event.idModelo;
              "
            />

            <VExpansionPanels v-if="campanha.modeloEmail" class="mt-3">
              <VExpansionPanel
                title="Preview"
                :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
              >
                <VExpansionPanelText>
                  <div
                    style="max-height: 250px; overflow-y: auto"
                    class="mt-2 rounded-xl"
                  >
                    <PreviewEmail
                      :htmlContent="
                        campanha.modeloDataEmail?.content?.html || ''
                      "
                      :cssContent="campanha.modeloDataEmail?.content?.css || ''"
                    />
                  </div>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <div
      class="d-flex flex-column flex-md-row gap-3 align-center justify-center mt-4"
    >
      <VBtn
        variant="outlined"
        @click="router.push('/crm/campanhas')"
        color="secondary"
      >
        Cancelar
      </VBtn>

      <VBtn color="primary" @click="saveCampanha" :loading="loadingSave">
        {{ isNewCampanha ? "Cadastrar" : "Atualizar" }}
      </VBtn>
    </div>
  </div>
</template>
