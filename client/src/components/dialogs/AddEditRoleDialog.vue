<script setup>
import { VForm } from 'vuetify/components/VForm'
import { useAlert } from '@/composables/useAlert'

const props = defineProps({
  rolePermissions: {
    type: Object,
    required: false,
    default: () => ({
      id: '',
      name: '',
      permissions: [],
    }),
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits([
  'update:isDialogVisible',
  'update:rolePermissions',
])

const { setAlert } = useAlert()

const permissions = ref([])

const permission_api = async () => {
  try {
    const res = await $api('/roles/perm/list', { method: 'GET' })

    const apiPermissions = res.results.map(perm => ({
      name: perm.name,
      read: false,
      write: false,
      create: false,
    }))

    permissions.value = apiPermissions
  } catch (error) {
    console.error('Error fetching permissions')
  }
}

permission_api()

const isSelectAll = ref(false)
const role = ref('')
const id = ref('')
const refPermissionForm = ref()

const checkedCount = computed(() => {
  let counter = 0
  permissions.value.forEach(permission => {
    Object.entries(permission).forEach(([key, value]) => {
      if (key !== 'name' && value)
        counter++
    })
  })

  return counter
})

const isIndeterminate = computed(() => checkedCount.value > 0 && checkedCount.value < permissions.value.length * 3)

// select all
watch(isSelectAll, val => {
  permissions.value = permissions.value.map(permission => ({
    ...permission,
    read: val,
    write: val,
    create: val,
  }))
})

// if Indeterminate is false, then set isSelectAll to false
watch(isIndeterminate, () => {
  if (!isIndeterminate.value)
    isSelectAll.value = false
})

// if all permissions are checked, then set isSelectAll to true
watch(permissions, () => {
  if (checkedCount.value === permissions.value.length * 3)
    isSelectAll.value = true
}, { deep: true })

// if rolePermissions is not empty, then set permissions
watch(props, () => {
  if (props.rolePermissions && props.rolePermissions.permissions) {
    role.value = props.rolePermissions.name
    id.value = props.rolePermissions.id

    let parsedPermissions

    // Verifica se 'permissions' é uma string e faz o parse, caso contrário, usa diretamente
    if (typeof props.rolePermissions.permissions === 'string') {
      parsedPermissions = JSON.parse(props.rolePermissions.permissions)
    } else {
      // Se já for um objeto ou array, usa diretamente
      parsedPermissions = props.rolePermissions.permissions
    }

    permissions.value = permissions.value.map(permission => {
      const rolePermission = parsedPermissions.find(item => item.name === permission.name)
      
      return rolePermission ? { ...permission, ...rolePermission } : permission
    })
  }
})


const errors = ref([])

const add_role = async () => {
  try {
    // Preparar o objeto com os dados a serem enviados
    const rolePermissionsAPI = {
      name: role.value,
      permissions: permissions.value.filter(perm => perm.read || perm.write || perm.create),
    }

    const res = await $api('/roles/add-role', {
      method: 'POST',
      body: JSON.stringify(rolePermissionsAPI),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(error => {
      if (error.response && error.response.status === 409) {
        // Lida especificamente com erro 409
        setAlert('O setor já existe, escolha outro nome para o novo setor.', 'error', 'tabler-alert-triangle', 3000)
      } else {
        // Lida com outros erros
        setAlert('Erro ao adicionar setor', 'error', 'tabler-alert-triangle', 3000)
      }
      console.error('Erro ao adicionar setor')
    })
    
    if (!res) return
    
    setAlert('Setor ' + rolePermissionsAPI.name + ' adicionado com sucesso!', 'success', 'tabler-plus', 3000)
    emit('update:rolePermissions', rolePermissionsAPI)
    emit('update:isDialogVisible', false)
    isSelectAll.value = false
    refPermissionForm.value?.reset()

  } catch (err) {
    console.error('Erro ao adicionar setor')
    setAlert('Erro ao adicionar setor!', 'error', 'tabler-alert-triangle', 3000)
  }
}

const edit_role = async () => {
  try {
    // Preparar o objeto com os dados a serem enviados
    const rolePermissionsAPI = {
      id: id.value,
      name: role.value,
      permissions: permissions.value.filter(perm => perm.read || perm.write || perm.create),
    }

    const res = await $api('/roles/edit-role', {
      method: 'POST',
      body: JSON.stringify(rolePermissionsAPI),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(error => {
      setAlert('Erro ao atualizar setor! Tente novamente.', 'error', 'tabler-alert-triangle', 3000)
      console.error('Erro ao atualizar setor')
    })

    if (!res) return

    setAlert('Setor ' + rolePermissionsAPI.name + ' atualizado com sucesso!', 'success', 'tabler-plus', 3000)
    emit('update:rolePermissions', rolePermissionsAPI)
    emit('update:isDialogVisible', false)
    isSelectAll.value = false
    refPermissionForm.value?.reset()

  } catch (err) {
    console.error('Erro ao atualizar setor')
    setAlert('Erro ao atualizar setor! Tente novamente.', 'error', 'tabler-alert-triangle', 3000)
  }
}

const onSubmit = () => {
  refPermissionForm.value?.validate().then(({ valid }) => {
    if (valid) {
      if (props.rolePermissions.name) {
        edit_role()
      } else {
        add_role()
      }
    }
  })
}

const onReset = () => {
  emit('update:isDialogVisible', false)
  isSelectAll.value = false
  refPermissionForm.value?.reset()
}
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 900"
    :model-value="props.isDialogVisible"
    @update:model-value="onReset"
  >
    <!-- 👉 Dialog close btn -->
    <DialogCloseBtn @click="onReset" />

    <VCard class="pa-sm-8 pa-5">
      <!-- 👉 Title -->
      <VCardItem class="text-center">
        <VCardTitle class="text-h3 mb-3">
          {{ props.rolePermissions.name ? 'Editar' : 'Adicionar Novo' }} setor {{ props.rolePermissions.name }}
        </VCardTitle>
        <p class="text-base mb-0">
          Edite as permissões do setor
        </p>
      </VCardItem>

      <VCardText class="mt-6">
        <!-- 👉 Form -->
        <VForm
          ref="refPermissionForm"
          v-model="refPermissionForm"
          @submit.prevent="onSubmit"
        >
          <!-- 👉 Role name -->
          <AppTextField
            v-model="role"
            label="Role Name"
            placeholder="Enter Role Name"
            :rules="[requiredValidator]"
            required
          />

          <!-- 👉 Role Permissions -->

          <VTable class="permission-table text-no-wrap">
            <!-- 👉 Admin  -->
            <tr>
              <td>
                <h6 class="text-h4 mt-8 mb-3">
                  Permissões
                </h6>
              </td>
              <td colspan="3">
                <div class="d-flex justify-end">
                  <VCheckbox
                    v-model="isSelectAll"
                    v-model:indeterminate="isIndeterminate"
                    label="Selecionar Todos"
                  />
                </div>
              </td>
            </tr>

            <!-- 👉 Other permission loop -->
            <template
              v-for="permission in permissions"
              :key="permission.name"
            >
              <tr>
                <td>{{ permission.name }}</td>
                <td>
                  <div class="d-flex justify-end">
                    <VCheckbox
                      v-model="permission.read"
                      label="Ler"
                    />
                  </div>
                </td>
                <td>
                  <div class="d-flex justify-end">
                    <VCheckbox
                      v-model="permission.write"
                      label="Escrever"
                    />
                  </div>
                </td>
                <td>
                  <div class="d-flex justify-end">
                    <VCheckbox
                      v-model="permission.create"
                      label="Criar"
                    />
                  </div>
                </td>
              </tr>
            </template>
          </VTable>

          <!-- 👉 Actions button -->
          <div class="d-flex align-center justify-center gap-3 mt-6">
            <VBtn @click="onSubmit">
              {{ props.rolePermissions.name ? 'Salvar' : 'Adicionar' }}
            </VBtn>

            <VBtn
              color="secondary"
              variant="tonal"
              @click="onReset"
            >
              Cancelar
            </VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss">
.permission-table {
  td {
    border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    padding-block: 0.5rem;

    .v-checkbox {
      min-inline-size: 4.75rem;
    }

    &:not(:first-child) {
      padding-inline: 0.5rem;
    }

    .v-label {
      white-space: nowrap;
    }
  }
}
</style>
