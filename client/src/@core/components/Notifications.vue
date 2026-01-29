<script setup>
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

const props = defineProps({
  notifications: {
    type: Array,
    required: true,
  },
  badgeProps: {
    type: null,
    required: false,
    default: undefined,
  },
  location: {
    type: null,
    required: false,
    default: 'bottom end',
  },
})

const emit = defineEmits([
  'read',
  'unread',
  'remove',
  'click:notification',
])

const isAllMarkRead = computed(() => props.notifications.some(item => item.visualizada === false))

const markAllReadOrUnread = () => {
  const allNotificationsIds = props.notifications.map(item => item.id_noti)
  if (!isAllMarkRead.value)
    emit('unread', allNotificationsIds)
  else
    emit('read', allNotificationsIds)
}

const totalUnseenNotifications = computed(() => {
  return props.notifications.filter(item => item.visualizada === 0 || item.visualizada === false).length
})
</script>

<template>
  <IconBtn id="notification-btn">
    <VBadge
      v-bind="props.badgeProps"
      :model-value="props.notifications.some(n => !n.visualizada)"
      color="error"
      :content="totalUnseenNotifications"
      class="notification-badge"
    >
      <VIcon
        size="28"
        icon="tabler-bell"
      />
    </VBadge>

    <VMenu
      activator="parent"
      width="380px"
      :location="props.location"
      offset="14px"
      :close-on-content-click="false"
    >
      <VCard class="d-flex flex-column">
        <!-- 👉 Header -->
        <VCardItem class="notification-section">
          <VCardTitle class="text-lg">
            Notificações
          </VCardTitle>

          <template #append>
            <IconBtn
              v-show="props.notifications.length"
              @click="markAllReadOrUnread"
            >
              <VIcon :icon="!isAllMarkRead ? 'tabler-mail' : 'tabler-mail-opened'" />

              <VTooltip
                activator="parent"
                location="start"
              >
                {{ !isAllMarkRead ? 'Marcar todas como não lidas' : 'Marcar todas como lidas' }}
              </VTooltip>
            </IconBtn>
          </template>
        </VCardItem>

        <VDivider />

        <!-- 👉 Notifications list -->
        <PerfectScrollbar
          :options="{ wheelPropagation: false }"
          style="max-block-size: 23.75rem;"
        >
          <VList class="notification-list rounded-0 py-0">
            <template
              v-for="(notification, index) in props.notifications"
              :key="notification.title"
            >
              <VDivider v-if="index > 0" />
              <VListItem
                link
                lines="one"
                min-height="66px"
                class="list-item-hover-class"
              >
                <!-- Slot: Prepend -->
                <!-- Handles Avatar: Image, Icon, Text -->
                <template #prepend>
                  <VListItemAction
                    start
                    @click="$emit('click:notification', notification)"
                  >
                    <VIcon
                      size="30"
                      icon="tabler-alert-circle"
                    />
                  </VListItemAction>
                </template>

                <VListItemTitle
                  :class="notification.visualizada ? 'font-weight-medium' : 'font-weight-black'"
                  @click="$emit('click:notification', notification)"
                >
                  {{ notification.title }}
                </VListItemTitle>
                <VListItemSubtitle
                  :class="notification.visualizada ? 'font-weight-medium' : 'font-weight-black'"
                  @click="$emit('click:notification', notification)"
                >
                  {{ notification.subtitle }}
                </VListItemSubtitle>
                <span class="text-xs text-disabled">{{ notification.time ? new
                  Date(notification.time).toLocaleDateString('pt-BR') : 'Sem Data' }}</span>

                <!-- Slot: Append -->
                <template #append>
                  <div class="d-flex flex-column align-center gap-4">
                    <IconBtn
                      size="small"
                      class="visible-in-hover"
                      @click="$emit(notification.visualizada ? 'unread' : 'read', [notification.id_noti])"
                    >
                      <VIcon
                        class="ma-2"
                        size="20"
                        :icon="notification.visualizada ? 'tabler-eye' : 'tabler-eye-off'"
                      />
                    </IconBtn>

                    <div style="block-size: 28px; inline-size: 28px;">
                      <IconBtn
                        size="small"
                        class="visible-in-hover"
                        @click="$emit('remove', notification.id_noti)"
                      >
                        <VIcon
                          size="20"
                          icon="tabler-x"
                        />
                      </IconBtn>
                    </div>
                  </div>
                </template>
              </VListItem>
            </template>

            <VListItem
              v-show="!props.notifications.length"
              class="text-center text-medium-emphasis"
              style="block-size: 56px;"
            >
              <VListItemTitle>Você não tem novas notificações!</VListItemTitle>
            </VListItem>
          </VList>
        </PerfectScrollbar>

        <VDivider />

        <!--
          👉 Footer 
          <VCardActions
          v-show="props.notifications.length"
          class="notification-footer"
          >
          <VBtn block>
          Ver todas as notificações
          </VBtn>
          </VCardActions>
        -->
      </VCard>
    </VMenu>
  </IconBtn>
</template>

<style lang="scss">
.notification-section {
  padding: 14px !important;
}

.notification-footer {
  padding: 6px !important;
}

.list-item-hover-class {
  .visible-in-hover {
    display: none;
  }

  &:hover {
    .visible-in-hover {
      display: block;
    }
  }
}

.notification-list.v-list {
  .v-list-item {
    border-radius: 0 !important;
    margin: 0 !important;

    &[tabindex="-2"]:not(.v-list-item--active) {

      &:hover,
      &:focus-visible {
        color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));

        .v-list-item-subtitle {
          color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
        }
      }
    }
  }
}

// Badge Style Override for Notification Badge
.notification-badge {
  .v-badge__badge {
    /* stylelint-disable-next-line liberty/use-logical-spec */
    min-width: 18px;
    padding: 0;
    block-size: 18px;
  }
}
</style>
