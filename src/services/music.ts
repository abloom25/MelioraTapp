import { hostMedia } from '../tapp/media'
import type { PublicMusicConfig, Track } from '../types/music'
import { musicConfig } from '../config/music'

export interface TrackLoadResult {
  tracks: Track[]
  failedSources: number
}

// Tapp 版:曲目来自 Myriad 宿主播放列表(getPlaylist),不再有站点级歌单配置。
// 接口与主仓一致,视图层零改动。
export async function loadConfiguredTracks(_config?: PublicMusicConfig): Promise<TrackLoadResult> {
  try {
    const playlist = await hostMedia.getPlaylist()
    if (Array.isArray(playlist)) {
      return { tracks: playlist.map((track, index) => mapPlaylistTrack(track, index)), failedSources: 0 }
    }
  } catch {
    // 宿主暂不支持播放列表:仅跟随当前曲目
  }
  return { tracks: [], failedSources: 0 }
}

function mapPlaylistTrack(
  track: { id?: string; songId?: string | number; title?: string; artist?: string; cover?: string; album?: string; source?: string },
  index: number,
): Track {
  return {
    id: `host:${track.id ?? track.songId ?? index}`,
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

export function loadMusicConfig(): PublicMusicConfig {
  return musicConfig
}
