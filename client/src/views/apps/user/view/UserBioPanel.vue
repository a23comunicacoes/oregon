<script setup>
import EditUserDrawer from '@/views/apps/user/list/EditUserDrawer.vue'
import { useAlert } from '@/composables/useAlert'
import { useCookieStore } from '@layouts/stores/config'
import { can } from '@layouts/plugins/casl'

const props = defineProps({
  userData: {
    type: Object,
    required: true,
  },
  cookieData: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['updateUserData'])
const { setAlert } = useAlert()
const cookieStore = useCookieStore()
const route = useRoute()
const router = useRouter()


const isEditUserDrawerVisible = ref(false)
const selectedUserData = ref({})
const isLoadingUser = ref(false)

const canChangePassword = props.cookieData.role === 'admin' || props.cookieData.id == props.userData.id

const editUser = async item => {
  isLoadingUser.value = true

  const linkApi = '/users/get-user'

  try {
    const res = await $api(linkApi, {
      method: 'POST',
      body: {
        id: item.id,
      },
    })

    if (res.results && res.results.length > 0) {
      console.log(res)

      const userd = res.results[0] // Pega o primeiro objeto do array

      selectedUserData.value = { ...userd }
      isEditUserDrawerVisible.value = true
      isLoadingUser.value = false
    }
  } catch (error) {
    console.error('Error fetching user data')
  }
}

const errors = ref({})

const edituserapi = async newUserData => {

  try {

    const formData = new FormData()

    formData.append('id', newUserData.id)
    formData.append('fullname', newUserData.fullname)
    formData.append('username', newUserData.username)
    formData.append('email', newUserData.email)
    formData.append('role', newUserData.role)

    if (newUserData.password) {
      formData.append('password', newUserData.password)
    }

    if (newUserData.avatar) {
      formData.append('avatar', newUserData.avatar[0])
    }

    const resposta = await $api('/users/update-user', {
      method: 'POST',
      body: formData,
      onResponseError({ response }) {
        errors.value = response._data.errors
      },
    })

    const dadosUser = useCookie('userData').value

    if (newUserData.id == dadosUser.id) {
      const cookieUserUpdate = await $api('/users/get-user', {
        method: 'POST',
        body: {
          id: newUserData.id,
        },
      })

      cookieStore.updateCookies({ userData: cookieUserUpdate.results[0] })
    }

    setAlert(newUserData.fullname + ' editado com sucesso!', 'success', 'tabler-check', 3000)

    emit('updateUserData', newUserData)

  } catch (error) {
    console.log('Error fetching user data. Error: ', error)
    setAlert('Ocorreu um erro ao editar o usuário, tente novamente!', 'error', 'tabler-alert-triangle', 3000)
  }
}

const deleteUser = async id => {

  //Confirmação de exclusão
  const confirm = window.confirm('Tem certeza que deseja excluir este usuário?')

  if (!confirm) {
    return
  }

  try {
    await $api(`/users/delete-user`, {
      method: 'POST',
      body: {
        id,
      },
      onResponseError({ response }) {
        errors.value = response._data.errors
      },
    })

    setAlert('Usuário excluído com sucesso!', 'success', 'tabler-trash', 3000)

    //atualizaTotalUsuarios()
    router.push('/apps/user/list')

  } catch (err) {
    console.error('Error fetching user data', err, err.response)
    setAlert('Ocorreu um erro ao excluir o usuário, tente novamente!', 'error', 'tabler-alert-triangle', 3000)
  }
}

const resolveUserRoleVariant = role => {
  const roleLowerCase = role.toLowerCase()
  if (roleLowerCase === 'gerente')
    return {
      color: 'primary',
      icon: 'tabler-chart-pie-2',
    }
  if (roleLowerCase === 'editor')
    return {
      color: 'info',
      icon: 'tabler-edit',
    }
  if (roleLowerCase === 'admin')
    return {
      color: 'secondary',
      icon: 'tabler-device-laptop',
    }

  return {
    color: 'primary',
    icon: 'tabler-user',
  }
}
</script>

<template>
  <VRow>
    <!-- SECTION User Details -->
    <VCol cols="12">
      <VCard v-if="props.userData">
        <VRow class="py-4" :class="canChangePassword ? 'pl-4' : ''">
          <VCardText class="text-center">
            <!-- 👉 Avatar -->
            <VAvatar :size="100" :color="!props.userData.avatar ? 'primary' : undefined"
              :variant="!props.userData.avatar ? 'tonal' : undefined">
              <VImg v-if="props.userData.avatar" :src="props.userData.avatar" cover />
              <span v-else class="text-5xl font-weight-medium">
                {{ avatarText(props.userData.fullName) }}
              </span>
            </VAvatar>
            <!-- 👉 User fullName -->
            <h6 class="text-h4 mt-4">
              {{ props.userData.fullName }}
            </h6>

            <!-- 👉 User Role -->
            <div class="d-flex justify-center mt-2 flex-wrap gap-5">
              <!-- 👉 Done Project -->
              <div class="d-flex align-center me-4">
                <VAvatar :size="38" rounded color="primary" variant="tonal" class="me-3">
                  <VIcon :icon="resolveUserRoleVariant(props.userData.role).icon" />
                </VAvatar>
                <div>
                  <div class="font-weight-medium text-capitalize">
                    {{ props.userData.role }}
                  </div>
                </div>
              </div>
            </div>
          </VCardText>

          <VDivider v-if="canChangePassword" />

          <!-- 👉 Details -->
          <VCardText :class="canChangePassword ? '' : 'd-flex flex-column justify-end'"
            :style="canChangePassword ? '' : 'border-left: 1px #eeeeee solid;'">
            <p class="text-sm text-uppercase text-disabled" :class="canChangePassword ? 'text-center' : ''">
              Detalhes do Usuário
            </p>
            <!-- 👉 User Details list -->
            <VList class="card-list mt-2 mb-4">
              <VListItem>
                <VListItemTitle>
                  <h6 class="text-h6">
                    Nome:
                    <span class="text-body-1">
                      {{ props.userData.fullName }}
                    </span>
                  </h6>
                </VListItemTitle>
              </VListItem>
              <VListItem>
                <VListItemTitle>
                  <h6 class="text-h6">
                    Email:
                    <span class="text-body-1">{{ props.userData.email }}</span>
                  </h6>
                </VListItemTitle>
              </VListItem>
            </VList>


            <!-- 👉 Edit and Suspend button -->
            <div class="d-flex flex-nowrap">
              <VBtn v-if="can('manage', 'all') || props.cookieData.id == props.userData.id" variant="elevated"
                class="me-4 w-auto" @click="editUser(props.userData)">
                <VIcon icon="tabler-edit" class="mr-2" /> Editar
              </VBtn>
              <VBtn v-if="can('manage', 'all')" variant="tonal" color="error" class="me-4 w-auto"
                @click="deleteUser(props.userData.id)">
                <VIcon icon="tabler-trash" class="mr-2" /> Apagar Usuário
              </VBtn>
            </div>
          </VCardText>
        </VRow>
      </VCard>
    </VCol>
    <!-- !SECTION -->
  </VRow>

  <EditUserDrawer v-if="!isLoadingUser" v-model:isDrawerOpen="isEditUserDrawerVisible" :user-data="selectedUserData"
    @user-data="edituserapi" />
</template>

<style lang="scss" scoped>
.card-list {
  --v-card-list-gap: 0.75rem;
}

.text-capitalize {
  text-transform: capitalize !important;
}
</style>
