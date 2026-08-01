import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Track } from '../types/music'

// 播放状态镜像:全部由宿主 Tapp.media 驱动(host-player.ts 写入),
// store 只做统一分发,组件消费方式与 Meliora 主仓一致
export const usePlayerStore = defineStore('player', () => {
  const tracks = ref<Track[]>([])
  const currentTrackId = ref<string | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)
  const muted = ref(false)
  const playMode = ref<'loop' | 'shuffle' | 'single' | 'sequence'>('loop')
  const errorMessage = ref('')
  // 触发歌词重载的版本号(主仓同名机制:同一曲目对象内容变化时 bump)
  const currentTrackVersion = ref(0)

  const settings = reactive({
    lyricAnimation: true,
    lyricFontSize: 20,
    lyricTranslation: true,
  })

  const currentTrack = computed(
    () => tracks.value.find((track) => track.id === currentTrackId.value) ?? null,
  )
  const currentIndex = computed(() =>
    tracks.value.findIndex((track) => track.id === currentTrackId.value),
  )

  function setQueue(queue: Track[]) {
    tracks.value = queue
  }

  function selectTrack(track: Track) {
    currentTrackId.value = track.id
    currentTrackVersion.value += 1
  }

  function setTracks(queue: Track[]) {
    tracks.value = queue
  }

  return {
    tracks,
    currentTrackId,
    currentTrack,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    playMode,
    errorMessage,
    currentTrackVersion,
    settings,
    setQueue,
    setTracks,
    selectTrack,
  }
})
