<!-- <script setup>

import { VForm } from 'vuetify/components/VForm'
import bklogin from '@images/pages/bk-login.svg'
import { useAlert } from '@/composables/useAlert'

const { setAlert } = useAlert()

definePage({
  meta: {
    layout: 'blank',
    unauthenticatedOnly: true,
  },
})

const form = ref({
  fullName: '',
  email: '',
  password: '',
  privacyPolicies: false,
})

const errors = ref({
  fullName: undefined,
  email: undefined,
  password: undefined,
})

const isPasswordVisible = ref(false)
const route = useRoute()
const router = useRouter()
const ability = useAbility()

const refVForm = ref()

const register = async () => {
  try {
    const res = await $api('/conta/register', {
      method: 'POST',
      body: {
        fullName: form.value.fullName,
        email: form.value.email,
        password: form.value.password,
      },
      onResponseError({ response }) {
        errors.value = response._data.errors
      },
    })

    console.log('Register Response: ', res.response)

    const { accessToken, userData, userAbilityRules } = res.response

    const userAbilityRulesJSON = JSON.parse(userAbilityRules)

    useCookie('userAbilityRules').value = userAbilityRulesJSON
    ability.update(userAbilityRulesJSON)

    useCookie('accessToken').value = accessToken
    useCookie('userData').value = userData

    setAlert('Cadastro realizado com sucesso! Você será redirecionado...', 'success', 'tabler-check', 5000)

    await nextTick(() => {
      router.replace(route.query.to ? String(route.query.to) : '/')
    })
  } catch (error) {
    console.error('Register Error: ', error)
    console.log('Register Error: ', error.response)
    let errorData = error.response?._data

    if (errorData && errorData !== undefined) {
      setAlert(errorData, 'error', 'tabler-alert-triangle', 5000)
    } else {
      setAlert('Erro ao fazer cadastro. Tente novamente mais tarde.', 'error', 'tabler-alert-triangle', 5000)
    }

  }
}

const onSubmit = () => {
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (isValid)
      register()
  })
}
</script>

<template>
  <VRow
    no-gutters
    class="auth-wrapper bg-surface justify-center align-center"
    :style="`background-image: url(${bklogin}); background-size: 100%; background-repeat: no-repeat;background-position: center center;`"
  >
    <VCardText class="text-center d-lg-flex align-center justify-center">
      <img
        src="@images/logo.png"
        alt="logo"
        style="width: 15%; max-width: 100%; height: auto;"
      >
    </VCardText>
    <VCol
      cols="12"
      md="4"
      class="auth-card-v2 d-flex align-center justify-center"
      style="background-color: rgb(var(--v-theme-surface));"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <h5 class="text-h5 mb-1">
            Crie sua conta
          </h5>
          <p class="mb-0">
            Para continuar, cadastre-se com sua conta de e-mail, nome de usuário, seu nome e senha.
          </p>
        </VCardText>

        <VCardText>
          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              
              <VCol cols="12">
                <AppTextField
                  v-model="form.fullName"
                  :rules="[requiredValidator]"
                  label="Seu nome"
                  placeholder="Insira seu nome"
                  required
                />
              </VCol>

              
              <VCol cols="12">
                <AppTextField
                  v-model="form.email"
                  :rules="[requiredValidator, emailValidator]"
                  label="Email"
                  type="email"
                  placeholder="Insira seu email"
                />
              </VCol>

             
              <VCol cols="12">
                <AppTextField
                  v-model="form.password"
                  :rules="[requiredValidator]"
                  label="Senha"
                  placeholder="············"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <div class="d-flex align-center mt-2 mb-4">
                  <VCheckbox
                    id="privacy-policy"
                    v-model="form.privacyPolicies"
                    inline
                    aria-checked="true"
                  />
                  <VLabel
                    for="privacy-policy"
                    style="opacity: 1;"
                  >
                    <span class="me-1">Eu aceito os</span>
                    <a
                      href="javascript:void(0)"
                      class="text-primary"
                    >termos de condição</a>
                  </VLabel>
                </div>

                <VBtn
                  block
                  type="submit"
                >
                  Cadastrar
                </VBtn>
              </VCol>

      
              <VCol
                cols="12"
                class="text-center text-base"
              >
                <span>Já tem uma conta?</span>
                <RouterLink
                  class="text-primary ms-2"
                  :to="{ name: 'login' }"
                >
                  Faça login
                </RouterLink>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth.scss";
</style>
 -->

 <script setup>

 const router = useRouter()

 router.push({ name: 'login' })
 </script>

  <template></template>