import type { Track } from '../types/music'

// 使用 toLowerCase 而非 toLocaleLowerCase:搜索归一化需要在各 locale 下稳定一致,
// 土耳其语等 locale 下 'I' 会变为 'ı',导致同一曲目搜索结果不同。
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

type TrackSearchInput = Pick<Track, 'title' | 'artist' | 'titleVersions'>

const searchTextCache = new WeakMap<TrackSearchInput, { signature: string; text: string }>()

function searchSignature(track: TrackSearchInput): string {
  return [track.title, track.artist, ...(track.titleVersions ?? [])].join('\u0000')
}

export function createTrackSearchText(track: TrackSearchInput): string {
  const signature = searchSignature(track)
  const cached = searchTextCache.get(track)
  if (cached?.signature === signature) return cached.text
  const text = [track.title, track.artist, ...(track.titleVersions ?? [])]
    .map(normalize)
    .filter(Boolean)
    .join('\u0000')
  searchTextCache.set(track, { signature, text })
  return text
}

export function filterTracks(tracks: Track[], query: string): Track[] {
  const keyword = normalize(query)
  if (!keyword) return tracks
  return tracks.filter((track) => createTrackSearchText(track).includes(keyword))
}
