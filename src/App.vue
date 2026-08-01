<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import LyricsPanel from './components/LyricsPanel.vue'
  import { usePlayerStore } from './stores/player'
  import { useTappPlayer } from './services/host-player'
  import { useHostBeat } from './composables/useHostBeat'

  const store = usePlayerStore()
  const { currentTrack, isPlaying, currentTime, duration, playMode } = storeToRefs(store)
  const player = useTappPlayer()

  // --beat-level 由 useHostBeat 直接 setProperty 到背景节点(与主仓同模式)
  const backgroundRef = ref<HTMLElement>()
  const beat = useHostBeat({ getBeatTargets: () => [backgroundRef.value] })
  beat.startBeatAnalysis()

  // 进度时钟同步给节拍网格游标;切歌时重载网格
  watch(currentTime, (time) => beat.syncProgress(time))
  watch(
    () => store.currentTrackId,
    () => void beat.reloadBeatGrid(),
  )

  const coverUrl = computed(() => {
    const cover = currentTrack.value?.cover
    // 沙箱 img-src 仅放行宿主同源:远程封面经宿主图片代理
    return cover ? `/api/proxy/image?url=${encodeURIComponent(cover)}` : ''
  })

  const progressPercent = computed(() =>
    duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0,
  )

  const bgImageStyle = computed(() => ({
    backgroundImage: coverUrl.value ? `url('${coverUrl.value}')` : 'none',
  }))

  const modeLabel = computed(
    () =>
      ({
        loop: '循环',
        shuffle: '随机',
        sequence: '顺序',
        single: '单曲',
      })[playMode.value] ?? '循环',
  )

  function seekByEvent(event: MouseEvent) {
    if (duration.value <= 0) return
    const track = event.currentTarget as HTMLElement
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    void player.seek(ratio * duration.value)
  }
</script>

<template>
  <div class="mel-app">
    <div ref="backgroundRef" class="mel-bg">
      <div class="mel-bg-img" :style="bgImageStyle" />
      <div class="mel-bg-shade" />
    </div>

    <main class="mel-main">
      <header class="mel-head">
        <img v-if="coverUrl" class="mel-cover" :src="coverUrl" alt="" />
        <div v-else class="mel-cover mel-cover-empty">♪</div>
        <div class="mel-meta">
          <h1 class="mel-title">{{ currentTrack?.title || 'Meliora' }}</h1>
          <p class="mel-artist">{{ currentTrack?.artist || '等待播放' }}</p>
        </div>
        <button class="mel-mode" type="button" @click="player.cyclePlayMode">{{ modeLabel }}</button>
      </header>

      <div class="mel-progress" role="slider" aria-label="播放进度" @click="seekByEvent">
        <div class="mel-progress-fill" :style="{ width: `${progressPercent}%` }" />
      </div>

      <div class="mel-controls">
        <button class="mel-btn" type="button" aria-label="上一首" @click="player.previous">⏮</button>
        <button
          class="mel-btn mel-btn-primary"
          type="button"
          :aria-label="isPlaying ? '暂停' : '播放'"
          @click="player.toggle"
        >
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <button class="mel-btn" type="button" aria-label="下一首" @click="player.next">⏭</button>
      </div>

      <LyricsPanel class="mel-lyrics" @seek="(time: number) => player.seek(time)" />

      <div class="mel-viz" aria-hidden="true">
        <i
          v-for="(level, band) in beat.spectrumLevels"
          :key="band"
          :style="{ height: `${Math.max(8, Math.min(100, level * 100))}%` }"
        />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
  .mel-app {
    --beat-level: 0;

    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: #0a0a0a;
    color: #fff;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  }

  .mel-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .mel-bg-img {
    position: absolute;
    inset: -8%;
    background-position: center;
    background-size: cover;
    filter: blur(48px) saturate(1.2) brightness(calc(0.82 + var(--beat-level) * 0.18));
    opacity: calc(0.55 + var(--beat-level) * 0.2);
    transform: scale(calc(1.04 + var(--beat-level) * 0.015));
  }

  .mel-bg-shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(10, 10, 12, 0.35), rgba(10, 10, 12, 0.88));
  }

  .mel-main {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 720px;
    height: 100vh;
    margin: 0 auto;
    padding: 64px 20px 20px;
    box-sizing: border-box;
  }

  .mel-head {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .mel-cover {
    display: grid;
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    color: rgba(255, 255, 255, 0.5);
    font-size: 22px;
    object-fit: cover;
    place-items: center;
  }

  .mel-meta {
    min-width: 0;
    flex: 1;
  }

  .mel-title {
    margin: 0;
    overflow: hidden;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.01em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mel-artist {
    margin: 4px 0 0;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.56);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mel-mode {
    flex-shrink: 0;
    padding: 6px 12px;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.75);
    font-size: 12px;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.16);
    }
  }

  .mel-progress {
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    cursor: pointer;
  }

  .mel-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: #fff;
    transition: width 200ms linear;
  }

  .mel-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
  }

  .mel-btn {
    display: grid;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    place-items: center;
    transition: background 150ms ease;

    &:hover {
      background: rgba(255, 255, 255, 0.16);
    }
  }

  .mel-btn-primary {
    width: 54px;
    height: 54px;
    background: #fff;
    color: #151318;
    font-size: 18px;

    &:hover {
      background: rgba(255, 255, 255, 0.85);
    }
  }

  .mel-lyrics {
    flex: 1;
    min-height: 0;
  }

  .mel-viz {
    display: flex;
    height: 22px;
    flex-shrink: 0;
    align-items: flex-end;
    justify-content: center;
    gap: 4px;

    i {
      width: 3px;
      height: 12%;
      min-height: 2px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.85);
      opacity: 0.85;
      transition: height 80ms linear;
    }
  }
</style>
