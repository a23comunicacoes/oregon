<script setup>
import { socket } from '@/composables/useSocket'

const userData = useCookie('userData')
const router = useRouter()

const notifications = ref([])

const getNotificacoes = async () => {
  const res = await $api('/noti/get-noti', {
    method: 'GET',
  })

  //console.log('Res Noti', res)
  notifications.value = res

  //console.log('Notificações: ', notifications.value)
}

getNotificacoes()

//Chamar a função para pegar as notificações a cada 5 minutos
socket.on("newNotification", data => {
  console.log('Atualizar Notificações', data)
  getNotificacoes()
})


const removeNotification = notificationId => {
  notifications.value.forEach((item, index) => {
    if (notificationId === item.id_noti) {
      const res = $api('/noti/delete-noti', {
        method: 'POST',
        body: {
          id_notificacao: notificationId,
        },
      })

      if (res) {
        notifications.value.splice(index, 1)
      }
    }
  })
}

const markRead = async notificationId => {
  notifications.value.forEach(item => {
    notificationId.forEach(id => {
      if (id === item.id_noti) {
        const res = $api('/noti/marcar-noti', {
          method: 'POST',
          body: {
            id_notificacao: id,
          },
        })

        if (res) {
          item.visualizada = true
        }
      }
    })
  })
}

const markUnRead = notificationId => {
  notifications.value.forEach(item => {
    notificationId.forEach(id => {
      if (id === item.id_noti) {
        const res = $api('/noti/desmarcar-noti', {
          method: 'POST',
          body: {
            id_notificacao: id,
          },
        })

        if (res) {
          item.visualizada = false
        }
      }
    })
  })
}

const handleNotificationClick = notification => {
  console.log('Notification Clicked', notification)

  if (!notification.visualizada) {
    markRead([notification.id_noti])
  } else {
    markUnRead([notification.id_noti])
  }

  if (notification.params !== null && notification.params !== undefined) {
    window.location.href = notification.params
  }
}
</script>

<template>
  <Notifications
    :notifications="notifications"
    @remove="removeNotification"
    @read="markRead"
    @unread="markUnRead"
    @click:notification="handleNotificationClick"
    @click="getNotificacoes"
  />
</template>
