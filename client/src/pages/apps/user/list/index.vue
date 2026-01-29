<script setup>
  import { VDataTableServer } from "vuetify/labs/VDataTable";
  import AddNewUserDrawer from "@/views/apps/user/list/AddNewUserDrawer.vue";
  import EditUserDrawer from "@/views/apps/user/list/EditUserDrawer.vue";
  import { paginationMeta } from "@api-utils/paginationMeta";
  import { useCookieStore } from "@layouts/stores/config";
  import { can } from "@layouts/plugins/casl";

  import { useAlert } from "@/composables/useAlert";

  const { setAlert } = useAlert();
  const cookieStore = useCookieStore();

  const userData = useCookie("userData").value;
  const userRole = userData.role;

  const loading = ref(true);

  // 👉 Store
  const searchQuery = ref("");
  const selectedRole = ref(null);
  const statusQuery = ref(null);
  const podeAgendamentoQuery = ref(null);

  // Data table options
  const itemsPerPage = ref(10);
  const page = ref(1);
  const sortBy = ref();
  const orderBy = ref();

  const updateOptions = (options) => {
    page.value = options.page;
    sortBy.value = options.sortBy[0]?.key;
    orderBy.value = options.sortBy[0]?.order;

    getUsers();
  };

  // Headers
  const headers = [
    {
      title: "Usuários",
      key: "user",
    },
    {
      title: "Função",
      key: "role",
    },
    {
      title: "Agendamento",
      key: "podeAgendamento",
    },
    {
      title: "Expiração",
      key: "exp",
      sortable: false,
    },
    {
      title: "Ações",
      key: "actions",
      sortable: false,
    },
  ];

  const users = ref([]);
  const totalUsers = ref(0);

  const widgetData = ref([
    {
      title: "Usuários",
      value: totalUsers.value,
      desc: "Total de usuários na sua empresa",
      icon: "tabler-user",
      iconColor: "primary",
    },
  ]);

  const getUsers = async () => {
    loading.value = true;

    try {
      const res = await $api("/users/list", {
        method: "GET",
        query: {
          q: searchQuery.value,
          role: selectedRole.value,
          status: statusQuery.value,
          podeAgendamento: podeAgendamentoQuery.value,
          itemsPerPage: itemsPerPage.value,
          page: page.value,
          sortBy: sortBy.value,
          orderBy: orderBy.value,
        },
      });

      console.log("Users", res.users);

      users.value = res.users;
      totalUsers.value = res.totalUsers;
      widgetData.value[0].value = res.totalUsers;
    } catch (error) {
      console.error("Error fetching users", error, error.response);
    }

    loading.value = false;
  };

  onMounted(() => {
    getUsers();
  });

  const roles = ref([]); // Inicializa permissions como um array vazio

  const roles_api = async () => {
    try {
      const res = await $api("/roles/list-role", { method: "GET" });

      // Mapeia os resultados para o formato esperado
      const apiRoles = res.results.map((role) => ({
        title: role.role_name,
        value: role.role_name,
      }));

      // Atualiza a variável permissions com os dados da API
      roles.value = apiRoles;
    } catch (error) {
      console.error("Error fetching roles");
    }
  };

  roles_api();

  const resolveUserRoleVariant = (item) => {
    const roleLowerCase = item.role.toLowerCase();
    if (roleLowerCase === "gerente")
      return {
        color: "primary",
        icon: "tabler-chart-pie-2",
      };
    if (roleLowerCase === "colaborador")
      return {
        color: item.color ? item.color : "info",
        icon: "tabler-calendar-user",
      };
    if (roleLowerCase === "admin")
      return {
        color: "secondary",
        icon: "tabler-device-laptop",
      };

    return {
      color: "primary",
      icon: "tabler-user",
    };
  };

  const isAddNewUserDrawerVisible = ref(false);
  const isEditUserDrawerVisible = ref(false);
  const isLoadingAdd = ref(false);

  const addNewUser = async (userData) => {
    console.log("Add new user", userData);
    isLoadingAdd.value = true;
    try {
      const formDataAdd = new FormData();

      formDataAdd.append("fullname", userData.fullname);
      formDataAdd.append("email", userData.email);
      formDataAdd.append("phone", userData.phone);
      formDataAdd.append("role", userData.role);
      formDataAdd.append("password", userData.password);
      formDataAdd.append("color", userData.color);
      formDataAdd.append("expIni", userData.expIni);
      formDataAdd.append("expFim", userData.expFim);
      formDataAdd.append("podeAgendamento", userData.podeAgendamento);

      if (userData.avatar) {
        formDataAdd.append("avatar", userData.avatar[0]);
      }

      let linkApiAdd = "/users/add-user";

      if (userData.isGeneratePassword) {
        linkApiAdd = "/users/add-user-generate";
      }

      const res = await $api(linkApiAdd, {
        method: "POST",
        body: formDataAdd,
      }).catch((error) => {
        isLoadingAdd.value = false;
        console.error("Error fetching user data", error, error.response);
        setAlert(
          error.response?._data?.message ||
            "Ocorreu um erro ao adicionar o usuário, tente novamente!",
          "error",
          "tabler-alert-triangle",
          3000
        );
      });

      if (!res) return;

      setAlert(
        (userData.fullname || "Usuário") + " adicionado com sucesso!",
        "success",
        "tabler-plus",
        3000
      );
      isLoadingAdd.value = false;
      getUsers();
    } catch (err) {
      isLoadingAdd.value = false;
      console.error("Error fetching user data", err, err.response);
      setAlert(
        err.response?._data?.message ||
          "Ocorreu um erro ao adicionar o usuário, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const selectedUserData = ref({});
  const isLoadingUser = ref(false);

  const editUser = async (item) => {
    isLoadingUser.value = true;

    try {
      const res = await $api("/users/get-user", {
        method: "POST",
        body: {
          id: item.id,
        },
      });

      if (res.results && res.results.length > 0) {
        const userd = res.results[0]; // Pega o primeiro objeto do array

        selectedUserData.value = { ...userd };
        isEditUserDrawerVisible.value = true;
        isLoadingUser.value = false;
      }
    } catch (error) {
      console.error("Error fetching user data");
    }
  };

  const viewUser = (item) => {
    router.push({ name: "apps-user-view-id", params: { id: item } });
  };

  const edituserapi = async (newUserData) => {
    try {
      console.log("New user data", newUserData);
      
      const formData = new FormData();

      formData.append("id", newUserData.id);
      formData.append("fullname", newUserData.fullname);
      formData.append("email", newUserData.email);
      formData.append("expIni", newUserData.expIni);
      formData.append("expFim", newUserData.expFim);
      formData.append("role", newUserData.role);
      formData.append("color", newUserData.color);
      formData.append("podeAgendamento", newUserData.podeAgendamento);
      formData.append("phone", newUserData.phone);

      if (newUserData.password) {
        formData.append("password", newUserData.password);
      }

      if (newUserData.avatar) {
        formData.append("avatar", newUserData.avatar[0]);
      }

      const resposta = await $api("/users/update-user", {
        method: "POST",
        body: formData,
      });

      const dadosUser = useCookie("userData").value;

      if (newUserData.id == dadosUser.id) {
        const cookieUserUpdate = await $api("/users/get-user", {
          method: "POST",
          body: {
            id: newUserData.id,
          },
        });

        cookieStore.updateCookies({ userData: cookieUserUpdate.results[0] });
      }

      setAlert(
        (newUserData.fullname || "Usuário") + " editado com sucesso!",
        "success",
        "tabler-check",
        3000
      );
      getUsers();
    } catch (error) {
      console.log("Error fetching user data", error, error.response);
      setAlert(
        error.response?._data?.message ||
          "Ocorreu um erro ao editar o usuário, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const deleteUser = async (id) => {
    //Confirmação de exclusão
    const confirm = window.confirm(
      "Tem certeza que deseja remover este usuário da sua empresa? Você poderá restaurá-lo posteriormente."
    );

    if (!confirm) {
      return;
    }

    try {
      await $api(`/users/delete-user`, {
        method: "POST",
        body: {
          id: id,
        },
      });

      setAlert(
        "Usuário excluído com sucesso!",
        "success",
        "tabler-trash",
        3000
      );
      getUsers();
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
      setAlert(
        error.response?._data?.message ||
          "Ocorreu um erro ao excluir o usuário, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const restoreUser = async (id) => {
    //Confirmação de exclusão
    const confirm = window.confirm(
      "Tem certeza que deseja restaurar este usuário? Isso irá ignorar os prazos de expiração que o usuário tiver!"
    );

    if (!confirm) {
      return;
    }

    try {
      await $api(`/users/restore-user`, {
        method: "POST",
        body: {
          id,
        },
      });

      setAlert(
        (newUserData.fullname || "Usuário") + " restaurado com sucesso!",
        "success",
        "tabler-trash",
        3000
      );
      getUsers();
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
      setAlert(
        error.response?._data?.message ||
        "Ocorreu um erro ao restaurar o usuário, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };
</script>

<template>
  <h2 class="text-h5 mb-0">Usuários ({{ totalUsers ?? 0 }})</h2>
  <p class="text-sm">Gerencie os usuários cadastrados no sistema.</p>

  <!-- Carregando Add -->
  <VDialog v-model="isLoadingAdd" persistent max-width="300">
    <VCard>
      <VCardText color="white">
        Adicionando Usuário...
        <VProgressLinear indeterminate color="blue" :height="5" />
      </VCardText>
    </VCard>
  </VDialog>

  <!-- 👉 Search  -->

  <VCard class="mb-6">
    <VCardText>
      <VRow>
        <VCol cols="12" md="4">
          <AppTextField
            v-model="searchQuery"
            label="Pesquise um usuário"
            placeholder="Pesquisar"
            density="compact"
            @update:model-value="getUsers"
          />
        </VCol>

        <VCol cols="12" md="4">
          <AppSelect
            v-model="selectedRole"
            label="Função"
            :items="[{ title: 'Todos', value: null }, ...roles]"
            @update:model-value="getUsers"
          />
        </VCol>

        <VCol cols="12" md="4">
          <AppSelect
            v-model="statusQuery"
            label="Status"
            :items="[
              { title: 'Todos', value: null },
              { title: 'Ativo', value: 1 },
              { title: 'Inativo', value: 0 },
            ]"
            @update:model-value="getUsers"
          />
        </VCol>
      </VRow>
    </VCardText>
  </VCard>

  <VCard>
    <VCardText class="d-flex flex-wrap py-4 gap-4">
      <div class="me-3 d-flex gap-3">
        <AppSelect
          :model-value="itemsPerPage"
          :items="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 50, title: '50' },
            { value: 100, title: '100' },
            { value: -1, title: 'Todos' },
          ]"
          style="inline-size: 6.25rem"
          @update:model-value="itemsPerPage = parseInt($event, 10)"
        />
      </div>
      <VSpacer />

      <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
        <!--
            👉 Export button 
            <VBtn
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-screen-share"
            >
            Export
            </VBtn>
          -->

        <!-- 👉 Add user button -->
        <VBtn
          prepend-icon="tabler-plus"
          @click="isAddNewUserDrawerVisible = true"
        >
          Adicionar usuário
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="users"
      :items-length="totalUsers"
      :headers="headers"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando usuários..."
    >
      <!-- User -->
      <template #item.user="{ item }">
        <div class="d-flex align-left my-1">
          <VAvatar
            size="34"
            :variant="!item.avatar ? 'tonal' : undefined"
            :color="
              !item.avatar ? resolveUserRoleVariant(item).color : undefined
            "
            class="me-3"
          >
            <VImg v-if="item.avatar" :src="item.avatar" cover />
            <span v-else>{{ avatarText(item.fullName) }}</span>
          </VAvatar>
          <div class="d-flex flex-column">
            <h6 class="text-base">
              <RouterLink
                :to="{ name: 'apps-user-view-id', params: { id: item.id } }"
                class="font-weight-medium text-link"
              >
                <p v-if="item.ativo === 1" class="mb-0">
                  {{ item.fullName }}
                </p>
                <p v-else class="text-decoration-line-through mb-0">
                  {{ item.fullName }}
                </p>
              </RouterLink>
            </h6>
            <span class="text-sm text-medium-emphasis">{{ item.email }}</span>
            <span class="text-sm text-medium-emphasis">{{ item.phone }}</span>
          </div>
        </div>
      </template>

      <!-- 👉 Role -->
      <template #item.role="{ item }">
        <div class="d-flex align-center gap-4">
          <VAvatar
            :size="30"
            :color="resolveUserRoleVariant(item).color"
            variant="tonal"
          >
            <VIcon :size="20" :icon="resolveUserRoleVariant(item).icon" />
          </VAvatar>
          <span class="text-capitalize">{{ item.role }}</span>
        </div>
      </template>

      <!-- 👉 Expiration -->
      <template #item.exp="{ item }">
        <span
          v-if="item.expIni === null || item.expFim === null"
          class="text-medium-emphasis"
          >Permanente</span
        >
        <span v-else
          >De {{ new Date(item.expIni).toLocaleDateString() }} até
          {{ new Date(item.expFim).toLocaleDateString() }}</span
        >
      </template>

      <!-- 👉 Agendamento -->
      <template #item.podeAgendamento="{ item }">
        <span v-if="item.podeAgendamento === 1" class="text-medium-emphasis"
          >Sim</span
        >
        <span v-else class="text-medium-emphasis">Não</span>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <div v-if="item.ativo === 1" class="d-flex align-center gap-2">
          <IconBtn
            title="Visualizar usuário"
            @click="viewUser(item.id)"
            color="primary"
          >
            <VIcon icon="tabler-eye" />
          </IconBtn>

          <IconBtn
            title="Editar usuário"
            @click="editUser(item)"
            color="warning"
          >
            <VIcon icon="tabler-edit" />
          </IconBtn>

          <IconBtn
            title="Remover usuário da empresa"
            @click="deleteUser(item.id)"
            color="error"
          >
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </div>

        <div v-else>
          <VBtn
            variant="outlined"
            @click="restoreUser(item.id)"
            color="primary"
            style="height: 35px"
          >
            <VIcon icon="tabler-restore" class="mr-2" />
            Restaurar
          </VBtn>
        </div>
      </template>

      <!-- pagination -->
      <template #bottom>
        <VDivider />
        <div
          class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
        >
          <p class="text-sm text-disabled mb-0">
            {{ paginationMeta({ page, itemsPerPage }, totalUsers) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalUsers / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs ? 1 : Math.ceil(totalUsers / itemsPerPage)
            "
          >
            <template #prev="slotProps">
              <VBtn
                variant="tonal"
                color="default"
                v-bind="slotProps"
                :icon="false"
              >
                Anterior
              </VBtn>
            </template>

            <template #next="slotProps">
              <VBtn
                variant="tonal"
                color="default"
                v-bind="slotProps"
                :icon="false"
              >
                Próximo
              </VBtn>
            </template>
          </VPagination>
        </div>
      </template>
    </VDataTableServer>
    <!-- SECTION -->
  </VCard>
  <!-- 👉 Add New User -->
  <AddNewUserDrawer
    v-model:isDrawerOpen="isAddNewUserDrawerVisible"
    @user-data="addNewUser"
  />

  <EditUserDrawer
    v-if="!isLoadingUser"
    v-model:isDrawerOpen="isEditUserDrawerVisible"
    :user-data="selectedUserData"
    @user-data="edituserapi"
  />
</template>

<style>
  .assinaturaInativa {
    filter: blur(6px);
  }
</style>
