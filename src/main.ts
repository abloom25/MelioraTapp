import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { lifecycleOnDestroy, lifecycleOnReady } from './tapp/media'
import { initTappStorage } from './tapp/storage'
import { PERSISTED_STORAGE_KEYS } from './stores/player'
import './styles/global.scss'

// 启动时先把 player store 的持久化 key 读入镜像再挂载

let app: ReturnType<typeof createApp> | null = null

lifecycleOnReady(() => {
  void (async () => {
    await initTappStorage(PERSISTED_STORAGE_KEYS)
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
