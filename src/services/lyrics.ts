import { hostMedia } from '../tapp/media'
import type { LyricLine, Track } from '../types/music'

// 歌词服务:与 Meliora 主仓同名接口,数据改为宿主 Tapp.media.getLyrics。
// 宿主逐行数据始终提供;逐字(yrc/KRC)结构暂存,供后续逐字模式升级。
export function hasTrackLyricsSource(track: Track): boolean {
  if (track.kind === 'host') return true
  return track.songId !== undefined || Boolean(track.id)
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
