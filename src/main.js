import { createApp } from "vue"
import { createPinia } from "pinia"
import router from "./router"
import App from "./App.vue"
import Icon from "./components/Icon.vue"
import IconButton from "./components/IconButton.vue"

const app = createApp(App)
app.component("Icon", Icon)
app.component("IconButton", IconButton)
app.use(createPinia())
app.use(router)
app.mount("#app")
