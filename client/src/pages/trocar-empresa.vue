<script setup>
import { useAlert } from '@/composables/useAlert'
const route = useRoute();
const router = useRouter();
const { setAlert } = useAlert()

//Pegar a query next
const next = route.query.next;

//Recarregar a rota
setAlert('Empresa alterada com sucesso!', 'success', 'tabler-switch-2', 3000)

if (!next) {
    router.push('/');
}
else {
    router.push(next);
}

</script>
<template>
    <v-progress-circular color="primary" indeterminate
        style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" :size="60"
        :width="5"></v-progress-circular>
</template>