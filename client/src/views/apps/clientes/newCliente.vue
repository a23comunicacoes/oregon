<script setup>
import { temaAtual } from "@core/stores/config";
import { useFunctions } from "@/composables/useFunctions";
import moment from "moment";

const { getCep, estados, getCidades, escreverEndereco } = useFunctions();

const { setAlert } = useAlert();

const userData = useCookie("userData").value;
const emit = defineEmits(["update:isDrawerOpen", "clienteSaved"]);

let refData = {
  id: null,
  nome: "",
  email: "",
  celular: "",
  contatos: [],
  endereco: [],
  contratos: [],
  cpf: "",
  personType: null,
  genero: null,
};

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  clienteData: {
    type: Object,
    default: {
      id: null,
      nome: "",
      email: "",
      celular: "",
      contatos: [],
      endereco: [],
      contratos: [],
      cpf: "",
      personType: null,
      genero: null,
    },
  },
});

const newUserData = ref({ ...refData });

watch(
  () => props.clienteData,
  (newVal) => {
    console.log("clienteData changed:", newVal);
    if (newVal?.id) {
      newUserData.value = { ...refData, ...newVal };
    } else {
      newUserData.value = { ...refData };
    }
  },
  { immediate: true }
);

const closeDrawer = () => {
  emit("update:isDrawerOpen", false);
  newUserData.value = { ...refData };
};

const handleDrawer = (val) => {
  emit("update:isDrawerOpen", val);
  if (!val) {
    newUserData.value = { ...refData };
  }
};

const preencherCep = async (index) => {
  if (newUserData?.value?.endereco[index]?.cep?.length === 9) {
    const endereco = await getCep(newUserData.value.endereco[index].cep);
    if (endereco) {
      newUserData.value.endereco[index].logradouro = endereco.logradouro;
      newUserData.value.endereco[index].cidade = endereco.localidade;
      newUserData.value.endereco[index].estado = endereco.uf;
      newUserData.value.endereco[index].bairro = endereco.bairro;
      handleEstadoChange(index, newUserData.value.endereco[index].estado);
    }
  }
};

const handleEstadoChange = async (index, newVal) => {
  if (!newUserData?.value?.endereco[index]) return;

  console.log("Estado changed to:", newVal);
  let cids = await getCidades(newVal);

  newUserData.value.endereco[index].cidades = cids ? cids : [];
};

const itensEnderecosAbertos = ref([]);

const loadingSave = ref(false);

const saveCliente = async () => {
  if (!newUserData.value?.nome) {
    return setAlert(
      "O nome do cliente é obrigatório.",
      "error",
      "tabler-alert-triangle",
      5000
    );
  }

  loadingSave.value = true;

  let data = JSON.parse(JSON.stringify(newUserData.value));

  for (let i = 0; i < data.endereco.length; i++) {
    delete data.endereco[i].cidades;
  }

  console.log("Saving cliente with data:", data);

  try {
    const res = await $api("/clientes/create", {
      method: "POST",
      body: data,
    });

    if (!res) {
      throw new Error("Erro ao salvar cliente");
    }

    console.log("Cliente salvo:", res);

    setAlert("Cliente salvo com sucesso!", "success", "tabler-check", 5000);

    emit("clienteSaved", res);
    closeDrawer();
  } catch (error) {
    console.error(error);
    setAlert(
      "Erro ao salvar cliente. Tente novamente.",
      "error",
      "tabler-alert-triangle",
      5000
    );
  } finally {
    loadingSave.value = false;
  }
};

const calcularPeriodo = (contrato) => {
  if (!contrato.periodoType || !contrato.periodo || !contrato.inicioData)
    return "";

  let inicio = moment(contrato.inicioData);

  switch (contrato.periodoType) {
    case "Mensal":
      return inicio.add(contrato.periodo, "months").format("DD/MM/YYYY");
    case "Trimestral":
      return inicio.add(contrato.periodo * 3, "months").format("DD/MM/YYYY");
    case "Semestral":
      return inicio.add(contrato.periodo * 6, "months").format("DD/MM/YYYY");
    case "Anual":
      return inicio.add(contrato.periodo, "years").format("DD/MM/YYYY");
  }

  return "";
};
</script>
<template>
  <VDialog
    :modelValue="props.isDrawerOpen"
    @update:modelValue="handleDrawer"
    max-width="600"
    persistent
  >
    <VCard v-if="newUserData && props.isDrawerOpen">
      <VCardText class="pa-4">
        <AppDrawerHeaderSection
          customClass="px-0 pb-0 pt-3"
          :title="newUserData?.id ? `Editar Cliente` : 'Novo Cliente'"
          @cancel="closeDrawer"
        />

        <VRow class="mt-2">
          <!-- Nome -->
          <VCol cols="12">
            <AppTextField
              v-model="newUserData.nome"
              label="Nome"
              placeholder="Nome"
              outlined
              :rules="[requiredValidator]"
              required
            />
          </VCol>

          <!-- Tipo de Pessoa -->
          <VCol cols="12" md="6">
            <AppSelect
              :items="['Física', 'Jurídica']"
              v-model="newUserData.personType"
              label="Tipo de Pessoa"
              placeholder="Física ou Jurídica"
              outlined
            />
          </VCol>

          <!-- CPF -->
          <VCol cols="12" md="6">
            <AppTextField
              v-model="newUserData.cpf"
              label="CPF/CNPJ"
              placeholder="000.000.000-00"
              outlined
              v-mask="['###.###.###-##', '##.###.###/####-##']"
            />
          </VCol>

          <!-- Gênero -->
          <VCol cols="12" md="6">
            <AppSelect
              :items="['Masculino', 'Feminino', 'Outro']"
              v-model="newUserData.genero"
              label="Gênero"
              placeholder="Masculino, Feminino, Outro"
              outlined
            />
          </VCol>

          <!-- Contatos -->
          <VCol cols="12">
            <VExpansionPanels>
              <VExpansionPanel
                title="Contatos"
                :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
              >
                <VExpansionPanelText class="pt-4">
                  <!-- Email -->
                  <AppTextField
                    v-model="newUserData.email"
                    label="E-mail Principal"
                    placeholder="email@exemplo.com"
                    outlined
                    :rules="[emailValidator]"
                  />

                  <p
                    class="mb-2 mt-2 text-primary cursor-pointer"
                    @click="
                      newUserData.contatos.push({ type: 'email', value: '' })
                    "
                  >
                    + Adicionar e-mail
                  </p>

                  <div
                    v-if="
                      newUserData.contatos?.filter((c) => c.type === 'email')
                        ?.length
                    "
                    v-for="(contato, index) in newUserData.contatos?.filter(
                      (c) => c.type === 'email'
                    )"
                    :key="index"
                    class="d-flex align-end mb-4 flex-row"
                  >
                    <AppTextField
                      v-if="contato"
                      v-model="contato.value"
                      :label="`E-mail Adicional (${index + 1})`"
                      placeholder="email@exemplo.com"
                      outlined
                      :rules="[emailValidator]"
                    />

                    <IconBtn
                      v-if="contato"
                      class="ml-2"
                      color="error"
                      @click="newUserData.contatos.splice(index, 1)"
                    >
                      <VIcon icon="tabler-trash" />
                    </IconBtn>
                  </div>

                  <VDivider class="my-4" />

                  <!-- Telefone -->
                  <AppTextField
                    v-model="newUserData.celular"
                    label="Telefone Principal"
                    placeholder="(00) 00000-0000"
                    outlined
                    v-mask="['(##) #####-####', '(##) ####-####']"
                  />

                  <p
                    class="mb-2 mt-2 text-primary cursor-pointer"
                    @click="
                      newUserData.contatos.push({ type: 'phone', value: '' })
                    "
                  >
                    + Adicionar Telefone
                  </p>

                  <div
                    v-if="
                      newUserData.contatos?.filter((c) => c.type === 'phone')
                        ?.length
                    "
                    v-for="(contato, index) in newUserData.contatos?.filter(
                      (c) => c.type === 'phone'
                    )"
                    :key="index"
                    class="d-flex align-end mb-4 flex-row"
                  >
                    <AppTextField
                      v-if="contato"
                      v-model="contato.value"
                      :label="`Telefone Adicional (${index + 1})`"
                      placeholder="(00) 00000-0000"
                      outlined
                      v-mask="['(##) #####-####', '(##) ####-####']"
                    />

                    <IconBtn
                      v-if="contato"
                      class="ml-2"
                      color="error"
                      @click="newUserData.contatos.splice(index, 1)"
                    >
                      <VIcon icon="tabler-trash" />
                    </IconBtn>
                  </div>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </VCol>

          <!-- Endereço -->
          <VCol cols="12" class="py-0">
            <VExpansionPanels>
              <VExpansionPanel
                :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
              >
                <VExpansionPanelTitle>
                  {{ `Endereços (${newUserData.endereco?.length})` }}
                </VExpansionPanelTitle>

                <VExpansionPanelText class="pt-4">
                  <VBtn
                    class="mb-4"
                    color="primary"
                    @click="
                      newUserData.endereco?.push({
                        logradouro: '',
                        numero: '',
                        cidade: null,
                        estado: null,
                        cep: '',
                        complemento: '',
                        bairro: '',
                      })
                    "
                    size="small"
                    variant="tonal"
                    style="height: 30px"
                  >
                    + Adicionar Endereço
                  </VBtn>

                  <VExpansionPanels
                    v-model="itensEnderecosAbertos"
                    multiple
                    v-if="newUserData.endereco?.length"
                  >
                    <VExpansionPanel
                      v-for="(endereco, idx) in newUserData.endereco"
                      :key="idx"
                    >
                      <VExpansionPanelTitle>
                        <div>
                          <p class="mb-0 text-sm">
                            {{ `Endereço ${idx + 1}` }}
                          </p>
                          <p
                            class="mb-0 text-caption text-truncate"
                            style="max-width: 90%"
                          >
                            {{ endereco ? escreverEndereco(endereco) : "" }}
                          </p>
                        </div>
                      </VExpansionPanelTitle>
                      <VExpansionPanelText class="pt-4">
                        <VRow v-if="endereco">
                          <!-- CEP -->
                          <VCol cols="12" md="4">
                            <AppTextField
                              v-model="endereco.cep"
                              label="CEP"
                              placeholder="00000-000"
                              outlined
                              v-mask="'#####-###'"
                              @update:modelValue="preencherCep(idx)"
                            />
                          </VCol>

                          <!-- Endereço - Rua -->
                          <VCol cols="12" md="8">
                            <AppTextField
                              v-model="endereco.logradouro"
                              label="Rua"
                              placeholder="Rua"
                              outlined
                            />
                          </VCol>

                          <!-- Endereço - Número -->
                          <VCol cols="12" md="4">
                            <AppTextField
                              v-model="endereco.numero"
                              label="Número"
                              placeholder="123"
                              outlined
                            />
                          </VCol>

                          <!-- Endereço - Bairro -->
                          <VCol cols="12" md="8">
                            <AppTextField
                              v-model="endereco.bairro"
                              label="Bairro"
                              placeholder="Bairro"
                              outlined
                            />
                          </VCol>

                          <!-- Endereço - Complemento -->
                          <VCol cols="12">
                            <AppTextField
                              v-model="endereco.complemento"
                              label="Complemento"
                              placeholder="Apto, Bloco, Casa, etc."
                              outlined
                            />
                          </VCol>

                          <!-- Estado -->
                          <VCol cols="12" md="6">
                            <AppSelect
                              :items="estados"
                              v-model="endereco.estado"
                              label="Estado"
                              placeholder="UF"
                              outlined
                              @update:modelValue="
                                handleEstadoChange(idx, endereco.estado)
                              "
                            />
                          </VCol>

                          <!-- Cidade -->
                          <VCol cols="12" md="6">
                            <AppSelect
                              v-if="
                                endereco.estado && endereco.cidades?.length > 0
                              "
                              :items="
                                (endereco.cidades || []).filter((c) =>
                                  !endereco?.queryCidades
                                    ? true
                                    : c.title
                                        ?.toLowerCase()
                                        ?.includes(
                                          endereco?.queryCidades?.toLowerCase()
                                        )
                                )
                              "
                              v-model="endereco.cidade"
                              label="Cidade"
                              placeholder="Cidade"
                              outlined
                              :disabled="
                                !endereco.estado ||
                                endereco.cidades?.length === 0
                              "
                              :hint="
                                !endereco.estado
                                  ? 'Selecione um estado primeiro'
                                  : endereco.cidades?.length === 0
                                  ? 'Nenhuma cidade encontrada'
                                  : ''
                              "
                              :persistent-hint="
                                !endereco.estado ||
                                endereco.cidades?.length === 0
                              "
                            >
                              <template #prepend-item>
                                <VTextField
                                  v-model="endereco.queryCidades"
                                  label="Pesquisar Cidade"
                                  placeholder="Pesquisar Cidade"
                                  outlined
                                  class="mx-2"
                                />

                                <VDivider class="my-2" />
                              </template>
                            </AppSelect>

                            <AppTextField
                              v-else
                              v-model="endereco.cidade"
                              label="Cidade"
                              placeholder="Cidade"
                              outlined
                            />
                          </VCol>

                          <VCol cols="12" class="d-flex">
                            <VBtn
                              color="error"
                              @click="
                                itensEnderecosAbertos.includes(idx)
                                  ? itensEnderecosAbertos.splice(
                                      itensEnderecosAbertos.indexOf(idx),
                                      1
                                    )
                                  : null;
                                newUserData.endereco.splice(idx, 1);
                              "
                              size="small"
                              variant="tonal"
                              class="ml-auto"
                            >
                              <VIcon icon="tabler-trash" class="mr-2" />
                              Remover Endereço
                            </VBtn>
                          </VCol>
                        </VRow>
                      </VExpansionPanelText>
                    </VExpansionPanel>
                  </VExpansionPanels>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </VCol>

          <!-- Contratos -->
          <VCol cols="12">
            <VExpansionPanels>
              <VExpansionPanel
                :bg-color="temaAtual() == 'dark' ? '#3b3f59' : '#f5f5f5'"
              >
                <VExpansionPanelTitle>
                  Contratos ({{ newUserData.contratos?.length }})
                </VExpansionPanelTitle>

                <VExpansionPanelText class="pt-4">
                  <VBtn
                    class="mb-4"
                    color="primary"
                    @click="
                      {
                        newUserData.contratos = !newUserData.contratos
                          ? []
                          : newUserData.contratos;

                        newUserData.contratos.push({
                          numero: Math.floor(Math.random() * 1000000),
                          inicioData: '',
                          periodo: null,
                          periodoType: null,
                          ativo: true,
                          valor: null,
                          obs: '',
                        });
                      }
                    "
                    size="small"
                    variant="tonal"
                    style="height: 30px"
                  >
                    + Adicionar Contrato
                  </VBtn>

                  <VExpansionPanels
                    multiple
                    v-if="newUserData.contratos?.length"
                  >
                    <VExpansionPanel
                      v-for="(contrato, index) in newUserData.contratos"
                      :key="index"
                    >
                      <VExpansionPanelTitle>
                        <p class="mb-0 text-sm">Contrato {{ index + 1 }}</p>
                      </VExpansionPanelTitle>

                      <VExpansionPanelText class="pt-4">
                        <VRow>
                          <VCol cols="12">
                            <VSwitch
                              v-model="contrato.ativo"
                              :label="
                                contrato.ativo
                                  ? 'Contrato Ativo'
                                  : 'Contrato Inativo'
                              "
                            />
                          </VCol>
                          <VCol cols="12">
                            <AppTextField
                              v-model="contrato.numero"
                              label="Número do Contrato"
                              placeholder="Número do Contrato"
                              outlined
                            />
                          </VCol>
                          <VCol cols="12">
                            <AppTextField
                              v-model="contrato.inicioData"
                              label="Data de Início"
                              placeholder="Data de Início"
                              type="date"
                            />
                          </VCol>

                          <VCol cols="12" md="6">
                            <AppTextField
                              v-model="contrato.periodo"
                              label="Período"
                              placeholder="Período"
                              outlined
                            />
                          </VCol>

                          <VCol cols="12" md="6">
                            <AppSelect
                              :items="[
                                'Mensal',
                                'Trimestral',
                                'Semestral',
                                'Anual',
                              ]"
                              v-model="contrato.periodoType"
                              label="Tipo de Período"
                              placeholder="Tipo de Período"
                              outlined
                            />
                          </VCol>

                          <VCol
                            cols="12"
                            class="py-0"
                            v-if="calcularPeriodo(contrato)"
                          >
                            Fim do Contrato: {{ calcularPeriodo(contrato) }}
                          </VCol>

                          <VCol cols="12">
                            <Dinheiro
                              v-model="contrato.valor"
                              label="Valor do Contrato"
                            />
                          </VCol>

                          <VCol cols="12">
                            <AppTextarea
                              v-model="contrato.obs"
                              label="Observações"
                              placeholder="Observações"
                              rows="2"
                              auto-grow
                              active
                            />
                          </VCol>
                        </VRow>
                      </VExpansionPanelText>
                    </VExpansionPanel>
                  </VExpansionPanels>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </VCol>
        </VRow>

        <div class="linha-flex justify-end mt-4">
          <VBtn
            variant="outlined"
            color="secondary"
            rounded="pill"
            :disabled="loadingSave"
            @click="closeDrawer"
          >
            Cancelar
          </VBtn>

          <VBtn
            color="primary"
            rounded="pill"
            :loading="loadingSave"
            @click="saveCliente"
          >
            Salvar Cliente
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
