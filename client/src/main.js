import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'
import { createApp } from 'vue'
import FlatPickr from 'vue-flatpickr-component'
import 'flatpickr/dist/flatpickr.css'
import VueTheMask from 'vue-the-mask'
import { Money3Component } from 'v-money3'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

// Styles
import '@core/scss/template/index.scss'
import '@styles/styles.scss'

// Create vue app
const app = createApp(App)

//Register FlatPickr
app.component('FlatPickr', FlatPickr)
app.component('PerfectScrollbar', PerfectScrollbar)

// Register plugins
registerPlugins(app)

//Mask
app.use(VueTheMask)
app.component("money3", Money3Component)

// Mount vue app
app.mount('#app')
