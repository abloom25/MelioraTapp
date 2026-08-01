import { hostMedia } from '../tapp/media'
import type { LyricLine, Track } from '../types/music'

// 歌词服务:接口与主仓一致,数据改为宿主 Tapp.media.getLyrics。
// 逐字(网易 yrc/酷狗 KRC)优先,宿主未命中逐字时回退逐行 LRC。
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
  // 逐字(网易 yrc/酷狗 KRC)优先;宿主契约:verbatim 为空时消费方回退 lines 逐行高亮
  const verbatim = Array.isArray(result?.verbatim) ? result.verbatim : []
  if (verbatim.length) {
    return verbatim
      .filter((line) => typeof line.time === 'number' && line.text?.trim())
      .map((line) => ({
        time: line.time,
        duration: typeof line.duration === 'number' ? line.duration : undefined,
        text: line.text.trim(),
        translation: line.translation?.trim() || undefined,
        words: Array.isArray(line.words)
          ? line.words
              .filter(
                (word) =>
                  typeof word.time === 'number' &&
                  typeof word.duration === 'number' &&
                  word.text?.trim(),
              )
              .map((word) => ({ time: word.time, duration: word.duration, text: word.text }))
          : undefined,
      }))
  }
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
