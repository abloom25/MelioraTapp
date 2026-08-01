import { createRouter, createMemoryHistory } from 'vue-router'
import PlayerView from '../views/PlayerView.vue'

// 沙箱(srcdoc iframe)没有可导航 URL,用内存路由;Tapp 版只有播放器页
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', name: 'player', component: PlayerView }],
})

export default router
