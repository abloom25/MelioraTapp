import { storeToRefs } from 'pinia'
import { onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player'
import { hostMedia, type HostStatus, type HostTrack } from '../tapp/media'
import type { Track } from '../types/music'

// 宿主曲目 → 主仓 Track 结构(audioUrl 由宿主接管,占位即可)
function mapHostTrack(track: HostTrack, index: number): Track {
  const id = `host:${track.id ?? track.songId ?? index}`
  return {
    id,
    title: track.title?.trim() || '未知曲目',
    artist: track.artist?.trim() || '未知艺术家',
    album: track.album?.trim() || undefined,
    cover: track.cover?.trim() || undefined,
    audioUrl: '',
    kind: 'host',
    songId: track.songId,
    source: track.source,
  }
}

export interface TappPlayerOptions {
  getBeatTargets?: () => readonly (HTMLElement | null | undefined)[]
  getSpectrumTargets?: () => readonly (HTMLElement | null | undefined)[]
}

/**
 * 播放后端:接口对齐 Meliora 主仓 useAudioPlayer 的消费面,
 * 实现全部代理到宿主 Tapp.media。store 中的播放状态由本模块单向写入。
 */
export function useTappPlayer(_options: TappPlayerOptions = {}) {
  const store = usePlayerStore()
  const { isPlaying, currentTrackId } = storeToRefs(store)
  const unsubscribers: Array<() => void> = []
  let started = false

  function applyStatus(status: HostStatus) {
    store.isPlaying = Boolean(status.isPlaying)
    if (typeof status.volume === 'number') store.volume = status.volume
    if (status.muted !== undefined) store.muted = status.muted

    const track = status.currentTrack
    if (track) {
      const matched = store.tracks.find(
        (item) =>
          (track.id && item.id === `host:${track.id}`) ||
          (track.songId !== undefined && item.songId === track.songId) ||
          (item.title === track.title && item.artist === track.artist),
      )
      if (matched && matched.id !== currentTrackId.value) {
        store.selectTrack(matched)
      } else if (!matched && track.title) {
        const mapped = mapHostTrack(track, store.tracks.length)
        store.tracks.push(mapped)
        store.selectTrack(mapped)
      }
    }
    if (typeof status.position === 'number') store.currentTime = status.position
    if (typeof status.duration === 'number') store.duration = status.duration
  }

  async function refreshPlaylist() {
    try {
      const playlist = await hostMedia.getPlaylist()
      if (Array.isArray(playlist) && playlist.length) {
        store.setQueue(playlist.map(mapHostTrack))
      }
    } catch {
      // 宿主暂不支持播放列表时仅跟随当前曲目
    }
  }

  function start() {
    if (started || !hostMedia.available()) return
    started = true
    unsubscribers.push(hostMedia.onStateChange(applyStatus))
    unsubscribers.push(
      hostMedia.onProgress((progress) => {
        store.currentTime = progress.current
        if (progress.duration > 0) store.duration = progress.duration
      }),
    )
    void refreshPlaylist()
    void hostMedia.getStatus().then(applyStatus).catch(() => {})
  }

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

  async function selectAndPlay(track: Track) {
    const numericId = track.id.startsWith('host:') ? track.id.slice(5) : track.id
    await hostMedia.playTrack(numericId, store.currentIndex >= 0 ? store.currentIndex : undefined)
  }

  function cyclePlayMode() {
    const order: Array<{ ours: typeof store.playMode; host: string }> = [
      { ours: 'loop', host: 'repeat' },
      { ours: 'shuffle', host: 'shuffle' },
      { ours: 'sequence', host: 'normal' },
    ]
    const current = order.findIndex((item) => item.ours === store.playMode)
    const nextMode = order[(current + 1) % order.length]!
    store.playMode = nextMode.ours
    void hostMedia.setMode(nextMode.host).catch(() => {})
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
    play,
    pause,
    toggle,
    seek,
    next,
    previous,
    selectAndPlay,
    cyclePlayMode,
  }
}
