<script setup>
import { PerfectScrollbar } from "vue3-perfect-scrollbar";
import { useAlert } from "@/composables/useAlert";
import { can } from "@layouts/plugins/casl";

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  userData: Object,
});

const emit = defineEmits(["update:isDrawerOpen", "userData"]);

const route = useRoute();

const rota = route.path;

const { setAlert } = useAlert();

const atualUser = useCookie("userData").value;
const roleAtualUser = atualUser.role;

const isPasswordVisible = ref(false);
const isConfirmPasswordVisible = ref(false);
const isFormValid = ref(false);
const refForm = ref();
const idUser = ref("");
const avatar = ref([]);
const fullName = ref("");
const email = ref("");
const phone = ref("");
const role = ref();
const password = ref("");
const confirmPassword = ref("");
const isGeneratePassword = ref(true);
const color = ref("");
const expIni = ref(null);
const expFim = ref(null);
const podeAgendamento = ref(false);

//Formatar data para o formato yyyy-mm-dd
const formatDate = (date) => {
  if (!date) return null;

  const data = new Date(date);
  const dia = data.getDate().toString().padStart(2, "0");
  const mes = (data.getMonth() + 1).toString().padStart(2, "0");
  const ano = data.getFullYear();

  return `${ano}-${mes}-${dia}`;
};

const colorShow = ref(false);

const swatches = [
  ["#FFFF00", "#AAAA00", "#555500"], // amarelo
  ["#00FF00", "#00AA00", "#005500"], // verde
  ["#FFA500", "#FF8C00", "#FF4500"], // laranja
  ["#FF0000", "#AA0000", "#550000"], // vermelho
  ["#FF00FF", "#AA00AA", "#550055"], // mantendo
];

const roles = ref([]); // Inicializa permissions como um array vazio

const roles_api = async () => {
  try {
    const res = await $api("/roles/list-role", { method: "GET" });

    // Nome da role
    const apiRoles = res.results.map((role) => role.role_name);

    //Remover a role "admin" da lista de roles
    if (roleAtualUser !== "admin") {
      const index = apiRoles.indexOf("admin");
      if (index > -1) {
        apiRoles.splice(index, 1);
      }
    }

    // Atualiza a variável permissions com os dados da API
    roles.value = apiRoles;
  } catch (error) {
    console.error("Error fetching roles:", error);
  }
};

// Chama a função para obter e definir as permissões
roles_api();

// 👉 drawer close
const closeNavigationDrawer = () => {
  emit("update:isDrawerOpen", false);
};

const onSubmit = async () => {
  const isValid = await refForm.value.validate();
  if (!isValid) return;

  if (password.value !== "" && confirmPassword.value == "") {
    setAlert(
      "Confirme a senha para continuar.",
      "error",
      "tabler-alert-triangle",
      3000
    );

    return;
  }

  const data = {
    id: idUser.value,
    avatar: avatar.value,
    fullname: fullName.value,
    phone: phone.value,
    email: email.value,
    role: role.value,
    color: color.value,
    password: password.value,
    expIni: expIni.value,
    expFim: expFim.value,
    podeAgendamento: podeAgendamento.value,
  };

  emit("userData", data);
  closeNavigationDrawer();
};

const avatarimg = ref("");

const convertFileToDataURL = (file) => {
  return new Promise((resolve, reject) => {
    if (file) {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    } else {
      reject("Nenhum arquivo fornecido");
    }
  });
};

watch(avatar, async (newAvatar) => {
  if (newAvatar && newAvatar.length > 0 && newAvatar[0] instanceof File) {
    try {
      avatarimg.value = await convertFileToDataURL(newAvatar[0]);
    } catch (error) {
      console.error("Erro ao converter o arquivo para URL de dados:", error);
    }
  } else {
    avatarimg.value = ""; // Se não houver arquivo, resete a pré-visualização
  }
});

watch(
  () => props.userData,
  (newUserData) => {
    const idAlter = newUserData.id;
    if (newUserData) {
      idUser.value = idAlter;

      //avatar.value = newUserData.avatar || '';
      avatarimg.value = newUserData.avatar || "";
      fullName.value = newUserData.fullName || "";
      phone.value = newUserData.phone || "";
      email.value = newUserData.email || "";
      role.value = newUserData.role || "";
      color.value = newUserData.color || "";
      expIni.value = formatDate(newUserData.expIni) || "";
      expFim.value = formatDate(newUserData.expFim) || "";
      podeAgendamento.value = newUserData.podeAgendamento || false;
    }
  },
  { immediate: true }
);

const handleDrawerModelValueUpdate = (val) => {
  emit("update:isDrawerOpen", val);
};

const confirmPasswordValidator = (value) => {
  if (!password.value) return true;

  return confirmedValidator(value, password.value);
};

//Validador de foto, definindo o tamanho máximo
const FotoValidador = (value) => {
  if (!value) return true;

  return value.size < 5000000 || "A foto deve ter menos de 5 MB!";
};

//Envia email para resetar senha
const sendEmail = ref("tabler-send");

const sendEmailResetPassword = async (email) => {
  sendEmail.value = "tabler-loader";
  try {
    const res = await $api("/conta/resetar-senha", {
      method: "POST",
      body: { email },
    });

    if (!res) return;

    console.log("Email enviado com sucesso!", res);

    setAlert("Email enviado com sucesso!", "success", "tabler-mail", 3000);

    //Mudar o ícone do botão para check e após 3 segundos voltar ao ícone original
    sendEmail.value = "tabler-check";
    setTimeout(() => {
      sendEmail.value = "tabler-send";
    }, 3000);
  } catch (error) {
    console.log("Erro ao enviar email:", error);
    console.error("Erro ao enviar email:", error.response);
    setAlert(
      "Ocorreu um erro ao enviar email, tente novamente.",
      "error",
      "tabler-alert-triangle",
      3000
    );
  }
};

const confirmPasswordMatchValidator = (value) => {
  return confirmedValidator(value, password.value);
};
</script>

<template>
  <VNavigationDrawer
    temporary
    :width="400"
    location="end"
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <!-- 👉 Title -->
    <AppDrawerHeaderSection
      title="Editar Usuário"
      @cancel="closeNavigationDrawer"
    />

    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText>
          <!-- 👉 Form -->
          <VForm ref="refForm" v-model="isFormValid" @submit.prevent="onSubmit">
            <VRow>
              <!-- Input hidden ID -->
              <input v-model="idUser" type="hidden" />
              <!-- Avatar -->
              <VCol
                cols="12"
                class="d-flex justify-center flex-row align-center gap-5"
              >
                <VAvatar
                  :color="!avatarimg ? 'primary' : undefined"
                  :variant="!avatarimg ? 'tonal' : undefined"
                  size="80"
                >
                  <VImg v-if="avatarimg" :src="avatarimg" cover />
                  <VIcon v-else icon="tabler-user" />
                </VAvatar>

                <VFileInput
                  v-model="avatar"
                  accept="image/png, image/jpeg, image/bmp"
                  placeholder="Escolha uma foto"
                  icon="mdi-camera"
                  label="Foto de Perfil"
                  class="overflow-x-hidden"
                  :ruler="[FotoValidador]"
                />
              </VCol>

              <!-- 👉 Full name -->
              <VCol cols="12">
                <AppTextField
                  v-model="fullName"
                  :rules="[requiredValidator]"
                  label="Nome"
                  placeholder="Insira um nome"
                  required
                />
              </VCol>

              <!-- 👉 Email -->
              <VCol cols="12">
                <AppTextField
                  v-model="email"
                  :rules="[requiredValidator, emailValidator]"
                  label="Email"
                  placeholder="Insira um email"
                  required
                />
              </VCol>
              
              <!-- 👉 Phone -->
              <VCol cols="12">
                <AppTextField
                  v-model="phone"
                  label="Telefone/Whatsapp"
                  placeholder="Insira um telefone"
                  v-mask="['(##) #####-####', '(##) ####-####']"
                  tooltip="O telefone/whatsapp será utilizado para envio de notificações e lembretes."
                />
              </VCol>

              <!-- 👉 Role -->
              <VCol cols="12">
                <AppSelect
                  v-model="role"
                  label="Selecione a Função"
                  placeholder="Selecione a Função"
                  :rules="[requiredValidator]"
                  :items="roles"
                  required
                  class="text-capitalize"
                />
              </VCol>

              <!-- 👉 Cor-->
              <VDialog v-model="colorShow" persistent width="auto">
                <VCard class="pa-3">
                  <VColorPicker
                    v-model="color"
                    class="ma-2"
                    :swatches="swatches"
                    show-swatches
                    hide-inputs
                    :modes="['hexa']"
                    
                  />
                  <VBtn
                    :color="color ? color : '#3182CE'"
                    @click="colorShow = !colorShow"
                  >
                    <VIcon>tabler-color-picker</VIcon>
                    Salvar cor
                  </VBtn>
                </VCard>
              </VDialog>

              <VExpansionPanels class="mb-4 mt-2">
                <VExpansionPanel>
                  <VExpansionPanelTitle>
                    <p class="text-h6 mb-0 w-100">Expiração</p>
                  </VExpansionPanelTitle>
                  <VExpansionPanelText class="pa-2">
                    <VRow>
                      <!-- Exp -->
                      <VCol cols="12">
                        <AppTextField
                          v-model="expIni"
                          label="Data de Inicio"
                          placeholder="Insira uma data de inicio"
                          type="date"
                          clearable
                        />
                        <p class="mb-0 mt-1 text-caption">
                          Insira a partir de qual data que este usuário terá
                          acesso deixe em branco caso ele seja permanente.
                        </p>
                      </VCol>

                      <VCol cols="12">
                        <AppTextField
                          v-model="expFim"
                          label="Data de Fim"
                          placeholder="Insira uma data de fim"
                          type="date"
                          clearable
                        />
                        <p class="mb-0 mt-1 text-caption">
                          Insira até qual data que este usuário terá acesso
                          deixe em branco caso ele seja permanente.
                        </p>
                      </VCol>
                    </VRow>
                  </VExpansionPanelText>
                </VExpansionPanel>

                <VExpansionPanel>
                  <VExpansionPanelTitle>
                    <p class="text-h6 mb-0 w-100">Opções de Agendamento</p>
                  </VExpansionPanelTitle>
                  <VExpansionPanelText class="pa-2">
                    <VSwitch v-model="podeAgendamento" color="primary" :value="1">
                      <template #label>
                        <span class="text-sm">Técnico de Agendamento</span>

                        <VIcon
                          icon="tabler-info-circle-filled"
                          size="16"
                          class="ml-2"
                          color="primary"
                        />

                        <VTooltip activator="parent">
                          <span class="text-sm text-center">
                            Ao ativar essa opção, o usuário será incluído na
                            listagem<br />
                            de técnicos de agendamento (calendário, listas e
                            etc).
                          </span>
                        </VTooltip>
                      </template>
                    </VSwitch>
                    <template v-if="podeAgendamento">
                      <VDivider class="mb-2 mt-4" />
                      <p class="my-2 text-center text-sm">
                        Cor no calendário de agendamentos
                      </p>
                      <VBtn
                        :color="color ? color : '#3182CE'"
                        @click="colorShow = !colorShow"
                        class="w-100"
                      >
                        <VIcon>tabler-color-picker</VIcon>
                        {{ color ? color : "#3182CE" }}
                      </VBtn>
                    </template>
                  </VExpansionPanelText>
                </VExpansionPanel>

                <VExpansionPanel>
                  <VExpansionPanelTitle>
                    <p class="text-h6 mb-0 w-100">Alterar Senha</p>
                  </VExpansionPanelTitle>
                  <VExpansionPanelText>
                    <VCol
                      cols="12"
                      class="d-flex flex-nowrap justify-space-between"
                    >
                      <p class="mb-0">
                        Enviar um link para o usuário definir a senha
                      </p>
                      <VSwitch v-model="isGeneratePassword" color="primary" />
                    </VCol>
                    <VRow no-gutters>
                      <VRow
                        v-if="!isGeneratePassword"
                        no-gutters
                        class="gap-2 mt-2"
                      >
                        <VCol cols="12">
                          <AppTextField
                            v-model="password"
                            :rules="[requiredValidator]"
                            label="Senha"
                            placeholder="Insira uma senha"
                            required
                            :type="isPasswordVisible ? 'text' : 'password'"
                            :append-inner-icon="
                              isPasswordVisible
                                ? 'tabler-eye-off'
                                : 'tabler-eye'
                            "
                            @click:append-inner="
                              isPasswordVisible = !isPasswordVisible
                            "
                          />
                        </VCol>
                        <VCol cols="12">
                          <AppTextField
                            v-model="confirmPassword"
                            :rules="[
                              requiredValidator,
                              confirmPasswordMatchValidator,
                            ]"
                            label="Confirmar Senha"
                            placeholder="Confirme a senha"
                            required
                            :type="
                              isConfirmPasswordVisible ? 'text' : 'password'
                            "
                            :append-inner-icon="
                              isConfirmPasswordVisible
                                ? 'tabler-eye-off'
                                : 'tabler-eye'
                            "
                            @click:append-inner="
                              isConfirmPasswordVisible =
                                !isConfirmPasswordVisible
                            "
                          />
                        </VCol>
                      </VRow>
                      <VRow
                        v-if="isGeneratePassword"
                        no-gutters
                        class="gap-2 mt-2"
                      >
                        <VCol
                          v-if="isGeneratePassword"
                          cols="12"
                          align="center"
                          style="margin-bottom: -15px"
                        >
                          <VBtn
                            color="primary"
                            variant="outlined"
                            style="text-transform: none"
                            :append-icon="sendEmail"
                            @click="
                              sendEmailResetPassword(props.userData.email)
                            "
                          >
                            Enviar email de redefinição de senha
                          </VBtn>
                          <p class="text-caption mt-2 mb-0 text-center w-100">
                            Clique no botão para enviar um email de redefinição
                            de senha ao email do usuário.
                            <strong>O email tem validade de 1 hora!</strong>
                          </p>
                        </VCol>
                      </VRow>
                    </VRow>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>

              <!-- 👉 Submit and Cancel -->
              <VCol cols="12">
                <VBtn type="submit" class="me-3"> Salvar </VBtn>
                <VBtn
                  type="reset"
                  variant="outlined"
                  color="secondary"
                  @click="closeNavigationDrawer"
                >
                  Cancelar
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VNavigationDrawer>
</template>

<style>
.v-list-item-title {
  text-transform: capitalize;
}
</style>
