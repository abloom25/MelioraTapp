import { onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '../stores/player'
import { hostMedia, type HostStatus } from '../tapp/media'
import { useBeatAnalyser } from './useBeatAnalyser'
import type { Track } from '../types/music'

export interface UseAudioPlayerOptions {
  /** 透传给节拍驱动的 --beat-level 写入目标 */
  getBeatTargets?: () => readonly (HTMLElement | null | undefined)[]
  /** 透传给节拍驱动的 --spectrum-level-N 写入目标 */
  getSpectrumTargets?: () => readonly (HTMLElement | null | undefined)[]
}

/**
 * 播放后端:导出面与主仓 useAudioPlayer 一致,实现全部代理到 Myriad 宿主
 * Tapp.media。store 中的播放状态由本模块单向写入(状态/进度回调),
 * 音频元素、预加载池、EQ、MediaSession 均由宿主接管。
 */
export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const store = usePlayerStore()
  const { isPlaying, currentTime } = storeToRefs(store)
  const beat = useBeatAnalyser({
    isPlaying,
    getBeatTargets: options.getBeatTargets,
    getSpectrumTargets: options.getSpectrumTargets,
  })
  const spectrumAvailable = ref(true)
  const preloadMessage = ref('')
  const unsubscribers: Array<() => void> = []
  let started = false

  function findHostTrack(host: NonNullable<HostStatus['currentTrack']>): Track | null {
    return (
      store.tracks.find(
        (track) =>
          (host.id && track.id === `host:${host.id}`) ||
          (host.songId !== undefined && track.songId === host.songId) ||
          (track.title === host.title && track.artist === host.artist),
      ) ?? null
    )
  }

  function applyStatus(status: HostStatus) {
    const wasTrackId = store.currentTrackId
    store.isPlaying = Boolean(status.isPlaying)

    const host = status.currentTrack
    if (host) {
      const matched = findHostTrack(host)
      if (matched && matched.id !== wasTrackId) {
        store.selectTrack(matched)
      }
    }
    if (store.currentTrackId !== wasTrackId) {
      void beat.reloadBeatGrid()
    }
    if (typeof status.position === 'number') store.currentTime = status.position
    if (typeof status.duration === 'number') store.duration = status.duration
  }

  function start() {
    if (started || !hostMedia.available()) return
    started = true
    spectrumAvailable.value = hostMedia.hasSpectrum()
    unsubscribers.push(hostMedia.onStateChange(applyStatus))
    unsubscribers.push(
      hostMedia.onProgress((progress) => {
        store.currentTime = progress.current
        if (progress.duration > 0) store.duration = progress.duration
      }),
    )
    void hostMedia.getStatus().then(applyStatus).catch(() => {})
  }

  // 进度时钟同步给节拍网格游标
  watch(currentTime, (time) => beat.syncProgress(time))

  // 设置面板的音量/播放模式 → 宿主;无宿主(本地开发)时跳过
  watch(
    () => store.settings.volume,
    (volume) => {
      if (!hostMedia.available()) return
      void hostMedia.setVolume(volume).catch(() => {})
    },
  )
  watch(
    () => store.settings.playMode,
    (mode) => {
      if (!hostMedia.available()) return
      const hostMode =
        mode === 'shuffle' ? 'shuffle' : mode === 'loop' ? 'repeat' : 'normal'
      void hostMedia.setMode(hostMode).catch(() => {})
    },
  )

  async function play() {
    await hostMedia.play()
  }

  async function pause() {
    await hostMedia.pause()
  }

  async function toggle() {
    if (isPlaying.value) await pause()
    else await play()
  }

  async function seek(seconds: number) {
    await hostMedia.seek(Math.max(0, seconds))
  }

  async function next() {
    await hostMedia.next()
  }

  async function previous() {
    await hostMedia.prev()
  }

  async function selectAndPlay(track: Track, _queue?: Track[]) {
    // 与官方一致:优先 jumpToIndex 移动宿主播放列表游标(playTrack 是临时播放,
    // 不同步列表状态)。索引取曲目在完整宿主歌单(store.tracks)中的位置,
    // 不能用传入队列——搜索过滤后的队列位置与宿主歌单不一致
    const index = store.tracks.indexOf(track)
    if (index >= 0 && hostMedia.hasJumpToIndex()) {
      await hostMedia.jumpToIndex(index)
      return
    }
    // 旧宿主无 jumpToIndex,或曲目不在当前歌单:退回临时播放
    const numericId = track.id.startsWith('host:') ? track.id.slice(5) : track.id
    const queueIndex = store.queue.indexOf(track)
    await hostMedia.playTrack(numericId, queueIndex >= 0 ? queueIndex : undefined)
  }

  onBeforeUnmount(() => {
    unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe()
      } catch {
        // 忽略宿主反注册异常
      }
    })
  })

  start()

  return {
    beatLevel: beat.beatLevel,
    spectrumLevels: beat.spectrumLevels,
    spectrumAvailable,
    preloadMessage,
    play,
    pause,
    toggle,
    seek,
    next,
    previous,
    selectAndPlay,
  }
}
