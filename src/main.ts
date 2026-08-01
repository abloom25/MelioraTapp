import { createApp, type App as VueApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { lifecycleOnDestroy, lifecycleOnReady } from './tapp/media'

let app: VueApp | null = null

lifecycleOnReady(() => {
  const root = document.getElementById('tapp-root') ?? document.body
  app = createApp(App)
  app.use(createPinia())
  app.mount(root)
})

lifecycleOnDestroy(() => {
  app?.unmount()
  app = null
})
