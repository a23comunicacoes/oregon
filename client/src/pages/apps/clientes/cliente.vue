<script setup>
  import { can } from "@layouts/plugins/casl";
  import moment from "moment";
  import { temaAtual } from "@core/stores/config";
  import { useFunctions } from "@/composables/useFunctions";

  import tableagendamentos from "@/views/apps/relatorios/tableagendamentos.vue";
  import informacoes from "@/views/apps/clientes/cliente/informacoes.vue";
  import atividades from "@/views/apps/clientes/cliente/atividades.vue";
  import anotacoes from "@/views/apps/clientes/cliente/anotacoes.vue";
  import negocios from "@/views/apps/clientes/cliente/negocios.vue";

  const { copyEndereco, enderecoWaze, enderecoMaps } = useFunctions();
  const router = useRouter();
  const { setAlert } = useAlert();

  const loading = ref(true);
  const collapseMenu = ref(false);

  const userData = useCookie("userData").value;

  if (!can("view", "crm_clientes") && !can("manage", "crm")) {
    setAlert(
      "Você não tem permissão para acessar esta página.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/");
  }

  const props = defineProps({
    clienteId: {
      type: [String, Number],
      required: false,
      default: null,
    },
  });

  const cliente = ref(null);
  const idCliente = ref(props.clienteId || router.currentRoute.value.params.id);

  if (!idCliente.value) {
    setAlert(
      "Selecione um cliente para visualizar.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/clientes");
  }

  const getCliente = async () => {
    if (!idCliente.value) {
      setAlert(
        "Selecione um cliente para visualizar.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      router.push("/clientes");
      return;
    }

    loading.value = true;
    try {
      const res = await $api(`/clientes/get/${idCliente.value}`);

      if (!res) throw new Error("Cliente não encontrado");

      console.log("Cliente carregado:", res[0]);

      cliente.value = res[0];
    } catch (error) {
      console.error("Erro ao carregar cliente:", error, error?.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao carregar cliente. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      router.push("/clientes");
    } finally {
      loading.value = false;
    }
  };

  await getCliente();

  const tabs = [
    { title: "Informações", icon: "tabler-user-circle" },
    { title: "Atividades", icon: "tabler-checks" },
    { title: "Anotações", icon: "tabler-notes" },
    { title: "Negócios", icon: "tabler-briefcase" },
    { title: "Agendamentos", icon: "tabler-calendar" },
  ];

  const tab = ref("Informações");
</script>
<template>
  <div class="d-flex flex-row align-start" v-if="cliente && !loading">
    <v-hover>
      <template v-slot:default="{ isHovering, props }">
        <div
          v-bind="props"
          style="border-right: 1px #7171713d solid; transition: all 0.2s"
          class="overflow-hidden"
          :style="
            collapseMenu && !isHovering
              ? 'width: 5%; padding-right: 5px;'
              : 'width: 17%; padding-right: 13px;'
          "
        >
          <VList variant="text" bg-color="#00000000" class="overflow-hidden">
            <VListItem
              variant="text"
              class="mb-4 rounded"
              @click="collapseMenu = !collapseMenu"
              :prepend-icon="
                !collapseMenu
                  ? 'tabler-layout-sidebar-left-collapse'
                  : 'tabler-layout-sidebar-left-expand'
              "
              :title="
                collapseMenu && !isHovering
                  ? ''
                  : !collapseMenu
                  ? 'Recolher menu'
                  : 'Expandir menu'
              "
            />

            <VListItem
              v-for="t in tabs"
              :key="t.title"
              variant="text"
              class="mb-2 rounded"
              :active="tab === t.title"
              @click="tab = t.title"
              :prepend-icon="t.icon"
              :title="collapseMenu && !isHovering ? '' : t.title"
            />

            <VListItem
              variant="text"
              class="mb-2 rounded"
              @click="router.push('/clientes')"
              prepend-icon="tabler-chevron-left"
              :title="collapseMenu && !isHovering ? '' : 'Voltar'"
            />
          </VList>
        </div>
      </template>
    </v-hover>

    <div
      class="pa-4"
      :style="`width: ${collapseMenu ? 95 : 83}%; transition: all 0.2s`"
    >
      <VWindow v-model="tab">
        <VWindowItem value="Informações">
          <informacoes :clienteData="cliente" @getCliente="getCliente" />
        </VWindowItem>

        <VWindowItem value="Atividades">
          <atividades type="cliente" :objData="cliente" @getData="getCliente" />
        </VWindowItem>

        <VWindowItem value="Anotações">
          <anotacoes type="cliente" :objData="cliente" @getData="getCliente" />
        </VWindowItem>

        <VWindowItem value="Negócios">
          <negocios :cli_Id="cliente.id" @getData="getCliente" />
        </VWindowItem>

        <VWindowItem value="Agendamentos">
          <tableagendamentos
            :cli_Id="cliente.id"
          />
        </VWindowItem>
      </VWindow>
    </div>
  </div>
</template>

<style>
  .color-picker-custom .v-color-picker-canvas canvas {
    block-size: 80px !important;
    border-radius: 10px;
  }
</style>
