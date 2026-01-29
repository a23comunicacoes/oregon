<script setup>
import { can } from "@layouts/plugins/casl";

if (!can("view", "crm_chat")) {
  setAlert(
    "Você não tem permissão para acessar esta página.",
    "error",
    "tabler-alert-triangle",
    3000
  );
  router.push("/");
}

const urlApp = import.meta.env.VITE_APP_URL;
const { setAlert } = useAlert();

const userData = useCookie("userData").value;

const loading = ref(true);
const links = ref([]);
const fontes = ref([]);
const searchFonte = ref("");

const getFontes = async () => {
  const resFontes = await $api("/config/g/fonte_cliente", {
    method: "GET",
  });
  console.log("Fontess:", resFontes);

  if (!resFontes || !Array.isArray(resFontes) || resFontes.length === 0) return;

  fontes.value = resFontes
    .map((fonte) => {
      return {
        title: fonte.value,
        value: fonte.value,
      };
    })
    .filter(
      (fonte) =>
        fonte.title !== null && fonte.title !== undefined && fonte.title !== ""
    );
};

const getLinks = async () => {
  loading.value = true;

  try {
    const resLinks = await $api("/atendimento/links", {
      method: "POST",
    });

    console.log("resLinks", resLinks);

    await getFontes();

    if (!resLinks || !Array.isArray(resLinks) || resLinks.length === 0) return;

    console.log("Links:", resLinks);

    links.value = resLinks;
  } catch (error) {
    console.error("Erro ao buscar links:", error, error.response);
    links.value = [];
  } finally {
    loading.value = false;
  }
};

getLinks();

const addLink = () => {
  //Timestamp + valor aleatório
  const id = Date.now();
  const linkUuid = id + Math.random().toString(36).substring(2, 15);
  const link = "/atendimento/" + linkUuid;

  const otherContatos = links.value.filter((link) => link.contato !== null);
  let contato = null;

  if (otherContatos.length > 0) {
    contato = otherContatos[0].contato;
  }

  links.value.push({
    id: id,
    idOption: null,
    link: link,
    fonte: null,
    contato: contato,
  });
};

const copyLink = (link) => {
  navigator.clipboard.writeText(link);
  setAlert(
    "Link copiado para a área de transferência",
    "success",
    "tabler-check",
    3000
  );
};

const loadingSave = ref(false);

const saveLinks = async () => {
  for (let link of links.value) {
    if (!link.link || !link.fonte || !link.contato) {
      setAlert(
        "Preencha todos os campos para salvar o link",
        "error",
        "tabler-alert-triangle",
        3000
      );
      return;
    }
  }

  loadingSave.value = true;
  try {
    const res = await $api("/atendimento/save-links", {
      method: "POST",
      body: { links: links.value },
    });

    if (!res?.message) throw new Error("Erro ao salvar links");

    console.log("resSave", res);

    setAlert("Links salvos com sucesso", "success", "tabler-check", 3000);
    getLinks();
  } catch (error) {
    console.error("Erro ao salvar links:", error, error.response);

    setAlert(
      error?.response?._data?.message || "Erro ao salvar links",
      "error",
      "tabler-alert-triangle",
      5000
    );
  } finally {
    loadingSave.value = false;
  }
};

const deleteLink = async (id) => {
  try {
    const res = await $api(`/atendimento/delete-link/${id}`, {
      method: "DELETE",
    });

    if (!res?.message) throw new Error("Erro ao deletar link");

    setAlert("Link deletado com sucesso", "success", "tabler-check", 3000);
    getLinks();
  } catch (error) {
    console.error("Erro ao deletar link:", error, error.response);
    setAlert(
      error?.response?._data?.message || "Erro ao deletar link",
      "error",
      "tabler-alert-triangle",
      5000
    );
  }
};
</script>
<template>
  <div class="linha-flex w-100 justify-space-between mb-4">
    <div>
      <h2 class="text-h5 mb-0">Link de Atendimento</h2>
      <p class="text-sm mb-0">
        Gere links de atendimento para conseguir rastrear origens de clientes.
      </p>

      <p class="mb-0 text-caption">
        Copie o link de atendimento e utilize em suas campanhas, ao abrir esse
        link, o cliente será redirecionado para o atendimento via whatsapp e a
        origem do cliente será registrada.
      </p>
    </div>

    <div class="d-flex flex-row gap-2">
      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="addLink"
        variant="outlined"
      >
        Link
      </VBtn>

      <VBtn
        color="primary"
        prepend-icon="tabler-device-floppy"
        @click="saveLinks"
        :loading="loadingSave"
      >
        Salvar
      </VBtn>
    </div>
  </div>

  <VCard v-for="(link, index) in links" :key="index" class="mb-3">
    <VCardText class="py-4">
      <VRow>
        <VCol cols="12" md="5">
          <div class="d-flex align-center gap-2 flex-row">
            <IconBtn
              @click="copyLink(urlApp + link.link)"
              variant="tonal"
              color="primary"
            >
              <VIcon icon="tabler-copy" />
            </IconBtn>

            <VTextField
              label="Link de atendimento"
              :value="urlApp + link.link"
              placeholder="Link de atendimento"
              readonly
              active
            />
          </div>
        </VCol>

        <VCol cols="12" md="3">
          <VSelect
            v-model="link.fonte"
            :items="
              fontes
                .filter(
                  (fonte) =>
                    !searchFonte ||
                    fonte.title
                      ?.toLowerCase()
                      ?.includes(searchFonte?.toLowerCase())
                )
                .sort((a, b) => a.title?.localeCompare(b.title ?? '') ?? 0)
            "
            label="Fonte"
            placeholder="Selecione a fonte"
          >
            <template #prepend-item>
              <div
                class="px-2 mb-2"
                style="
                  position: sticky;
                  top: 0px;
                  z-index: 2;
                  background: rgb(var(--v-theme-surface));
                "
              >
                <VTextField
                  v-model="searchFonte"
                  placeholder="Pesquisar fonte"
                  prepend-inner-icon="tabler-search"
                />
              </div>
            </template>
          </VSelect>
        </VCol>

        <VCol cols="12" md="4">
          <div class="d-flex align-center gap-2 flex-row">
            <VTextField
              v-model="link.contato"
              label="Contato WhatsApp"
              placeholder="Contato WhatsApp"
              v-mask="['(##) #####-####', '(##) ####-####']"
            />

            <IconBtn @click="deleteLink(link.idOption)" variant="tonal" color="error" v-if="link.idOption">
              <VIcon icon="tabler-trash" />
            </IconBtn>
          </div>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>
