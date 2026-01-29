// useAlert.js
import { ref } from 'vue'

const alertState = ref({
  show: false,
  message: '',
  color: 'success',
  icon: '$success',
})

export const useAlert = () => {
  const setAlert = (message, color = 'success', icon = '$success', duration = 3000) => {
    alertState.value = { show: true, message, color, icon }

    // Ocultar alerta após 'duration' milissegundos
    setTimeout(() => {
      alertState.value.show = false
    }, duration)
  }

  const resetAlert = () => {
    alertState.value.show = false
  }

  return { alert: alertState, setAlert, resetAlert }
}
