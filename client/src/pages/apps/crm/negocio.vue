<script setup>
  import { can } from "@layouts/plugins/casl";
  import moment from "moment";
  import { temaAtual } from "@core/stores/config";
  import { useFunctions } from "@/composables/useFunctions";
  import { useConfirm } from "@/utils/confirm.js";
  import { paginationMeta } from "@api-utils/paginationMeta";

  import atividades from "@/views/apps/clientes/cliente/atividades.vue";
  import anotacoes from "@/views/apps/clientes/cliente/anotacoes.vue";

  const {
    copyEndereco,
    enderecoWaze,
    enderecoMaps,
    formatValue,
    escreverEndereco,
    formatDateAgendamento,
  } = useFunctions();

  const router = useRouter();
  const { setAlert } = useAlert();

  const loading = ref(true);
  const widthLateral = ref(30);
  const isResizing = ref(false);

  const startResize = (e) => {
    isResizing.value = true;
    document.body.style.userSelect = "none"; // evita seleção de texto durante o arraste
    document.body.style.cursor = "none"; // 👈 esconde o cursor
  };

  const stopResize = () => {
    isResizing.value = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = ""; // 👈 restaura o cursor
  };

  const resize = (e) => {
    if (!isResizing.value) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 10 && newWidth < 70) {
      // limite opcional
      widthLateral.value = newWidth;
    }
  };

  onMounted(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("mousemove", resize);
    window.removeEventListener("mouseup", stopResize);
  });

  const userData = useCookie("userData").value;

  if (!can("view", "crm_funil_vendas")) {
    setAlert(
      "Você não tem permissão para acessar esta página.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/");
  }

  const negocio = ref(null);

  if (!router.currentRoute.value.params.id) {
    setAlert(
      "Selecione um negócio para visualizar.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/crm/funis");
  }

  const getNegocio = async () => {
    if (!router.currentRoute.value.params.id) {
      setAlert(
        "Selecione um negócio para visualizar.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      router.push("/crm/funis");
      return;
    }

    loading.value = true;
    try {
      const res = await $api(
        `/crm/get/negocio/${router.currentRoute.value.params.id}`
      );

      if (!res?.id) throw new Error("Negócio não encontrado");

      console.log("Negócio carregado:", res);

      negocio.value = res;
    } catch (error) {
      console.error("Erro ao obter negócio:", error);
      setAlert(
        error?.response?._data?.message ||
          "Erro ao obter negócio. Tente novamente mais tarde.",
        "error",
        "tabler-alert-triangle",
        7000
      );
      router.push("/crm/funis");
    } finally {
      loading.value = false;
    }
  };

  const funis = ref([]);

  const getFunis = async () => {
    try {
      const res = await $api("/crm/list/funil");

      if (!res) throw new Error("Erro ao buscar funis de vendas");

      console.log("Funis carregadoss:", res);

      funis.value = res;
    } catch (error) {
      console.error("Error fetching funis", error, error.response);
      setAlert(
        error?.response?._data?.message || "Erro ao buscar funis de vendas",
        "error",
        "tabler-alert-triangle",
        7000
      );
    }
  };
  const tags = ref([]);
  const searchQueryTags = ref("");
  const loadingTag = ref(false);
  const getTags = async () => {
    loadingTag.value = true;

    try {
      const res = await $api(`/crm/list/tags`, {
        method: "GET",
        query: {
          q: searchQueryTags.value,
        },
      });

      if (!res) throw new Error("Erro ao carregar tags");

      console.log("Tags carregadas:", res);

      tags.value = res.tags || [];
    } catch (error) {
      console.error("Erro ao parsear tags:", error, error?.response);
    } finally {
      loadingTag.value = false;
    }
  };

  const newTag = ref({
    name: "",
    description: "",
    color: "",
  });

  const loadingSaveTag = ref(false);
  const viewNewTag = ref(false);

  const upsertTag = async () => {
    if (!newTag.value.name) {
      setAlert(
        "O nome da tag é obrigatório.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    loadingSaveTag.value = true;

    try {
      const res = await $api(
        !newTag.value.id ? `/crm/create/tag` : `/crm/update/tag`,
        {
          method: "POST",
          body: newTag.value,
        }
      );

      if (!res) throw new Error("Erro ao criar tag");

      console.log("Tag criada:", res);

      setAlert("Tag criada com sucesso.", "success", "tabler-check", 3000);

      if (res.id) {
        negocio.value.tags = negocio.value.tags || [];
        negocio.value.tags.push(res.id);
      }

      viewNewTag.value = false;
      newTag.value = {
        name: "",
        description: "",
        color: "",
      };

      await getTags();
    } catch (error) {
      console.error("Erro ao criar tag:", error, error?.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao criar tag. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    } finally {
      loadingSaveTag.value = false;
    }
  };

  const updateTagsNegocio = async (tagId) => {
    if (!negocio.value) return;

    negocio.value.tags = negocio.value.tags || [];
    if (negocio.value.tags.includes(tagId)) {
      negocio.value.tags = negocio.value.tags.filter((t) => t !== tagId);
    } else {
      negocio.value.tags.push(tagId);
    }

    try {
      const res = await $api(`/crm/save/tags/`, {
        method: "POST",
        body: {
          refType: "negocio",
          refId: negocio.value.id,
          tags: negocio.value.tags,
        },
      });

      if (!res) throw new Error("Erro ao atualizar negócio");

      console.log("Negócio atualizado:", res);
    } catch (error) {
      console.error("Erro ao atualizar negócio:", error, error?.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao atualizar negócio. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const fontesClientes = ref([]);
  const motivosPerdas = ref([]);

  const getConfig = async () => {
    fontesClientes.value = [];
    motivosPerdas.value = [];

    try {
      const res = await $api("/config/get", {
        method: "GET",
        query: { types: ["fonte_cliente", "motivos_perdas"] },
      });

      if (!res) throw new Error("Erro ao buscar configuração");

      console.log("Configuração carregada:", res);

      res
        .filter((r) => r.type === "fonte_cliente")
        .forEach((r) => {
          fontesClientes.value.push(r.value);
        });

      res
        .filter((r) => r.type === "motivos_perdas")
        .forEach((c) => {
          motivosPerdas.value.push(c.value);
        });
    } catch (error) {
      console.error("Erro ao obter configuração:", error, error.response);
      setAlert(
        error?.response?._data?.message ||
          "Erro ao obter configuração. Tente novamente mais tarde.",
        "error",
        "tabler-alert-triangle",
        7000
      );

      fontesClientes.value = [];
      motivosPerdas.value = [];
    }
  };

  await getConfig();
  await getTags();
  await getFunis();
  await getNegocio();

  const tabs = [
    { title: "Atividades", icon: "tabler-checks" },
    { title: "Anotações", icon: "tabler-notes" },
    { title: "Histórico", icon: "tabler-history" },
  ];

  const tab = ref("Atividades");

  const changeEtapa = async (etapaId) => {
    if (!can("edit", "crm_funil_vendas")) {
      setAlert(
        "Você não tem permissão para alterar a etapa do negócio.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    try {
      const res = await $api("/crm/update/negocio/etapa", {
        method: "PUT",
        body: {
          id: negocio.value.id,
          etapaId,
        },
      });

      if (!res) throw new Error("Erro ao alterar etapa do negócio");

      setAlert(
        "Etapa do negócio alterada com sucesso.",
        "success",
        "tabler-check",
        3000
      );

      getNegocio();
    } catch (error) {
      console.error("Erro ao alterar etapa do negócio:", error, error.response);
      setAlert(
        error?.response?._data?.message ||
          "Erro ao alterar etapa do negócio. Tente novamente mais tarde.",
        "error",
        "tabler-alert-triangle",
        7000
      );
    }
  };

  const tabInfo = ref([0, 1, 2]);

  const tabsInfo = ref([
    { title: "Resumo", key: "resumo", indexKey: 0 },
    { title: "Cliente", key: "cliente", indexKey: 1 },
    {
      title: "Agendamento",
      key: "agendamento",
      indexKey: 2,
      editable: true,
      iconEdit: "tabler-link",
      actionEdit: () => openVincularAgendamento(),
    },
  ]);

  const handleTabInfo = (indexKey) => {
    if (tabInfo.value.includes(indexKey)) {
      tabInfo.value = tabInfo.value.filter((i) => i !== indexKey);
    } else {
      tabInfo.value.push(indexKey);
    }
  };

  const updateKeyNegocio = async (key, value) => {
    if (!negocio.value) return;

    let allowedKeys = [
      { title: "Título", key: "title" },
      { title: "Valor", key: "valor" },
      { title: "Origem", key: "origem" },
      { title: "Data de Fechamento Esperada", key: "data_fechamento_esperada" },
    ];

    if (!allowedKeys.find((k) => k.key === key)) {
      return setAlert(
        "Chave inválida para atualização.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }

    try {
      const res = await $api(`/crm/update/negocio/key`, {
        method: "PUT",
        body: {
          id: negocio.value.id,
          key,
          value,
        },
      });

      if (!res) throw new Error("Erro ao atualizar negócio");

      console.log("Negócio atualizado:", res);

      setAlert(
        res.message || "Negócio atualizado com sucesso.",
        "success",
        "tabler-check",
        3000
      );

      negocio.value[key] = value;
    } catch (error) {
      console.error("Erro ao atualizar negócio:", error, error?.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao atualizar negócio. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const searchQueryHistorico = ref("");
  
  const orderByItensHistorico = [
    { title: "Mais recente", value: "date-desc" },
    { title: "Mais antigo", value: "date-asc" },
    { title: "A-Z", value: "title-asc" },
    { title: "Z-A", value: "title-desc" },
  ];
  
  const orderByHistorico = ref("date-desc");
  const funcionarioQueryHistorico = ref(null);
  const pageHistorico = ref(1);
  const itemsPerPageHistorico = ref(10);
  const funcionariosHistorico = ref([]);

  const filteredHistoricoNegocio = computed(() => {
    if (!negocio.value?.historico) return [];
    
    let historico = [...negocio.value.historico];

    // Filtro por pesquisa
    if (searchQueryHistorico.value) {
      historico = historico.filter((item) =>
        item.title?.toLowerCase().includes(searchQueryHistorico.value.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQueryHistorico.value.toLowerCase())
      );
    }

    // Filtro por funcionário
    if (funcionarioQueryHistorico.value) {
      historico = historico.filter(
        (item) => item.feitoPor === funcionarioQueryHistorico.value
      );
    }

    // Ordenação
    if (orderByHistorico.value) {
      historico = historico.sort((a, b) => {
        if (orderByHistorico.value === "date-desc") {
          return new Date(b.date) - new Date(a.date);
        } else if (orderByHistorico.value === "date-asc") {
          return new Date(a.date) - new Date(b.date);
        } else if (orderByHistorico.value === "title-asc") {
          return (a.title || "").localeCompare(b.title || "");
        } else if (orderByHistorico.value === "title-desc") {
          return (b.title || "").localeCompare(a.title || "");
        }
        return 0;
      });
    }

    // Paginação
    const start = (pageHistorico.value - 1) * itemsPerPageHistorico.value;
    const end = start + parseInt(itemsPerPageHistorico.value);
    
    return historico.slice(start, end);
  });

  const totalHistorico = computed(() => {
    if (!negocio.value?.historico) return 0;
    
    let historico = [...negocio.value.historico];

    if (searchQueryHistorico.value) {
      historico = historico.filter((item) =>
        item.title?.toLowerCase().includes(searchQueryHistorico.value.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQueryHistorico.value.toLowerCase())
      );
    }

    if (funcionarioQueryHistorico.value) {
      historico = historico.filter(
        (item) => item.feitoPor === funcionarioQueryHistorico.value
      );
    }

    return historico.length;
  });

  watch(() => negocio.value?.historico, (newVal) => {
    if (!newVal || !Array.isArray(newVal)) return;
    
    funcionariosHistorico.value = [];
    
    for (let item of newVal) {
      if (
        !funcionariosHistorico.value.some((funcionario) => funcionario.title === item.feitoPor)
      ) {
        funcionariosHistorico.value.push({
          title: item.feitoPor,
          value: item.feitoPor,
        });
      }
    }

    funcionariosHistorico.value = funcionariosHistorico.value.sort(
      (a, b) => a.title?.localeCompare(b.title || "") || 0
    );

    funcionariosHistorico.value.unshift({
      title: "Todos",
      value: null,
    });
  }, { immediate: true, deep: true });

  const deleteNegocio = async () => {
    if (!negocio.value?.id) return;

    if (
      !(await useConfirm({
        message: `Tem certeza que deseja excluir o negócio "${negocio.value.title}"? Esta ação não pode ser desfeita.`,
      }))
    )
      return;

    try {
      const res = await $api(`/crm/delete/negocio/${negocio.value.id}`, {
        method: "DELETE",
      });

      if (!res) throw new Error("Erro ao excluir negócio");

      console.log("Negócio excluído:", res);

      setAlert(
        res.message || "Negócio excluído com sucesso.",
        "success",
        "tabler-check",
        3000
      );

      router.push("/crm/funis");
    } catch (error) {
      console.error("Erro ao excluir negócio:", error, error?.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao excluir negócio. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const duplicateNegocio = async () => {
    if (!negocio.value?.id) return;

    try {
      const res = await $api(`/crm/duplicate/negocio`, {
        method: "POST",
        body: {
          id: negocio.value.id,
        },
      });

      if (!res?.id) throw new Error("Erro ao duplicar negócio");

      console.log("Negócio duplicado:", res);

      setAlert(
        res.message || "Negócio duplicado com sucesso.",
        "success",
        "tabler-check",
        3000
      );

      router.push(`/crm/funis/negocio/${res.id}`);
      loading.value = true;
      setTimeout(() => {
        getNegocio();
      }, 1000);
    } catch (error) {
      console.error("Erro ao duplicar negócio:", error, error?.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao duplicar negócio. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const loadingGanho = ref(false);
  const loadingPerdido = ref(false);

  const marcarGanho = async () => {
    if (!negocio.value || !negocio.value.id) {
      setAlert(
        "Nenhum negócio selecionado.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    if (negocio.value.status === "Ganho") {
      setAlert(
        "O negócio já está marcado como Ganho.",
        "info",
        "tabler-info-circle",
        3000
      );
      return;
    }

    loadingGanho.value = true;

    try {
      const res = await $api(`/crm/update/negocio/ganho`, {
        method: "PUT",
        body: {
          id: negocio.value.id,
        },
      });

      if (!res) throw new Error("Erro ao atualizar status do negócio");

      setAlert(
        "Negócio marcado como ganho com sucesso.",
        "success",
        "tabler-check",
        3000
      );

      getNegocio();
    } catch (error) {
      console.error("Error updating negocio status", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao atualizar status do negócio",
        "error",
        "tabler-alert-triangle",
        7000
      );
    } finally {
      loadingGanho.value = false;
    }
  };

  const viewMarcarPerdido = ref(false);
  const motivoPerdido = ref(null);
  const obsPerdido = ref(null);

  const marcarPerdido = async () => {
    if (!negocio.value || !negocio.value.id) {
      setAlert(
        "Nenhum negócio selecionado.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    if (negocio.value.status === "Perdido") {
      setAlert(
        "O negócio já está marcado como Perdido.",
        "info",
        "tabler-info-circle",
        3000
      );
      return;
    }

    if (!motivoPerdido.value) {
      setAlert(
        "Selecione um motivo para marcar o negócio como perdido.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    loadingPerdido.value = true;

    try {
      const res = await $api(`/crm/update/negocio/perdido`, {
        method: "PUT",
        body: {
          id: negocio.value.id,
          motivo: motivoPerdido.value,
          obs: obsPerdido.value,
        },
      });

      if (!res) throw new Error("Erro ao atualizar status do negócio");

      setAlert(
        "Negócio marcado como perdido com sucesso.",
        "success",
        "tabler-check",
        3000
      );

      motivoPerdido.value = null;
      obsPerdido.value = null;
      viewMarcarPerdido.value = false;
      getNegocio();
    } catch (error) {
      console.error("Error updating negocio status", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao atualizar status do negócio",
        "error",
        "tabler-alert-triangle",
        7000
      );
    } finally {
      loadingPerdido.value = false;
    }
  };

  const loadingAgendamentos = ref(false);
  const viewVincularAgendamento = ref(false);
  const agendamentos = ref([]);
  const dateSearchQuery = ref(null);
  const agendamentoSelecionado = ref(null);
  const loadingVincularAgendamento = ref(false);

  const getAgendamentos = async () => {
    if (!negocio.value || !negocio.value.cli_Id) {
      return setAlert(
        "Nenhum cliente vinculado ao negócio.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }

    loadingAgendamentos.value = true;

    try {
      const res = await $api(
        `/clientes/getAgendamentos/${negocio.value.cli_Id}`,
        {
          method: "GET",
          query: {
            itemsPerPage: 20,
            d: dateSearchQuery.value,
          },
        }
      );

      if (!res) throw new Error("Erro ao buscar agendamentos");

      console.log("Agendamentos carregados:", res);

      agendamentos.value = res.agendamentos || [];
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error, error.response);
      setAlert(
        error?.response?._data?.message ||
          "Erro ao buscar agendamentos. Tente novamente mais tarde.",
        "error",
        "tabler-alert-triangle",
        7000
      );

      agendamentos.value = [];
    } finally {
      loadingAgendamentos.value = false;
    }
  };

  const openVincularAgendamento = async () => {
    if (negocio.value?.age_id) {
      agendamentoSelecionado.value = negocio.value.age_id;
    }
    await getAgendamentos();
    viewVincularAgendamento.value = true;
  };

  const vincularAgendamento = async () => {
    if (!negocio.value || !negocio.value.id) {
      setAlert(
        "Nenhum negócio selecionado.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    if (!agendamentoSelecionado.value) {
      setAlert(
        "Selecione um agendamento para vincular.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    loadingVincularAgendamento.value = true;

    try {
      const res = await $api(`/crm/update/negocio/vincularAgendamento`, {
        method: "PUT",
        body: {
          id: negocio.value.id,
          age_id: agendamentoSelecionado.value,
        },
      });

      if (!res) throw new Error("Erro ao vincular agendamento ao negócio");

      setAlert(
        "Agendamento vinculado ao negócio com sucesso.",
        "success",
        "tabler-check",
        3000
      );

      agendamentoSelecionado.value = null;
      viewVincularAgendamento.value = false;
      getNegocio();
    } catch (error) {
      console.error("Erro ao vincular agendamento:", error, error.response);

      setAlert(
        error?.response?._data?.message ||
          "Erro ao vincular agendamento. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    } finally {
      loadingVincularAgendamento.value = false;
    }
  };
</script>
<template>
  <VDialog v-model="viewMarcarPerdido" :max-width="600">
    <VCard>
      <VCardText>
        <AppDrawerHeaderSection
          :title="`Marcar negócio como perdido`"
          @cancel="
            viewMarcarPerdido = false;
            motivoPerdido = '';
            obsPerdido = '';
          "
          customClass="pa-0 mb-2"
        />

        <p class="mb-0">
          Tem certeza que deseja marcar o negócio "
          <strong>{{ negocio?.title }}</strong
          >" como perdido?
        </p>

        <AppSelect
          v-model="motivoPerdido"
          :items="motivosPerdas"
          label="Motivo da perda"
          placeholder="Selecione um motivo"
          class="mt-4"
        />

        <AppTextarea
          v-model="obsPerdido"
          label="Observações (opcional)"
          placeholder="Insira uma observação sobre a perda do negócio"
          class="mt-4"
          rows="2"
          auto-grow
          active
        />

        <div class="linha-flex justify-end mt-4">
          <VBtn
            variant="text"
            :disabled="loadingPerdido"
            @click="
              viewMarcarPerdido = false;
              motivoPerdido = '';
              obsPerdido = '';
            "
          >
            Cancelar
          </VBtn>
          <VBtn :loading="loadingPerdido" @click="marcarPerdido()">
            Confirmar
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <VDialog v-model="viewVincularAgendamento" :max-width="600">
    <VCard>
      <VCardText>
        <AppDrawerHeaderSection
          :title="`Vincular Agendamento`"
          @cancel="viewVincularAgendamento = false"
          customClass="pa-0 mb-2"
        />

        <p class="mb-0 text-sm">
          Vincule um agendamento existente ao negócio
          <strong>{{ negocio?.title }}</strong>
        </p>

        <AppSelect
          v-model="agendamentoSelecionado"
          :items="agendamentos"
          item-title="age_data"
          item-value="age_id"
          label="Agendamento"
          placeholder="Selecione um agendamento"
          class="mt-4"
        >
          <template #selection="{ item }">
            <div v-if="item?.raw?.age_id">
              #{{ item.raw?.age_id }} -
              {{
                formatDateAgendamento(
                  item.raw?.age_data,
                  item.raw?.age_horaInicio,
                  item.raw?.age_horaFim
                )
              }}
            </div>
            <div v-else>Selecione um agendamento</div>
          </template>

          <template v-slot:prepend-item>
            <AppTextField
              v-model="dateSearchQuery"
              label="Buscar por data"
              placeholder="Insira uma data para buscar"
              class="mx-3 mt-2"
              type="date"
              @update:model-value="getAgendamentos()"
            />
            <VDivider class="mt-3" />
          </template>
          <template #item="{ props, item }">
            <VListItem
              #title
              v-bind="props"
              style="display: flex; align-items: center"
            >
              #{{ item.raw?.age_id }} -
              {{
                formatDateAgendamento(
                  item.raw?.age_data,
                  item.raw?.age_horaInicio,
                  item.raw?.age_horaFim
                )
              }}
            </VListItem>
          </template>
        </AppSelect>

        <div class="linha-flex justify-end mt-4">
          <VBtn
            variant="text"
            :disabled="loadingVincularAgendamento"
            @click="
              viewVincularAgendamento = false;
              agendamentoSelecionado = null;
            "
          >
            Cancelar
          </VBtn>
          <VBtn
            :loading="loadingVincularAgendamento"
            @click="vincularAgendamento()"
          >
            Confirmar
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <VBtn
    size="small"
    variant="text"
    style="height: 30px"
    @click="router.push('/crm/funis')"
  >
    <VIcon icon="tabler-chevron-left" class="mr-2" />
    Voltar
  </VBtn>
  <div class="mb-4 mt-2">
    <div class="linha-flex justify-space-between align-center mb-4">
      <AppTextEdit
        v-model="negocio.title"
        tag="h2"
        class="text-h5"
        type="text"
        @save="updateKeyNegocio('title', $event)"
      />

      <div class="linha-flex gap-3">
        <VBtn
          :color="negocio?.status === 'Perdido' ? 'secondary' : 'success'"
          size="small"
          rounded="md"
          style="height: 40px"
          @click="negocio?.status === 'Ganho' ? null : marcarGanho()"
          :loading="loadingGanho"
        >
          Ganho
        </VBtn>

        <VBtn
          :color="negocio?.status === 'Ganho' ? 'secondary' : 'error'"
          size="small"
          rounded="md"
          style="height: 40px"
          @click="
            negocio?.status === 'Perdido' ? null : (viewMarcarPerdido = true)
          "
          :loading="loadingPerdido"
        >
          Perdido
        </VBtn>

        <VMenu
          offset-y
          max-width="300"
          min-width="300"
          transition="scale-transition"
          rounded="xl"
        >
          <template v-slot:activator="{ props }">
            <IconBtn v-bind="props" color="primary" variant="text">
              <VIcon icon="tabler-dots-vertical" />
            </IconBtn>
          </template>

          <VList>
            <VListItem rounded @click="duplicateNegocio">
              Duplicar Negócio
            </VListItem>
            <VListItem rounded @click="deleteNegocio">
              Excluir Negócio
            </VListItem>
          </VList>
        </VMenu>
      </div>
    </div>

    <div
      class="d-flex flex-row align-center"
      v-if="funis.length > 0 && negocio?.etapaId"
    >
      <div
        v-for="(etapa, index) in funis"
        :key="etapa.id"
        class="etapa-div d-flex align-center justify-center"
        style="height: 35px"
        :class="{
          'bg-primary': negocio.etapaId == etapa.id,
          'etapa-first': index === 0,
          'etapa-last': index === funis.length - 1,
        }"
        @click="changeEtapa(etapa.id)"
      >
        <p
          class="mb-0 text-sm"
          v-if="negocio.idadesEtapas?.[etapa.id] !== undefined"
        >
          {{ negocio.idadesEtapas?.[etapa.id] ?? 0 }}
        </p>
        <VTooltip activator="parent" location="bottom">
          <p class="mb-0">{{ etapa.nome }}</p>
          <p
            class="mb-0 text-caption"
            v-if="negocio.idadesEtapas?.[etapa.id] !== undefined"
          >
            {{
              negocio.etapaId == etapa.id
                ? "Está aqui há"
                : "Esteve aqui durante"
            }}
            {{ negocio.idadesEtapas?.[etapa.id] ?? 0 }}
          </p>

          <p class="mb-0 text-caption" v-else>Não passou por esta etapa</p>
        </VTooltip>
      </div>
    </div>
  </div>

  <div
    class="d-flex flex-row align-start h-screen"
    v-if="negocio?.id && !loading"
  >
    <div
      class="pa-2 d-flex flex-row gap-0 h-100"
      :style="`width: ${widthLateral}%;transition: all 0.${
        !isResizing ? '2s' : '3s'
      };`"
    >
      <div style="width: 98%">
        <div v-for="(aba, index) in tabsInfo" :key="index" class="mb-6">
          <div
            class="d-flex flex-row justify-space-between align-center mb-2 cursor-pointer"
          >
            <p class="text-h5 mb-0" @click="handleTabInfo(aba.indexKey)">
              {{ aba.title }}
            </p>

            <div class="linha-flex">
              <VIcon
                v-if="aba.editable"
                :icon="aba.iconEdit ? aba.iconEdit : 'tabler-edit'"
                @click="aba.actionEdit ? aba.actionEdit() : null"
              />

              <VIcon
                @click="handleTabInfo(aba.indexKey)"
                :icon="
                  tabInfo.includes(aba.indexKey)
                    ? 'tabler-chevron-up'
                    : 'tabler-chevron-down'
                "
              />
            </div>
          </div>

          <v-expand-transition>
            <div v-if="tabInfo.includes(aba.indexKey)">
              <template v-if="aba.key === 'resumo'">
                <div v-if="negocio.status == 'Perdido'">
                  <p
                    class="mb-2 cursor-pointer text-sm"
                    v-if="negocio.dataPerdido"
                  >
                    <VIcon icon="tabler-calendar-x" class="mr-2" />

                    {{ moment(negocio.dataPerdido).format("DD/MM/YYYY HH:mm") }}

                    <VTooltip activator="parent" location="bottom">
                      <p class="mb-0 text-sm">
                        Data que o negócio foi marcado como perdido
                      </p>
                    </VTooltip>
                  </p>

                  <p
                    class="mb-2 cursor-pointer text-sm"
                    v-if="negocio.motivoPerdido"
                  >
                    <VIcon icon="tabler-circle-x" class="mr-2" />

                    {{ negocio.motivoPerdido }}

                    <VTooltip activator="parent" location="bottom">
                      <p class="mb-0 text-sm">Motivo da perda do negócio</p>
                    </VTooltip>
                  </p>

                  <p
                    class="mb-3 text-sm cursor-pointer"
                    v-if="negocio.obsPerdido"
                    @click="negocio.viewObsPerdido = !negocio.viewObsPerdido"
                    :class="{
                      'text-truncate mr-12': !negocio.viewObsPerdido,
                      'mr-3': negocio.viewObsPerdido,
                    }"
                  >
                    <VIcon icon="tabler-note" class="mr-2" />

                    {{ negocio.obsPerdido }}

                    <VTooltip activator="parent" location="bottom">
                      <p class="mb-0 text-sm">Observações sobre a perda</p>
                    </VTooltip>
                  </p>
                </div>

                <!--Valor-->
                <AppTextEdit
                  v-model="negocio.valor"
                  tag="p"
                  class="text-sm mb-3"
                  type="dinheiro"
                  tooltip="Valor do negócio"
                  icon="tabler-coin"
                  @save="updateKeyNegocio('valor', $event)"
                />

                <!--Data Fechamento Esperada-->
                <AppTextEdit
                  v-model="negocio.data_fechamento_esperada"
                  tag="p"
                  class="text-sm mb-3"
                  type="date"
                  tooltip="Data de fechamento esperada"
                  icon="tabler-calendar-event"
                  @save="updateKeyNegocio('data_fechamento_esperada', $event)"
                />

                <!--Data Fechamento-->
                <AppTextEdit
                  v-if="negocio.data_fechamento"
                  v-model="negocio.data_fechamento"
                  tag="p"
                  class="text-sm mb-3"
                  type="date"
                  tooltip="Data de fechamento"
                  icon="tabler-calendar-check"
                  colorIcon="success"
                  @save="updateKeyNegocio('data_fechamento', $event)"
                />

                <!--Fonte-->
                <VMenu
                  offset-y
                  max-width="300"
                  min-width="300"
                  max-height="300"
                  transition="scale-transition"
                  rounded="xl"
                >
                  <template v-slot:activator="{ props }">
                    <p class="mb-2 cursor-pointer text-sm" v-bind="props">
                      <VIcon icon="tabler-world" class="mr-2" />

                      {{ negocio.origem || "Fonte" }}

                      <VTooltip activator="parent" location="start">
                        <p class="mb-0 text-sm">Fonte</p>
                      </VTooltip>
                    </p>
                  </template>

                  <VList>
                    <VListItem
                      v-for="(fonte, index) in fontesClientes"
                      :key="index"
                      rounded
                      @click="updateKeyNegocio('origem', fonte)"
                    >
                      {{ fonte }}
                    </VListItem>
                  </VList>
                </VMenu>

                <!--Etiquetas-->
                <VMenu
                  offset-y
                  max-width="300"
                  min-width="300"
                  transition="scale-transition"
                  rounded="xl"
                  :close-on-content-click="false"
                >
                  <template v-slot:activator="{ props }">
                    <p class="mb-3 cursor-pointer text-sm" v-bind="props">
                      <VIcon icon="tabler-tags" class="mr-2" />
                      Etiquetas ({{ negocio?.tags?.length ?? 0 }})
                    </p>
                  </template>

                  <VList>
                    <VListItem rounded>
                      <VTextField
                        v-model="searchQueryTags"
                        label="Buscar etiquetas"
                        density="compact"
                        :loading="loadingTag"
                        clearable
                        @update:model-value="getTags"
                      />
                    </VListItem>

                    <VListItem
                      v-for="(tag, index) in tags"
                      :key="index"
                      rounded
                      @click="updateTagsNegocio(tag.id)"
                    >
                      <VChip
                        :color="tag.color || 'primary'"
                        variant="flat"
                        label
                      >
                        {{ tag.name }}
                      </VChip>
                    </VListItem>

                    <VListItem rounded>
                      <VBtn
                        :loading="loadingSaveTag"
                        color="primary"
                        class="w-100"
                        size="small"
                        variant="tonal"
                        @click="viewNewTag = !viewNewTag"
                      >
                        <VIcon icon="tabler-plus" class="mr-2" />
                        Nova Etiqueta
                      </VBtn>
                    </VListItem>
                  </VList>
                </VMenu>

                <VDialog v-model="viewNewTag" max-width="500">
                  <VCard v-if="newTag">
                    <VCardText>
                      <AppDrawerHeaderSection
                        customClass="pa-0"
                        :title="
                          newTag?.id ? 'Editar Etiqueta' : 'Nova Etiqueta'
                        "
                        @cancel="
                          viewNewTag = false;
                          newTag = { name: '', description: '', color: '' };
                        "
                      />

                      <AppTextField
                        v-model="newTag.name"
                        label="Nome"
                        placeholder="Nome da etiqueta"
                        class="mb-4"
                        :rules="[requiredValidator]"
                        required
                      />

                      <label
                        class="v-label mb-2 text-body-2 text-high-emphasis"
                      >
                        Cor da etiqueta
                      </label>
                      <div class="d-flex justify-center mb-6">
                        <VColorPicker
                          class="color-picker-custom"
                          v-model="newTag.color"
                          :swatches="[
                            ['#FFFF00', '#AAAA00', '#555500'], // amarelo
                            ['#00FF00', '#00AA00', '#005500'], // verde
                            ['#FFA500', '#FF8C00', '#FF4500'], // laranja
                            ['#FF0000', '#AA0000', '#550000'], // vermelho
                            ['#FF00FF', '#AA00AA', '#550055'], // mantendo
                          ]"
                          show-swatches
                          hide-inputs
                          hide-sliders
                          canvas-height="100px"
                          :modes="['hexa']"
                        />
                      </div>

                      <div class="d-flex flex-row align-center justify-center">
                        <VBtn
                          :loading="loadingSaveTag"
                          color="primary"
                          class="mr-4"
                          @click="upsertTag"
                        >
                          <VIcon icon="tabler-check" class="mr-2" />
                          Salvar
                        </VBtn>

                        <VBtn
                          variant="text"
                          @click="
                            viewNewTag = false;
                            newTag = { name: '', description: '', color: '' };
                          "
                        >
                          Cancelar
                        </VBtn>
                      </div>
                    </VCardText>
                  </VCard>
                </VDialog>

                <div class="d-flex flex-row mb-3" v-if="negocio?.tags?.length">
                  <template
                    v-for="(tag, index) in negocio?.tags || []"
                    :key="index"
                  >
                    <VChip
                      v-if="tags.find((t) => t.id == tag)"
                      class="ma-1"
                      :color="tags.find((t) => t.id == tag)?.color || 'primary'"
                      variant="flat"
                      label
                    >
                      {{ tags.find((t) => t.id == tag)?.name }}
                    </VChip>
                  </template>
                </div>
              </template>

              <template v-else-if="aba.key === 'cliente'">
                <p
                  class="mb-2 text-sm cursor-pointer text-primary"
                  @click="
                    negocio?.cliente?.cli_Id
                      ? router.push(`/cliente/${negocio.cliente.cli_Id}`)
                      : null
                  "
                >
                  <VIcon icon="tabler-user" class="mr-2" />
                  <span v-if="negocio?.cliente">
                    {{ negocio.cliente?.cli_nome }}
                  </span>
                  <span v-else>Sem cliente vinculado</span>
                </p>

                <p class="mb-2 text-sm" v-if="negocio?.cliente?.cli_email">
                  <VIcon icon="tabler-mail" class="mr-2" />
                  <span>
                    {{ negocio.cliente?.cli_email }}
                  </span>
                </p>

                <p class="mb-2 text-sm" v-if="negocio?.cliente?.cli_celular">
                  <VIcon icon="tabler-phone" class="mr-2" />
                  <span>
                    {{ negocio.cliente?.cli_celular }}
                  </span>
                </p>

                <p class="mb-2 cursor-pointer text-sm">
                  <VIcon icon="tabler-tags" class="mr-1" />
                  Etiquetas ({{ negocio?.cliente?.tags?.length ?? 0 }})
                </p>

                <div
                  class="d-flex flex-row mb-3"
                  v-if="negocio?.cliente?.tags?.length"
                >
                  <template
                    v-for="(tag, index) in negocio?.cliente?.tags || []"
                    :key="index"
                  >
                    <VChip
                      v-if="tags.find((t) => t.id == tag)"
                      class="ma-1"
                      :color="tags.find((t) => t.id == tag)?.color || 'primary'"
                      variant="flat"
                      label
                    >
                      {{ tags.find((t) => t.id == tag)?.name }}
                    </VChip>
                  </template>
                </div>
              </template>

              <template v-else-if="aba.key === 'agendamento'">
                <div v-if="!negocio?.agendamento?.age_data">
                  <p class="mb-0 text-sm">Nenhum agendamento vinculado</p>
                  <p
                    class="mb-2 text-sm text-primary cursor-pointer"
                    @click="openVincularAgendamento()"
                  >
                    <VIcon
                      :icon="
                        !loadingAgendamentos ? 'tabler-link' : 'tabler-loader'
                      "
                      class="mr-2"
                    />
                    Vincular agendamento
                  </p>
                </div>

                <div v-else>
                  <p
                    class="mb-2 text-sm text-primary cursor-pointer"
                    @click="
                      negocio?.agendamento?.age_id
                        ? router.push(
                            `/agendamento?viewAgendamento=${negocio.agendamento.age_id}`
                          )
                        : null
                    "
                  >
                    <VIcon icon="tabler-calendar" class="mr-2" />
                    {{
                      formatDateAgendamento(
                        negocio.agendamento.age_data,
                        negocio.agendamento.age_horaInicio,
                        negocio.agendamento.age_horaFim
                      )
                    }}

                    <VTooltip activator="parent" location="bottom">
                      <p class="mb-0 text-sm">Data do agendamento</p>
                    </VTooltip>
                  </p>

                  <p
                    class="mb-2 text-sm"
                    v-if="negocio?.agendamento?.age_valor != null"
                  >
                    <VIcon icon="tabler-coin" class="mr-2" />
                    {{ formatValue(negocio.agendamento.age_valor) }}

                    <VTooltip activator="parent" location="bottom">
                      <p class="mb-0 text-sm">Valor do agendamento</p>
                    </VTooltip>
                  </p>

                  <p class="mb-2 text-sm">
                    <VIcon icon="tabler-tools" class="mr-2" />
                    {{ negocio.agendamento?.servicos?.length || 0 }} serviço(s)

                    <VTooltip activator="parent" location="bottom">
                      <p
                        class="mb-0 text-sm"
                        v-if="!negocio.agendamento?.servicos?.length"
                      >
                        Serviços do agendamento
                      </p>

                      <div v-else>
                        <p
                          class="mb-0 text-sm"
                          v-for="(servico, index) in negocio.agendamento
                            ?.servicos"
                        >
                          {{ index + 1 }} - {{ servico?.ser_nome }} ({{
                            formatValue(servico?.ser_valor)
                          }})
                        </p>
                      </div>
                    </VTooltip>
                  </p>

                  <p class="mb-2 text-sm">
                    <VIcon icon="tabler-info-circle" class="mr-2" />
                    {{ negocio.agendamento?.status || "Sem status" }}

                    <VTooltip activator="parent" location="bottom">
                      <p class="mb-0 text-sm">Status do agendamento</p>
                    </VTooltip>
                  </p>

                  <p class="mb-2 text-sm">
                    <VIcon icon="tabler-map-pin" class="mr-2" />
                    {{
                      negocio.agendamento?.endereco?.length > 0
                        ? escreverEndereco(negocio.agendamento.endereco[0])
                        : "Sem endereço"
                    }}

                    <VTooltip activator="parent" location="bottom">
                      <p class="mb-0 text-sm">Endereço do agendamento</p>
                    </VTooltip>
                  </p>

                  <p class="mb-2 text-sm text-truncate">
                    <VIcon icon="tabler-user" class="mr-2" />
                    {{
                      negocio.agendamento?.funcionario?.length
                        ? negocio.agendamento.funcionario[0]?.fullName
                        : "Sem funcionário"
                    }}

                    <VTooltip activator="parent" location="bottom">
                      <p class="mb-0 text-sm">Funcionário do agendamento</p>
                    </VTooltip>
                  </p>
                </div>
              </template>
            </div>
          </v-expand-transition>
        </div>
      </div>
      <VDivider
        :color="isResizing ? 'primary' : undefined"
        vertical
        :thickness="isResizing ? 4 : 2"
        class="ml-auto alterar-borda"
        @mousedown="startResize"
      />
    </div>
    <div
      class="pa-4 h-100"
      :style="`width: ${100 - widthLateral}%;transition: all 0.${
        !isResizing ? '2s' : '3s'
      };`"
    >
      <div class="d-flex flex-row flex-nowrap gap-3 mb-4">
        <VBtn
          v-for="(aba, index) in tabs"
          :key="index"
          :color="tab === aba.title ? 'primary' : 'grey lighten-2'"
          :text-color="tab === aba.title ? 'white' : 'black'"
          @click="tab = aba.title"
          class="text-none"
        >
          <VIcon :icon="aba.icon" class="mr-2" />
          {{ aba.title }}
        </VBtn>
      </div>
      <VWindow v-model="tab">
        <VWindowItem value="Atividades">
          <atividades type="negocio" :objData="negocio" @getData="getNegocio" />
        </VWindowItem>

        <VWindowItem value="Anotações">
          <anotacoes type="negocio" :objData="negocio" @getData="getNegocio" />
        </VWindowItem>

        <VWindowItem value="Histórico">
          <VCard class="mb-4">
            <VCardText>
              <p class="text-sm mb-2">
                {{ totalHistorico }} registros -
                {{
                  paginationMeta(
                    { page: pageHistorico, itemsPerPage: itemsPerPageHistorico },
                    totalHistorico
                  )
                }}
              </p>
              <VRow>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="searchQueryHistorico"
                    placeholder="Pesquisar histórico..."
                    density="compact"
                    clearable
                  />
                </VCol>
                <VCol cols="12" md="3">
                  <VSelect
                    v-model="orderByHistorico"
                    :items="orderByItensHistorico"
                    placeholder="Ordenar por"
                    density="compact"
                  />
                </VCol>
                <VCol cols="12" md="3">
                  <VSelect
                    v-model="funcionarioQueryHistorico"
                    :items="funcionariosHistorico"
                    placeholder="Filtrar por funcionário"
                    density="compact"
                    clearable
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <div
            style="max-height: 550px; overflow-y: auto"
            v-if="filteredHistoricoNegocio.length > 0"
            class="ml-4 pr-4"
          >
            <v-timeline side="end">
              <v-timeline-item
                v-for="(hist, index) in filteredHistoricoNegocio"
                :key="index"
                :dot-color="hist.color ?? 'primary'"
                :icon="hist.icon ?? undefined"
                fill-dot
              >
                <VCard
                  :color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
                  rounded="lg"
                >
                  <VCardText class="py-3">
                    <p class="mb-0">
                      {{ hist.title }}
                    </p>
                    <p class="mb-1 text-sm">
                      {{ hist.description }}
                    </p>
                    <p class="mb-1 text-caption" style="opacity: 0.8">
                      <VIcon icon="tabler-calendar" class="mr-1" />
                      {{ moment(hist.date).format("DD/MM/YYYY HH:mm") }}
                    </p>
                    <p class="mb-0 text-caption" style="opacity: 0.8">
                      <VIcon icon="tabler-user" class="mr-1" />
                      {{ hist.feitoPor ?? "Sistema" }}
                    </p>
                  </VCardText>
                </VCard>
              </v-timeline-item>
            </v-timeline>
          </div>

          <div v-else>
            <p class="text-center text-caption my-5">
              Nenhum registro encontrado
            </p>
          </div>

          <VPagination
            v-if="totalHistorico > itemsPerPageHistorico"
            v-model="pageHistorico"
            :length="Math.ceil(totalHistorico / itemsPerPageHistorico)"
            :total-visible="5"
            class="mt-4"
          />
        </VWindowItem>
      </VWindow>
    </div>
  </div>
</template>

<style>
  .alterar-borda {
    cursor: ew-resize;
  }
</style>
