<script setup>
import { VDataTable } from 'vuetify/labs/VDataTable';

//import router from './auth';

import { useAlert } from '@/composables/useAlert'

const { setAlert } = useAlert()

const isNewPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
const isAtualPasswordVisible = ref(false)

const atualpass = ref('')
const newpass = ref('')
const confirmpass = ref('')

const userData = useCookie('userData').value
const token = useCookie('accessToken').value

const route = useRoute()
const router = useRouter()
const ability = useAbility()

const newpassFunction = async () => {
  try {
    const res = await $api('/conta/muda-senha', {
      method: 'POST',
      body: {
        id: userData.id,
        password: atualpass.value,
        newpassword: newpass.value,
        token: token,
      },
    }).catch(error => {
      if (error.response && error.response.status === 401) {
        setAlert('Token de segurança incorreto, reinicie a página e tente novamente.', 'error', 'tabler-alert-triangle', 3000)
      } else if (error.response && error.response.status === 409) {
        setAlert('A Senha atual está incorreta.', 'error', 'tabler-alert-triangle', 3000)
      } else {
        setAlert('Erro ao fazer login. Tente novamente mais tarde.', 'error', 'tabler-alert-triangle', 3000)
      }
    })

    if (!res) return

    useCookie('userAbilityRules').value = null
    ability.update([])
    useCookie('userData').value = null
    useCookie('accessToken').value = null

    setAlert('Senha alterada com sucesso. Faça login novamente para continuar...', 'success', 'tabler-check', 5000)

    router.push('/login')
  } catch (err) {
    console.error('Change Password Erro. ', err)
    setAlert('Erro ao alterar a senha. Tente novamente mais tarde.', 'error', 'tabler-alert-triangle', 3000)
  }
}

const onSubmit = () => {
  if (newpass.value !== '' && confirmpass.value == '') {
    setAlert('Confirme a nova senha para continuar.', 'error', 'tabler-alert-triangle', 3000)
    
    return
  }
  !confirm('Tem certeza que deseja alterar sua senha? Essa ação não pode ser desfeita.') ? null : newpassFunction()
}

const confirmPasswordValidator = value => {
  if (!newpass.value) return true

  return confirmedValidator(value, newpass.value)
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <!-- 👉 Change password -->
      <VCard title="Altere sua senha">
        <VCardText>
          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <VCol
                cols="12"
                md="12"
              >
                <AppTextField
                  v-model="atualpass"
                  label="Senha Atual"
                  placeholder="············"
                  :type="isAtualPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isAtualPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :rules="[requiredValidator]"
                  required
                  @click:append-inner="isAtualPasswordVisible = !isAtualPasswordVisible"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="newpass"
                  label="Nova Senha"
                  placeholder="············"
                  :type="isNewPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isNewPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :rules="[requiredValidator]"
                  required
                  @click:append-inner="isNewPasswordVisible = !isNewPasswordVisible"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="confirmpass"
                  label="Confirme sua Senha"
                  placeholder="············"
                  :type="isConfirmPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isConfirmPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :rules="[confirmPasswordValidator]"
                  required
                  @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
                />
              </VCol>

              <VCol cols="12">
                <VBtn type="submit">
                  Alterar Senha
                </VBtn>
                <p class="text-muted">
                  <small>
                    Ao alterar sua senha, você será desconectado de todos os dispositivos. <strong>Essa ação não pode ser desfeita.</strong>
                  </small>
                </p>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
