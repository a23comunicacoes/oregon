<script setup>
  import { VDataTableServer } from "vuetify/labs/VDataTable";
  import { paginationMeta } from "@api-utils/paginationMeta";
  import { useCookieStore } from "@layouts/stores/config";
  import LembreteDialog from "@/views/apps/lembretes/lembreteDialog.vue";
  import { useAlert } from "@/composables/useAlert";

  const { setAlert } = useAlert();
  const cookieStore = useCookieStore();
  const loading = ref(true);
  const userData = useCookie("userData").value;
  const userRole = userData.role;

  onMounted(() => {
    getLembretes();
    getDadosLembretes();
  });

  // Data table options
  const itemsPerPage = ref(10);
  const page = ref(1);
  const sortBy = ref();
  const orderBy = ref();

  const updateOptions = (options) => {
    page.value = options.page;
    sortBy.value = options.sortBy[0]?.key;
    orderBy.value = options.sortBy[0]?.order;

    getLembretes();
  };

  // Headers
  const headers = [
    {
      title: "Título",
      key: "title",
    },
    {
      title: "Data",
      key: "agendado_time",
    },
    {
      title: "Repetir",
      key: "repeat",
    },
    {
      title: "Notificação",
      key: "notify_email",
    },
    {
      title: "Ações",
      key: "actions",
      sortable: false,
    },
  ];

  const lembretes = ref([]);
  const totalLembretes = ref(0);

  const getLembretes = async () => {
    loading.value = true;

    try {
      const res = await $api("/lembretes/list", {
        method: "GET",
        query: {
          itemsPerPage: itemsPerPage.value,
          page: page.value,
          sortBy: sortBy.value,
          orderBy: orderBy.value,
        },
      });

      console.log("res lembretes", res);

      lembretes.value = res.lembretes;
      totalLembretes.value = res.totalLembretes;
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
      lembretes.value = [];
    }

    loading.value = false;
  };

  const isAddNewUserDrawerVisible = ref(false);
  const selectedLembreteData = ref({});

  const editUser = async (item) => {
    try {
      const res = await $api(`/lembretes/get/${item.id}`, {
        method: "GET",
      });

      if (!res) return;

      console.log("res edit", res);

      selectedLembreteData.value = res;
      isAddNewUserDrawerVisible.value = true;
    } catch (error) {
      console.error("Error fetching user data", error, error.response);
    }
  };

  const deleteUser = async (id) => {
    //Confirmação de exclusão
    const confirm = window.confirm(
      "Tem certeza que deseja excluir esse lembrete? Isso não poderá ser desfeito!"
    );

    if (!confirm) {
      return;
    }

    console.log("Excluir Lembrete:", id);

    try {
      await $api(`/lembretes/delete/${id}`, {
        method: "GET",
      });

      setAlert(
        "Lembrete excluído com sucesso!",
        "success",
        "tabler-trash",
        3000
      );
      getLembretes();
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
      setAlert(
        err?.response?._data?.message ||
          "Ocorreu um erro ao excluir o lembrete, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const formatValor = (valor) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const emailsLembretes = ref([]);
  const zapsLembretes = ref([]);
  const emailTextAdd = ref("");
  const zapTextAdd = ref("");

  const getDadosLembretes = async () => {
    loading.value = true;

    try {
      const res = await $api("/lembretes/configs", {
        method: "GET",
      });

      console.log("res emails lembretes", res);

      emailsLembretes.value = res.emails || [];
      zapsLembretes.value = res.zap || [];
    } catch (err) {
      console.error("Error fetching user data", err, err.response);
      emailsLembretes.value = [];
      zapsLembretes.value = [];
    }

    loading.value = false;
  };

  const addOpcaoLembrete = async (type) => {
    let value = "";
    if (type === "email_notify") {
      if (!emailTextAdd.value || !emailValidator(emailTextAdd.value)) return;

      value = emailTextAdd.value;
    } else if (type === "zap_notify") {
      if (!zapTextAdd.value) return;

      value = zapTextAdd.value;
    } else {
      return;
    }

    try {
      const res = await $api(`/lembretes/configs`, {
        method: "POST",
        body: {
          type,
          value,
        },
      });

      console.log("res add opção", res);

      //Atualizar emails
      getDadosLembretes();

      if (type === "email_notify") {
        emailTextAdd.value = "";
      } else if (type === "zap_notify") {
        zapTextAdd.value = "";
      }
    } catch (error) {
      console.error("Error adding option", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Ocorreu um erro ao adicionar a opção, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const removeOpcaoLembrete = async (type, value) => {
    if (!type || !value) return;

    try {
      const res = await $api(`/lembretes/configs`, {
        method: "DELETE",
        body: {
          type,
          value,
        },
      });

      console.log("res remove email", res);

      //Atualizar emails
      getDadosLembretes();
    } catch (error) {
      console.error("Error removing option", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Ocorreu um erro ao remover a opção, tente novamente!",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };
</script>

<template>
  <h2 class="text-h5 mb-0">Lembretes</h2>
  <p class="text-sm">Gerencie os lembretes do sistema aqui.</p>

  <VRow class="mb-6 match-height">
    <VCol cols="12" md="6">
      <VCard>
        <VCardText class="pa-3">
          <p class="font-weight-medium mb-0">Emails de Lembretes</p>
          <p class="mb-0 text-caption">
            Adicione aqui os emails que irão receber os lembretes que tiverem
            com a opção de email ativo.
          </p>

          <VDivider class="my-3" />

          <div class="d-flex flex-row gap-4 mb-4">
            <VTextField
              v-model="emailTextAdd"
              placeholder="Insira um Email"
              :rules="[emailValidator]"
              type="email"
            />

            <IconBtn
              color="primary"
              variant="flat"
              @click="addOpcaoLembrete('email_notify')"
              size="44"
              :disabled="!emailTextAdd || !emailValidator(emailTextAdd)"
            >
              <VIcon icon="tabler-plus" />
            </IconBtn>
          </div>

          <p class="mb-0 text-sm">
            Emails cadastrados ({{ emailsLembretes.length }}):
          </p>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <VChip
              v-for="email in emailsLembretes"
              :key="email"
              color="primary"
              label
              @click:close="removeEmailLembrete(email.value)"
              closable
              close-icon="tabler-trash"
              variant="flat"
            >
              {{ email.value }}
            </VChip>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="6">
      <VCard>
        <VCardText class="pa-3">
          <p class="font-weight-medium mb-0">
            Números de WhatsApp para Lembretes
          </p>
          <p class="mb-0 text-caption">
            Adicione aqui os números de WhatsApp que irão receber os lembretes
            que tiverem com a opção de WhatsApp ativo.
          </p>

          <VDivider class="my-3" />

          <div class="d-flex flex-row gap-4 mb-4">
            <VTextField
              v-model="zapTextAdd"
              placeholder="Insira um Número de WhatsApp"
              v-mask="['(##) #####-####', '(##) ####-####']"
            />

            <IconBtn
              color="primary"
              variant="flat"
              @click="addOpcaoLembrete('zap_notify')"
              size="44"
              :disabled="!zapTextAdd"
            >
              <VIcon icon="tabler-plus" />
            </IconBtn>
          </div>

          <p class="mb-0 text-sm">
            Números cadastrados ({{ zapsLembretes.length }}):
          </p>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <VChip
              v-for="zap in zapsLembretes"
              :key="zap"
              color="primary"
              label
              @click:close="removeOpcaoLembrete('zap_notify', zap.value)"
              closable
              close-icon="tabler-trash"
              variant="flat"
            >
              {{ zap.value }}
            </VChip>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

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
        <!-- 👉 Add user button -->
        <VBtn
          prepend-icon="tabler-plus"
          @click="isAddNewUserDrawerVisible = true"
        >
          Cadastrar Lembrete
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <!-- SECTION datatable -->
    <VDataTableServer
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      :items="lembretes"
      :items-length="totalLembretes"
      :headers="headers"
      class="text-no-wrap"
      @update:options="updateOptions"
      :loading="loading"
      loading-text="Carregando lembretes..."
    >
      <template #item.title="{ item }">
        <p
          class="mb-0 text-truncate"
          :class="{ 'text-decoration-line-through': item.concluido }"
        >
          <VIcon
            icon="tabler-circle-check-filled"
            color="success"
            v-if="item.concluido"
            class="me-1"
            size="16"
          />
          {{ item.title }}
        </p>

        <p
          class="mb-0 text-caption text-disabled cursor-pointer text-truncate"
          :class="{ 'text-decoration-line-through': item.concluido }"
        >
          {{ item.subtitle }}

          <VTooltip activator="parent" :text="item.subtitle" />
        </p>
      </template>

      <template #item.agendado_time="{ item }">
        <p class="mb-0">
          {{ new Date(item.agendado_time).toLocaleString("pt-BR") }}
        </p>
      </template>

      <template #item.repeat="{ item }">
        <VChip :color="item.repeat ? 'success' : 'warning'" label>
          {{ item.repeat ? "Sim" : "Não" }}
        </VChip>
      </template>

      <template #item.notify_email="{ item }">
        <!-- <VChip :color="item.notify_email ? 'success' : 'warning'" label>
          {{ item.notify_email ? "Sim" : "Não" }}
        </VChip> -->

        <div class="d-flex flex-row gap-2">
          <VIcon
            icon="tabler-mail"
            :color="item.notify_email ? 'primary' : 'secondary'"
          />
          <VIcon
            icon="tabler-brand-whatsapp"
            :color="item.notify_zap ? 'primary' : 'secondary'"
          />
        </div>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <div class="d-flex flex-row gap-2">
          <IconBtn
            title="Editar Lembrete"
            @click="editUser(item)"
            color="warning"
          >
            <VIcon icon="tabler-edit" />
          </IconBtn>

          <IconBtn
            title="Excluir Lembrete"
            @click="deleteUser(item.id)"
            color="error"
          >
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </div>
      </template>

      <!-- pagination -->
      <template #bottom>
        <VDivider />
        <div
          class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
        >
          <p class="text-sm text-disabled mb-0">
            {{ paginationMeta({ page, itemsPerPage }, totalLembretes) }}
          </p>

          <VPagination
            v-model="page"
            :length="Math.ceil(totalLembretes / itemsPerPage)"
            :total-visible="
              $vuetify.display.xs
                ? 1
                : totalLembretes > 100
                ? 4
                : Math.ceil(totalLembretes / itemsPerPage)
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

  <LembreteDialog
    :isDrawerOpen="isAddNewUserDrawerVisible"
    @update:isDrawerOpen="isAddNewUserDrawerVisible = $event"
    :lembreteData="selectedLembreteData"
    @updateLembretes="getLembretes"
  />
</template>
