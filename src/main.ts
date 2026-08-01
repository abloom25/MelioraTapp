import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { lifecycleOnDestroy, lifecycleOnReady } from './tapp/media'
import './styles/global.scss'

let app: ReturnType<typeof createApp> | null = null

lifecycleOnReady(() => {
  app = createApp(App)
  app.config.errorHandler = (error, _instance, info) => {
    console.error('[全局错误]', info, error)
  }
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
})

lifecycleOnDestroy(() => {
  app?.unmount()
  app = null
})
