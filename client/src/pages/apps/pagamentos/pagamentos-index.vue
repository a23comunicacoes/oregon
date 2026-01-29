<script setup>
import Despesas from "@/pages/apps/pagamentos/despesas.vue";
import Receber from "@/pages/apps/pagamentos/receber.vue";
import Pagar from "@/pages/apps/pagamentos/pagar.vue";

const router = useRouter();
const route = useRoute();

const prodTab = ref(null);
const tabs = [
  {
    icon: "tabler-wallet",
    title: "Receber",
  },
  {
    icon: "tabler-cash",
    title: "Despesas",
  },
  /*     {
      icon: "tabler-receipt-refund",
      title: "Despesas",
    }, */
];

watch(prodTab, (val) => {
  if (val === 0) {
    router.push("/pagamentos/receber");
  } else if (val === 1) {
    router.push("/pagamentos/pagar");
  } /* else if (val === 2) {
        router.push('/pagamentos/despesas')
    }  */
});

if (
  route.name === "pagamentosReceber" ||
  route.name === "pagamentosPagar" ||
  route.name === "pagamentosDespesas"
) {
  watch(
    () => route.name,
    (val) => {
      if (val === "pagamentosReceber") {
        prodTab.value = 0;
      } else if (val === "pagamentosPagar") {
        prodTab.value = 1;
      } /* else if (val === 'pagamentosDespesas') {
            prodTab.value = 2
        } */
    }
  );
}

onMounted(() => {
  if (route.name === "pagamentosReceber") {
    prodTab.value = 0;
  } else if (route.name === "pagamentosPagar") {
    prodTab.value = 1;
  } /* else if (route.name === 'pagamentosDespesas') {
        prodTab.value = 2
    }  */
});
</script>

<template>
  <h2 class="text-h5 mb-0">Pagamentos</h2>
  <p class="text-sm">Gerencie os pagamentos e recebimentos.</p>

  <VTabs v-model="prodTab" class="v-tabs-pill">
    <VTab v-for="tab in tabs" :key="tab.icon">
      <VIcon :size="18" :icon="tab.icon" class="me-1" />
      <span>{{ tab.title }}</span>
    </VTab>
  </VTabs>

  <VWindow v-model="prodTab" class="mt-6 disable-tab-transition" :touch="false">
    <VWindowItem>
      <Receber />
    </VWindowItem>

    <VWindowItem>
      <Pagar />
    </VWindowItem>

    <!--    <VWindowItem>
            <Despesas />
        </VWindowItem> -->
  </VWindow>
</template>
