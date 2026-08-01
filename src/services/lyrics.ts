import { hostMedia } from '../tapp/media'
import type { LyricLine, Track } from '../types/music'

// 歌词服务:接口与主仓一致,数据改为宿主 Tapp.media.getLyrics。
// 宿主逐行数据始终提供;逐字(yrc/KRC)结构宿主已返回,后续可升级逐字模式。
export function hasTrackLyricsSource(track: Track | null): boolean {
  if (!track) return false
  if (track.kind === 'host') return true
  return track.songId !== undefined || Boolean(track.id)
}

export function hasCachedTrackLyrics(_track: Track): boolean {
  // 宿主侧歌词缓存对 Tapp 不透明,统一按未缓存处理(面板先显示加载态)
  return false
}

export async function loadTrackLyrics(track: Track, signal?: AbortSignal): Promise<LyricLine[]> {
  const isCurrentish = track.songId === undefined && !track.source
  const result = await hostMedia.getLyrics(
    isCurrentish ? undefined : { songId: track.songId, source: track.source },
  )
  if (signal?.aborted) return []
  const lines = Array.isArray(result?.lines) ? result.lines : []
  return lines
    .filter((line) => typeof line.time === 'number' && line.text?.trim())
    .map((line) => ({
      time: line.time,
      text: line.text.trim(),
      translation: line.translation?.trim() || undefined,
    }))
}

export function transferTrackLyricsProvider(_from: Track, _to: Track): void {
  // 主仓用于跨源合并歌词提供者;Tapp 版歌词统一由宿主供给,无需转移
}
