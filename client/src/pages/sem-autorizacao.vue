<script setup>
import pages401 from '@images/pages/401.png'
import miscMaskDark from '@images/pages/misc-mask-dark.png'
import miscMaskLight from '@images/pages/misc-mask-light.png'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'

const route = useRoute()
const router = useRouter()
const ability = useAbility()
const userData = useCookie('userData')

definePage({
  alias: '/pages/misc/not-authorized',
  meta: {
    layout: 'blank',
    public: true,
  },
})

const authThemeMask = useGenerateImageVariant(miscMaskLight, miscMaskDark)

const logout = async () => {

  // Remove "accessToken" from cookie
  useCookie('accessToken').value = null

  // Remove "userData" from cookie
  userData.value = null

  // ℹ️ We had to remove abilities in then block because if we don't nav menu items mutation is visible while redirecting user to login page

  // Remove "userAbilities" from cookie
  useCookie('userAbilityRules').value = null

  // Reset ability to initial ability
  ability.update([])

  //Aguardar 2 segundos para redirecionar
  await new Promise(resolve => setTimeout(resolve, 2000))

  //Redirect to login page
  window.location.href = '/login'
}
</script>

<template>
  <div class="misc-wrapper">
    <ErrorHeader
      status-code="401"
      title="Você não tem permissão pra acessar essa parte do sistema! 🔐"
      description="Você não tem permissão para visualizar esta página usando as credenciais fornecidas durante o login.
       Entre em contato com o seu administrador se acredita que isso é um erro."
    />

    <VBtn
      class="mt-2"
      to="/"
      prepend-icon="tabler-home"
      style="text-transform: none !important;"
    >
      Voltar para a página inicial
    </VBtn>
    <p class="text-center mb-1 mt-1">
      ou
    </p>
    <VBtn
      class="mt-1 mb-10"
      append-icon="tabler-logout"
      style="text-transform: none !important;"
      @click="logout"
    >
      Sair da conta
    </VBtn>

    <!-- 👉 Image -->
    <div class="misc-avatar w-100 text-center">
      <VImg
        :src="pages401"
        alt="Coming Soon"
        :max-width="170"
        class="mx-auto"
      />
    </div>

    <VImg
      :src="authThemeMask"
      class="misc-footer-img d-none d-md-block"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/misc.scss";
</style>
