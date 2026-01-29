<script setup>
import UserBioPanel from '@/views/apps/user/view/UserBioPanel.vue'
import UserTabAccount from '@/views/apps/user/view/UserTabAccount.vue'
import UserTabSecurity from '@/views/apps/user/view/UserTabSecurity.vue'

const cookieData = useCookie('userData').value
const route = useRoute('apps-user-view-id')
const userTab = ref(null)

const idUser = computed(() => {
  // Verifique se o ID está disponível nos parâmetros da rota
  if (route.params.id) {
    return route.params.id
  }

  // Caso contrário, use o ID do cookie
  return cookieData.id
})

const atualUser = useCookie('userData').value
const roleAtualUser = atualUser.role
const canChangePassword = roleAtualUser === 'admin' || atualUser.id == parseInt(idUser.value)

const tabs = [
  {
    icon: 'tabler-user-check',
    title: 'Detalhes do Perfil',
  },
  {
    icon: 'tabler-lock',
    title: 'Senha e Segurança',
  },
]

const getuserid = async () => {
  console.log('ID User:', idUser.value)

  const res = await $api('/users/get-user-id/?id=' + idUser.value, {
    method: 'GET',
  }).catch(error => {
    console.error('Error:', error)
  })

  if (res) {
    //console.log(res)
    return res.user
  }
}

const userData = ref(null)

onMounted(async () => {
  userData.value = await getuserid()
})

const handleUserDataUpdate = async newUserData => {
  userData.value = await getuserid()
}

const colsRow = computed(() => {
  
  //Se a largura da tela for menor que 768px, exiba a coluna inteira
  if (window.innerWidth < 768 || !canChangePassword) {
    return '12'
  } else {
    return '6'
  }

})
</script>

<template>
  <VRow v-if="userData">
    <VCol :cols="colsRow">
      <UserBioPanel
        :user-data="userData"
        :cookie-data="cookieData"
        @update-user-data="handleUserDataUpdate"
      />
    </VCol>

    <VCol
      v-if="canChangePassword"
      :cols="colsRow"
    >
      <UserTabSecurity />
    </VCol>
  </VRow>
  <VCard v-else>
    <VCardTitle class="text-center">
      Nenhum usuário encontrado
    </VCardTitle>
  </VCard>
</template>
