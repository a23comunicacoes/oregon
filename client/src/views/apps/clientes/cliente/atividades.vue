<script setup>
  import moment from "moment";
  import { temaAtual } from "@core/stores/config";
  import { useFunctions } from "@/composables/useFunctions";

  const { tratarHtml } = useFunctions();
  const router = useRouter();
  const userData = useCookie("userData").value;

  const { setAlert } = useAlert();
  const data = ref(null);

  const props = defineProps({
    objData: {
      type: Object,
      default: null,
    },
    type: {
      type: String,
      default: "cliente", // cliente ou negocio
    },
  });

  if (props.objData) {
    data.value = props.objData;
    console.log("Atividades", data.value?.atividades);
  }

  watch(
    () => props.objData,
    (newVal) => {
      data.value = newVal;

      console.log("Atividades", data.value?.atividades);
    },
    { immediate: true }
  );

  const emit = defineEmits(["getData"]);

  const typesAtividades = [
    { value: "Ligação", label: "Ligação", icon: "tabler-phone" },
    { value: "Reunião", label: "Reunião", icon: "tabler-calendar-event" },
    { value: "E-mail", label: "E-mail", icon: "tabler-mail" },
    { value: "Tarefa", label: "Tarefa", icon: "tabler-check" },
    { value: "Outro", label: "Outro", icon: "tabler-dots" },
  ];

  let refTarefa = {
    type: null,
    title: null,
    description: null,
    date: null,
    hora: null,
    dateAte: null,
    horaAte: null,
    concluido: false,
    endereco: {
      logradouro: null,
      numero: null,
      cidade: null,
      estado: null,
      cep: null,
      pais: null,
    },
    funcionario: null,
    notifyCliente: false,
    notifyFuncionario: false,
  };

  const newTarefa = ref({ ...refTarefa });
  const viewNewTarefa = ref(false);

  const loadingUpsert = ref(false);

  const upsertTarefa = async () => {
    if (!newTarefa.value.type) {
      setAlert(
        "Selecione o tipo de atividade.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    if (!newTarefa.value.title) {
      setAlert(
        "Digite o título da atividade.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    if (!newTarefa.value.date) {
      setAlert(
        "Selecione a data da atividade.",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }

    loadingUpsert.value = true;

    if (newTarefa.value.funcionario?.fullName?.includes("(Você)")) {
      newTarefa.value.funcionario.fullName =
        newTarefa.value.funcionario.fullName.replace(" (Você)", "");
    }

    console.log("Salvando atividade:", newTarefa.value);

    try {
      const res = await $api("/crm/upsert/atividade", {
        method: "POST",
        body: {
          ...newTarefa.value,
          refId: data.value.id,
          refType: props.type,
        },
      });

      if (!res) throw new Error("Erro ao salvar atividade");

      setAlert("Atividade salva com sucesso.", "success", "tabler-check", 3000);

      // Reset form
      newTarefa.value = { ...refTarefa };

      if (res.atividade.id) {
        data.value.atividades = data.value.atividades || [];
        // Se já existir, atualiza
        let index = data.value.atividades.findIndex(
          (a) => a.id === res.atividade.id
        );
        if (index > -1) {
          data.value.atividades[index] = res.atividade;
        } else {
          // Se não existir, adiciona
          data.value.atividades.push(res.atividade);
        }
      }

      viewNewTarefa.value = false;
    } catch (error) {
      console.error("Erro ao salvar atividade:", error);
      setAlert(
        error?.response?._data?.message ||
          "Erro ao salvar atividade. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    } finally {
      loadingUpsert.value = false;
    }
  };

  const deleteAtividade = async (id) => {
    if (!id) return;

    let index = data.value.atividades.findIndex((a) => a.id === id);
    if (index === -1) return;

    let atividade = data.value.atividades[index];

    const confirmar = confirm(
      `Tem certeza que deseja excluir a atividade "${atividade.title}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmar) return;

    try {
      const res = await $api(`/crm/delete/atividade`, {
        method: "DELETE",
        body: {
          refId: data.value.id,
          refType: props.type,
          atividadeId: id,
        },
      });

      if (!res) throw new Error("Erro ao excluir atividade");

      setAlert(
        "Atividade excluída com sucesso.",
        "success",
        "tabler-check",
        3000
      );

      // Remover da lista
      data.value.atividades = data.value.atividades.filter((a) => a.id !== id);
    } catch (error) {
      console.error("Erro ao excluir atividade:", error);
      setAlert(
        error?.response?._data?.message ||
          "Erro ao excluir atividade. Tente novamente.",
        "error",
        "tabler-alert-triangle",
        3000
      );
    }
  };

  const searchQuery = ref("");
  const dataDeQuery = ref(null);
  const dataAteQuery = ref(null);
  const typeQuery = ref(null);
  const funcionarioQuery = ref(null);

  const page = ref(1);
  const itemsPerPage = ref(10);
  const orderBy = ref("date");

  const filteredAtividades = computed(() => {
    if (!data.value || !data.value.atividades) return [];

    let atividades = [...data.value.atividades];

    if (searchQuery.value) {
      const searchLower = searchQuery.value.toLowerCase();
      atividades = atividades.filter(
        (a) =>
          a.title.toLowerCase().includes(searchLower) ||
          a.description?.toLowerCase()?.includes(searchLower)
      );
    }

    if (dataDeQuery.value) {
      const dataDe = moment(dataDeQuery.value).startOf("day");
      atividades = atividades.filter((a) =>
        moment(a.date).isSameOrAfter(dataDe)
      );
    }

    if (dataAteQuery.value) {
      const dataAte = moment(dataAteQuery.value).endOf("day");
      atividades = atividades.filter((a) =>
        moment(a.date).isSameOrBefore(dataAte)
      );
    }

    if (typeQuery.value) {
      atividades = atividades.filter((a) => a.type === typeQuery.value);
    }

    if (funcionarioQuery.value) {
      console.log("Filtrando por funcionário:", funcionarioQuery.value);
      atividades = atividades.filter(
        (a) => a.funcionario?.id == funcionarioQuery.value
      );
    }

    // Ordenar
    atividades.sort((a, b) => {
      if (orderBy.value === "date") {
        return new Date(b.date) - new Date(a.date);
      } else if (orderBy.value === "type") {
        return a.type.localeCompare(b.type);
      } else if (orderBy.value === "funcionario") {
        return (a.funcionario?.name || "").localeCompare(
          b.funcionario?.name || ""
        );
      } else if (orderBy.value === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    //Offset e limite
    const start = (page.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return atividades.slice(start, end);
  });

  const viewFilters = ref(false);

  const funcionarios = ref([]);

  const getFuncionarios = async () => {
    try {
      const res = await $api("/users/list", {
        method: "GET",
        query: {
          itemsPerPage: 1000,
        },
      });

      if (!res) return;

      console.log("Funcionários carregados:", res);

      funcionarios.value = res.users;

      //Adicionar todos os funcionários
      funcionarios.value.unshift({
        id: null,
        fullName: "Todos",
      });

      if (funcionarios.value.find((f) => f.id == userData.id)) {
        let index = funcionarios.value.findIndex((f) => f.id == userData.id);
        funcionarios.value[index].fullName =
          funcionarios.value[index].fullName + " (Você)";
      }
    } catch (error) {
      console.error("Error fetching resources", error);
    }
  };

  getFuncionarios();
</script>
<template>
  <div class="d-flex flex-row align-center mb-4 justify-space-between">
    <div>
      <p class="mb-0 text-h5">Atividades</p>
      <p class="mb-0 text-caption">
        Gerencie as atividades/ações relacionadas a este
        {{ props.type === "cliente" ? "cliente" : "negócio" }}.
      </p>
    </div>

    <VBtn
      color="primary"
      :loading="loadingUpsert"
      @click="viewNewTarefa = !viewNewTarefa"
    >
      <VIcon icon="tabler-plus" class="me-2" />
      Nova Atividade
    </VBtn>
  </div>

  <VDialog v-model="viewNewTarefa" width="600" persistent>
    <VCard>
      <VCardText>
        <AppDrawerHeaderSection
          customClass="pa-0 mb-3"
          :title="newTarefa?.id ? 'Editar Atividade' : 'Nova Atividade'"
          @cancel="
            viewNewTarefa = false;
            newTarefa = refTarefa;
          "
        />
        <VRow>
          <VCol cols="12">
            <AppTextField
              v-model="newTarefa.title"
              label="Título"
              placeholder="Ex: Reunião com o cliente"
              required
              :rules="[requiredValidator]"
            />
          </VCol>
          <VCol cols="12">
            <label class="v-label mb-1 text-body-2 text-high-emphasis">
              Tipo de Atividade <span class="text-error ml-1">*</span>
            </label>

            <div class="d-flex flex-wrap gap-1 justify-start">
              <VBtn
                v-for="type in typesAtividades"
                :key="type.value"
                :color="newTarefa.type === type.value ? 'primary' : 'secondary'"
                :variant="newTarefa.type === type.value ? 'flat' : 'outlined'"
                @click="newTarefa.type = type.value"
                size="small"
                rounded="2"
                style="height: 34px"
              >
                <VIcon :icon="type.icon" class="me-2" />
                {{ type.label }}
              </VBtn>
            </div>
          </VCol>
          <VCol cols="12">
            <AppTextarea
              v-model="newTarefa.description"
              label="Descrição"
              rows="2"
              placeholder="Descreva a atividade..."
              active
            />
          </VCol>
          <VCol cols="12" class="d-flex flex-row gap-2">
            <AppTextField
              v-model="newTarefa.date"
              label="Data"
              type="date"
              required
              :rules="[requiredValidator]"
            />

            <AppTextField v-model="newTarefa.hora" label="Hora" type="time" />

            <AppTextField
              v-model="newTarefa.dateAte"
              label="Data até"
              type="date"
            />

            <AppTextField
              v-model="newTarefa.horaAte"
              label="Hora até"
              type="time"
            />
          </VCol>
          <VCol cols="12">
            <AppSelect
              v-model="newTarefa.funcionario"
              :items="funcionarios.filter((f) => f.id !== null)"
              item-value="id"
              item-title="fullName"
              return-object
              label="Atribuir a funcionário"
              placeholder="Selecione um funcionário"
            />
          </VCol>
          <VCol cols="12">
            <VCheckbox
              v-model="newTarefa.notifyFuncionario"
              :disabled="loadingUpsert || !newTarefa.funcionario"
              density="compact"
            >
              <template #label>
                <span class="text-sm">
                  Notificar funcionário por e-mail (se atribuído)
                </span>
              </template>
            </VCheckbox>

            <VCheckbox
              v-model="newTarefa.notifyCliente"
              :disabled="loadingUpsert"
              density="compact"
            >
              <template #label>
                <span class="text-sm">
                  Notificar cliente (WhatsApp/E-mail)
                </span>
              </template>
            </VCheckbox>
          </VCol>
        </VRow>

        <div class="d-flex flex-row justify-end mt-4">
          <VBtn
            variant="outlined"
            color="secondary"
            class="me-3"
            @click="
              viewNewTarefa = false;
              newTarefa = refTarefa;
            "
            :disabled="loadingUpsert"
          >
            Cancelar
          </VBtn>
          <VBtn
            color="primary"
            @click="upsertTarefa()"
            :loading="loadingUpsert"
          >
            Salvar
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <VCard rounded="xl" class="mb-4">
    <VCardText>
      <VRow>
        <VCol cols="12" class="d-flex flex-row gap-3 align-end">
          <AppTextField
            v-model="searchQuery"
            label="Buscar"
            placeholder="Buscar por título ou descrição"
            clearable
          />

          <VBtn @click="viewFilters = !viewFilters">
            <VIcon
              :icon="!viewFilters ? 'tabler-filter' : 'tabler-filter-off'"
              class="me-2"
            />
            {{ viewFilters ? "Ocultar Filtros" : "Mostrar Filtros" }}
          </VBtn>
        </VCol>

        <template v-if="viewFilters">
          <VCol cols="12" md="3">
            <AppTextField
              v-model="dataDeQuery"
              label="Data de"
              type="date"
              clearable
            />
          </VCol>

          <VCol cols="12" md="3">
            <AppTextField
              v-model="dataAteQuery"
              label="Data até"
              type="date"
              clearable
            />
          </VCol>

          <VCol cols="12" md="3">
            <AppSelect
              v-model="typeQuery"
              :items="[{ value: null, label: 'Todos' }, ...typesAtividades]"
              item-value="value"
              item-title="label"
              label="Tipo de atividade"
              clearable
            />
          </VCol>

          <VCol cols="12" md="3">
            <AppSelect
              v-model="funcionarioQuery"
              :items="funcionarios"
              item-value="id"
              item-title="fullName"
              label="Funcionário"
              clearable
            />
          </VCol>
        </template>
      </VRow>
    </VCardText>
  </VCard>

  <div v-if="data?.atividades?.length > 0">
    <v-timeline side="end">
      <v-timeline-item
        v-for="(atividade, index) in filteredAtividades"
        :key="index"
        fill-dot
      >
        <template v-slot:icon>
          <VIcon
            :icon="
              atividade.type
                ? typesAtividades.find((t) => t.value === atividade.type)?.icon
                : 'tabler-dots'
            "
            color="primary"
          />
        </template>
        <VCard>
          <VCardText
            class="pt-3 d-flex flex-row justify-space-between align-center"
            :class="atividade.description ? 'pb-1' : 'pb-3'"
          >
            <div>
              <p
                class="mb-1 text-h6 cursor-pointer"
                @click="
                  newTarefa = { ...atividade };
                  viewNewTarefa = true;
                "
              >
                <VChip
                  size="small"
                  label
                  :color="
                    atividade.concluido
                      ? 'success'
                      : moment(atividade.date).isBefore(moment(), 'day')
                      ? 'error'
                      : moment(atividade.date).isSame(moment(), 'day')
                      ? 'info'
                      : 'primary'
                  "
                  variant="flat"
                  class="mr-2"
                  v-if="
                    atividade.concluido ||
                    moment(atividade.date).isBefore(moment(), 'day') ||
                    moment(atividade.date).isSame(moment(), 'day')
                  "
                >
                  {{
                    atividade.concluido
                      ? "Concluído"
                      : moment(atividade.date).isBefore(moment(), "day")
                      ? "Atrasado"
                      : "Hoje"
                  }}
                </VChip>
                {{ atividade.title }}
              </p>
              <p class="mb-1 text-sm" style="opacity: 0.8">
                <span>
                  <VIcon icon="tabler-calendar" class="mr-1" />
                  {{
                    atividade.hora
                      ? moment(atividade.date + " " + atividade.hora).format(
                          "DD/MM/YYYY HH:mm"
                        )
                      : moment(atividade.date).format("DD/MM/YYYY")
                  }}
                </span>
                <span v-if="atividade.horaAte || atividade.dateAte">
                  -
                  {{
                    atividade.horaAte
                      ? moment(
                          atividade.dateAte + " " + atividade.horaAte
                        ).format("DD/MM/YYYY HH:mm")
                      : atividade.dateAte
                      ? moment(atividade.dateAte).format("DD/MM/YYYY")
                      : ""
                  }}
                </span>
              </p>
              <p class="mb-2 text-caption" style="opacity: 0.8">
                <VIcon icon="tabler-user" class="mr-1" />
                {{ atividade?.funcionario?.fullName ?? "Sistema" }}
              </p>
            </div>

            <div class="d-flex flex-row gap-2 align-center">
              <IconBtn
                variant="tonal"
                color="primary"
                @click="
                  newTarefa = { ...atividade };
                  viewNewTarefa = true;
                "
              >
                <VIcon icon="tabler-eye" />
              </IconBtn>

              <IconBtn
                v-if="!atividade.concluido"
                color="success"
                variant="tonal"
                @click="
                  atividade.concluido = true;
                  newTarefa = { ...atividade };
                  upsertTarefa();
                "
              >
                <VIcon icon="tabler-checks" />
              </IconBtn>

              <IconBtn
                color="error"
                variant="tonal"
                @click="deleteAtividade(atividade.id)"
              >
                <VIcon icon="tabler-trash" />
              </IconBtn>
            </div>
          </VCardText>
        </VCard>
        <VCard v-if="atividade.description" color="#fff6d6">
          <VCardText class="pt-2 pb-3">
            <p class="mb-1 text-sm" style="opacity: 0.8">
              <VIcon icon="tabler-align-justified" class="mr-1" />
              Descrição
            </p>

            <p class="mb-0 text-sm">
              <span
                v-html="
                  tratarHtml(
                    atividade.description.length > 100 && !atividade.viewDesc
                      ? atividade.description.substring(0, 100) + '...'
                      : atividade.description.replace(/\n/g, '<br />')
                  )
                "
              />

              <span
                v-if="atividade.description.length > 100"
                class="ml-1 text-primary cursor-pointer"
                @click="atividade.viewDesc = !atividade.viewDesc"
              >
                {{ atividade.viewDesc ? "Ver menos" : "Ver mais" }}
              </span>
            </p>
          </VCardText>
        </VCard>
      </v-timeline-item>
    </v-timeline>
  </div>

  <p v-else class="text-center text-sm my-6">Nenhuma atividade encontrada.</p>
</template>
