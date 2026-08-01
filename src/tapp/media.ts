/*
 * Tapp SDK 防御性封装:宿主版本较旧缺少部分 API 时降级而不是抛错。
 * 沙箱内唯一数据源,对应 Meliora 主仓的音频后端 + Meting 服务层。
 */

export interface HostTrack {
  id?: string
  songId?: string | number
  title?: string
  // 宿主部分版本用 name 而不是 title(参考 com.myriad.music-player 的兼容写法)
  name?: string
  artist?: string
  cover?: string
  album?: string
  source?: 'netease' | 'qq' | 'kugou' | string
}

// 宿主实际返回 { tracks: [...] } 包装对象,旧版本返回裸数组,两种都要兼容
export type HostPlaylistResult = HostTrack[] | { tracks?: HostTrack[] }

export interface HostStatus {
  isPlaying: boolean
  currentTrack?: HostTrack | null
  position?: number
  duration?: number
  volume?: number
  mode?: string
  muted?: boolean
}

export interface HostLyricLine {
  time: number
  text: string
  translation?: string
}

export interface HostLyricWord {
  time: number
  duration: number
  text: string
}

export interface HostLyricsResult {
  lines?: HostLyricLine[]
  verbatim?: Array<HostLyricLine & { duration: number; words?: HostLyricWord[] }>
  hasVerbatim?: boolean
  source?: string
  verbatimSource?: string
  hasTranslation?: boolean
  translationLang?: string
}

export interface HostBeatGrid {
  available: boolean
  bpm?: number
  beats?: number[]
  confidence?: number
}

export interface HostSpectrum {
  spectrum?: number[]
  bands?: number[]
  energy?: number
  bass?: number
  mid?: number
  high?: number
}

interface HostMedia {
  play(): Promise<void>
  pause(): Promise<void>
  next(): Promise<void>
  prev(): Promise<void>
  seek(seconds: number): Promise<void>
  setVolume(value: number): Promise<void>
  mute?(): Promise<void>
  unmute?(): Promise<void>
  setMode?(mode: string): Promise<void>
  playTrack?(trackId: string, trackIndex?: number): Promise<void>
  getStatus(): Promise<HostStatus>
  getPlaylist?(): Promise<HostPlaylistResult>
  getLyrics(args?: { songId?: string | number; source?: string }): Promise<HostLyricsResult>
  getBeatGrid?(): Promise<HostBeatGrid>
  getSpectrum?(): Promise<HostSpectrum>
  getSkipVip?(): Promise<{ skipVip: boolean }>
  setSkipVip?(skip: boolean): Promise<void>
  onStateChange(callback: (status: HostStatus) => void): () => void
  onProgress(callback: (progress: { current: number; duration: number; percentage: number }) => void): () => void
}

declare const Tapp:
  | {
      media?: HostMedia
      lifecycle?: {
        onReady(callback: () => void): void
        onDestroy?(callback: () => void): void
      }
      storage?: {
        get(key: string): Promise<unknown>
        set(key: string, value: unknown): Promise<void>
        remove(key: string): Promise<void>
        keys?(): Promise<string[]>
        getAll?(): Promise<Record<string, unknown>>
        clear?(): Promise<void>
      }
    }
  | undefined

function api(): HostMedia | null {
  return typeof Tapp !== 'undefined' && Tapp?.media ? Tapp.media : null
}

export function lifecycleOnReady(callback: () => void) {
  if (typeof Tapp !== 'undefined' && Tapp?.lifecycle?.onReady) {
    Tapp.lifecycle.onReady(callback)
  } else {
    // 开发环境(无宿主)直接启动
    callback()
  }
}

export function lifecycleOnDestroy(callback: () => void) {
  Tapp?.lifecycle?.onDestroy?.(callback)
}

export const hostMedia = {
  available: () => Boolean(api()?.getStatus),
  play: () => api()!.play(),
  pause: () => api()!.pause(),
  next: () => api()!.next(),
  prev: () => api()!.prev(),
  seek: (seconds: number) => api()!.seek(seconds),
  setVolume: (value: number) => api()!.setVolume(value),
  setMode: (mode: string) => (api()!.setMode ? api()!.setMode!(mode) : Promise.resolve()),
  playTrack: (trackId: string, trackIndex?: number) =>
    api()!.playTrack ? api()!.playTrack!(trackId, trackIndex) : Promise.resolve(),
  getStatus: () => api()!.getStatus(),
  hasSpectrum: () => Boolean(api()?.getSpectrum),
  mute: () => (api()!.mute ? api()!.mute!() : Promise.resolve()),
  unmute: () => (api()!.unmute ? api()!.unmute!() : Promise.resolve()),
  getPlaylist: (): Promise<HostPlaylistResult> =>
    api()!.getPlaylist ? api()!.getPlaylist!() : Promise.resolve([]),
  getLyrics: (args?: { songId?: string | number; source?: string }) => api()!.getLyrics(args),
  getBeatGrid: (): Promise<HostBeatGrid> =>
    api()!.getBeatGrid
      ? api()!.getBeatGrid!()
      : Promise.resolve({ available: false, beats: [], confidence: 0 }),
  getSpectrum: () => (api()!.getSpectrum ? api()!.getSpectrum!() : Promise.resolve(null)),
  onStateChange: (cb: (status: HostStatus) => void) => api()!.onStateChange(cb),
  onProgress: (
    cb: (progress: { current: number; duration: number; percentage: number }) => void,
  ) => api()!.onProgress(cb),
}
