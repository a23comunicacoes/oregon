// confirm.js
//import ConfirmDialog from '@/components/AppConfirm.vue'

// confirm.js
import { createApp } from 'vue'
import vuetify from '@/plugins/vuetify'
import ConfirmDialog from '@/components/AppConfirm.vue'

export function useConfirm(options) {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const app = createApp(ConfirmDialog, {
      ...options,
      onConfirm: () => { resolve(true); app.unmount(); container.remove() },
      onCancel: () => { resolve(false); app.unmount(); container.remove() },
    })

    app.use(vuetify)        // << injeta o Vuetify
    app.mount(container)    // << monta dentro do contexto do Vuetify
  })
}
