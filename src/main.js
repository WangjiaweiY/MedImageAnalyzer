import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 已通过CDN在index.html中引入fabric.js，不需要在这里导入
import fabric from 'fabric'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app') 