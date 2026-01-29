<script setup>
import moment from "moment";
import { temaAtual } from "@core/stores/config";
import { useFunctions } from "@/composables/useFunctions";
import newNegocio from "@/views/apps/crm/newNegocio.vue";

const { formatValue } = useFunctions();
const router = useRouter();
const userData = useCookie("userData").value;
const emit = defineEmits(["getData"]);

const { setAlert } = useAlert();

const props = defineProps({
  cli_Id: {
    type: String,
    required: true,
    default: null,
  },
});

const negocios = ref([]);
const totalNegocios = ref(0);
const searchQuery = ref("");
const loading = ref(true);
const page = ref(1);

const getNegocios = async () => {
  loading.value = true;
  try {
    const res = await $api("/crm/list/negocios", {
      method: "GET",
      query: {
        cli_Id: props.cli_Id,
        q: searchQuery.value,
        page: page.value,
      },
    });

    if (!res) throw new Error("Error fetching negocios");

    console.log("res negocioss", res);

    negocios.value = res.negocios || [];
    totalNegocios.value = res.totalNegocios || 0;
  } catch (err) {
    console.error("Error fetching negocios", err, err.response);
  }

  loading.value = false;
};

getNegocios();

const viewNewNegocio = ref(false);
</script>

<template>
  <div class="d-flex flex-row align-center mb-4 justify-space-between">
    <div>
      <p class="mb-0 text-h5">Negócios</p>
      <p class="mb-0 text-caption">
        Gerencie os negócios das etapas de funil do cliente.
      </p>
    </div>

    <VBtn
      color="primary"
      :loading="loadingCreate"
      @click="viewNewNegocio = true"
    >
      <VIcon icon="tabler-plus" class="me-2" />
      Novo Negócio
    </VBtn>
  </div>

  <newNegocio
    :cli_Id="props.cli_Id"
    :isDrawerOpen="viewNewNegocio"
    @update:isDrawerOpen="viewNewNegocio = $event"
    @negocioSaved="emit('getData')"
  />

  <VCard rounded="xl" class="mb-4">
    <VCardText>
      <VRow>
        <VCol cols="12" class="d-flex flex-row gap-3 align-end">
          <AppTextField
            v-model="searchQuery"
            label="Buscar"
            placeholder="Buscar por nome do negócio"
            clearable
          />
        </VCol>
      </VRow>
    </VCardText>
  </VCard>

  <div v-if="negocios?.length > 0">
    <v-timeline side="end">
      <v-timeline-item
        v-for="(negocio, index) in negocios"
        :key="index"
        fill-dot
        dot-color="success"
      >
        <template v-slot:icon>
          <VIcon icon="tabler-briefcase" color="white" />
        </template>
        <VCard>
          <VCardText
            class="pa-3 d-flex flex-row justify-space-between align-center"
          >
            <div>
              <p class="mb-0 text-h6">{{ negocio.title }}</p>
              <p class="mb-2 text-caption">Etapa: {{ negocio.etapa.nome }}</p>

              <p class="mb-0 text-caption" v-if="negocio.valor">
                <VIcon icon="tabler-coin" class="mr-1" />
                {{ formatValue(negocio.valor) }}
              </p>

              <p class="mb-0 text-caption">
                <VIcon icon="tabler-calendar" class="mr-1" />
                {{ moment(negocio.created_at).format("DD/MM/YYYY") }}
              </p>
              <p class="mb-0 text-caption">
                <VIcon icon="tabler-user" class="mr-1" />
                {{ negocio.created_by }}
              </p>
            </div>

            <IconBtn
              variant="tonal"
              color="primary"
              @click="router.push(`/crm/funis/negocio/${negocio.id}`)"
            >
              <VIcon icon="tabler-eye" />
            </IconBtn>
          </VCardText>
        </VCard>
      </v-timeline-item>
    </v-timeline>

    <VPagination
      v-model="page"
      :total-visible="5"
      :length="Math.ceil(negocios.length / 10)"
    />
  </div>

  <p v-else class="text-center text-sm my-6">Nenhum negócio encontrado.</p>
</template>
