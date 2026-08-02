export type MusicServer = 'netease' | 'tencent'
export type PlayMode = 'sequence' | 'loop' | 'single' | 'shuffle'
export type LyricAvailability = 'available' | 'loading' | 'unavailable'
export type LyricStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export type EqPresetId = 'flat' | 'pop' | 'rock' | 'jazz' | 'vocal' | 'bass-boost' | 'custom'

export interface MetingPlaylistConfig {
  server: MusicServer
  playlistId: string
  enabled?: boolean
}

export interface LocalTrackConfig {
  id: string
  title: string
  artist: string
  audio: string
  album?: string
  cover?: string
  lyrics?: string
}

export interface PublicMusicConfig {
  siteName: string
  siteIcon?: string
  apiEndpoint: string
  playlists: MetingPlaylistConfig[]
  localTracks: LocalTrackConfig[]
}

export interface MusicConfig extends PublicMusicConfig {
  apiToken?: string
  githubProxy?: string
  receivePrereleaseUpdates?: boolean
}

export interface LyricWord {
  /** 绝对秒 */
  time: number
  /** 秒 */
  duration: number
  text: string
}

export interface LyricLine {
  time: number | null
  text: string
  translation?: string
  /** 行时长(秒),逐字歌词提供 */
  duration?: number
  /** 逐字(卡拉OK)词序列,word.time 为绝对秒;存在时按逐字模式渲染 */
  words?: LyricWord[]
}

export interface Track {
  id: string
  title: string
  titleVersions?: string[]
  artist: string
  album?: string
  cover?: string
  audioUrl: string
  kind: 'meting' | 'remote' | 'local' | 'host'
  /** Myriad 宿主曲目的取词参数(getLyrics 的 songId/source) */
  songId?: string | number
  source?: string
}

export interface MetingTrack {
  title?: string
  author?: string
  pic?: string
  url?: string
  lrc?: string
}

export interface LyricsSnapshot {
  lines: LyricLine[]
  activeIndex: number
  status: LyricStatus
  /** 快节奏歌词下的动画压缩系数(1 = 完整节奏,0 = 瞬切),缺省按 1 处理 */
  tempoScale?: number
}

export interface EqualizerSettings {
  enabled: boolean
  preset: EqPresetId
  bands: number[]
}

export interface PlayerSettings {
  volume: number
  playMode: PlayMode
  dynamicBackground: boolean
  backgroundBlur: number
  backgroundSaturation: number
  beatBrightness: number
  lyricFontSize: number
  lyricAnimation: boolean
  lyricTranslation: boolean
  progressLyricPreview: boolean
  autoHideChrome: boolean
  equalizer: EqualizerSettings
  settingsVersion: number
}
