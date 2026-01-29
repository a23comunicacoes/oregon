<script setup>
  import ModelosEmails from "@/pages/apps/crm/modelos-emails.vue";
  import ModelosMensagens from "@/pages/apps/crm/modelos-mensagens.vue";

  import { can } from "@layouts/plugins/casl";

  if (!can("view", "crm_modelos_mensagens")) {
    setAlert(
      "Você não tem permissão para acessar esta página.",
      "error",
      "tabler-alert-triangle",
      3000
    );
    router.push("/");
  }

  const tab = ref(0);
  const tabs = [
    {
      icon: "tabler-brand-whatsapp",
      title: "Mensagens",
    },
    {
      icon: "tabler-mail",
      title: "Emails",
    },
  ];
</script>
<template>
  <VTabs v-model="tab" class="v-tabs-pill">
    <VTab v-for="tab in tabs" :key="tab.icon">
      <VIcon :size="18" :icon="tab.icon" class="me-1" />
      <span>{{ tab.title }}</span>
    </VTab>
  </VTabs>

  <VWindow v-model="tab" class="mt-6 disable-tab-transition" :touch="false">
    <VWindowItem>
      <ModelosMensagens />
    </VWindowItem>
    <VWindowItem>
      <ModelosEmails />
    </VWindowItem>
  </VWindow>
</template>
