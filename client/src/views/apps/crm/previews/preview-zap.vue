<script setup>
import moment from "moment";

const props = defineProps({
  htmlContent: {
    type: String,
    required: true,
    default: "",
  },
  loading: {
    type: Boolean,
    required: true,
    default: false,
  },
  hideHeader: {
    type: Boolean,
    required: true,
    default: false,
  },
  headerData: {
    type: Object,
    required: true,
    default: {
      first_name: "",
      last_name: "",
      online: true,
    },
  },
});
</script>
<template>
  <div class="mensagem-box" :class="{ 'py-3': props.hideHeader }">
    <div class="carregando" v-if="props.loading">
      <v-progress-circular
        indeterminate
        :size="44"
        :width="5"
      ></v-progress-circular>
    </div>
    <div class="contact-header" v-if="!props.hideHeader">
      <VIcon icon="tabler-chevron-left" color="primary" />

      <div class="contact-box">
        <VAvatar color="secondary" size="40">
          <VIcon icon="tabler-user-filled" />
        </VAvatar>
        <div class="contact-info">
          <p class="mb-0 contact-name">
            {{
              props.headerData?.first_name
                ? props.headerData?.first_name +
                  " " +
                  props.headerData?.last_name
                : "Cliente"
            }}
          </p>
          <p class="mb-0 online-msg">
            {{ props.headerData?.online ? "Online" : "Offline" }}
          </p>
        </div>
      </div>
    </div>

    <div class="messages-list mt-3">
      <div class="message-item message-cliente position-relative" v-if="!props.hideHeader">
        <span class="mb-0">Olá</span>

        <span
          class="text-disabled text-caption position-absolute"
          style="right: 10px; bottom: 5px"
        >
          {{ moment().format("HH:mm") }}
        </span>
      </div>

      <div
        class="message-item message-sistema position-relative"
        style="max-width: 70% !important"
      >
        <span
          class="mb-0 html-content"
          v-html="props.htmlContent ?? '...'"
        />

        <span
          class="text-disabled text-caption position-absolute"
          style="right: 10px; bottom: 5px"
        >
          {{ moment().format("HH:mm") }}
        </span>
      </div>
    </div>
  </div>
</template>
