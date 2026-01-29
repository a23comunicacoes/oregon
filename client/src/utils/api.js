import { ofetch } from 'ofetch'
import { useAlert } from '@/composables/useAlert'

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export const $api = ofetch.create({
  baseURL: baseUrl,

  async onRequest({ options }) {
    const accessToken = useCookie('accessToken').value
    if (accessToken) {
      options.headers = { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` }
    }
  },

  async onResponse({ response, request, options }) {
    // Side-effects opcionais de sucesso (ex: refresh de algum header)
  },

  async onResponseError({ request, options, response, error }) {
    const { setAlert } = useAlert();

    if (response?.status === 401) {
      useCookie('accessToken').value = null
      useCookie('userData').value = null
      useCookie('userAbilityRules').value = null

      setAlert('Sua sessão expirou. Por favor, faça login novamente.', 'error', 'tabler-alert-triangle', 3000)
      setTimeout(() => {
        window.location.href = '/login'
      }, 3000)
    }

    console.error('API Error:', { request, options, response, error })

    // 🔴 Importante: re-lançar para o caller tratar
    throw { response: response } || error || new Error('Request failed')
  },
})
