import type { PublicMusicConfig } from '../types/music'

// Tapp 版:歌单与曲目完全由 Myriad 宿主提供,无站点级曲库配置。
// 保留同名导出让视图层零改动。
export const musicConfig: PublicMusicConfig = {
  siteName: 'Meliora',
  apiEndpoint: '',
  playlists: [],
  localTracks: [],
}
