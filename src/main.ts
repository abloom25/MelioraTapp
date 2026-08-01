import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { lifecycleOnDestroy, lifecycleOnReady } from './tapp/media'
import { initTappStorage } from './tapp/storage'
import './styles/global.scss'

// 与 stores/player.ts 的持久化 key 保持一致,启动时先读入镜像再挂载
const PERSISTED_KEYS = ['meliora:settings', 'meliora:last-track'] as const

let app: ReturnType<typeof createApp> | null = null

lifecycleOnReady(() => {
  void (async () => {
    await initTappStorage(PERSISTED_KEYS)
    app = createApp(App)
    app.config.errorHandler = (error, _instance, info) => {
      console.error('[全局错误]', info, error)
    }
    app.use(createPinia())
    app.use(router)
    app.mount('#app')
  })()
})

lifecycleOnDestroy(() => {
  app?.unmount()
  app = null
})
