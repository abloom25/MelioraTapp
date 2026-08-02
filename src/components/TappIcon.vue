<script lang="ts">
  export type TappIconName =
    | 'play'
    | 'pause'
    | 'previous'
    | 'next'
    | 'sequence'
    | 'loop'
    | 'single'
    | 'shuffle'
    | 'playlist'
    | 'lyrics'
    | 'music-note'
    | 'settings'
    | 'vip'
    | 'download'
    | 'fork'
    | 'tune'
    | 'refresh'
    | 'search'
    | 'close'
    | 'home'
</script>

<script setup lang="ts">
  // Material 实心图标(google/material-design-icons 原样 path)。
  // 播放控制类与官方 com.myriad.music-player 一致,UI 类同风格补齐,
  // 全应用统一一套视觉语言。
  const PATHS: Record<Exclude<TappIconName, 'single'>, string> = {
    play: 'M8 5v14l11-7z',
    pause: 'M6 4h4v16H6V4zm8 0h4v16h-4V4z',
    previous: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
    next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
    sequence: 'M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z',
    loop: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
    shuffle:
      'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
    // 与官方 music-player 播放列表 tab 同款
    playlist: 'M4 10h12v2H4zm0-4h12v2H4zm0 8h8v2H4zm10 0v6l5-3z',
    lyrics: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
    'music-note': 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    settings:
      'M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z',
    download: 'M5,20h14v-2H5V20z M19,9h-4V3H9v6H5l7,7L19,9z',
    fork: 'M17 16l-4-4V8.82C14.16 8.4 15 7.3 15 6c0-1.66-1.34-3-3-3S9 4.34 9 6c0 1.3.84 2.4 2 2.82V12l-4 4H3v5h5v-3.05l4-4.2 4 4.2V21h5v-5h-4z',
    tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
    refresh:
      'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    search:
      'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    // 皇冠,与官方 music-player 的 skip-vip 按钮同款
    vip: 'M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5zm0 2h14v2H5v-2z',
  }

  withDefaults(defineProps<{ name: TappIconName; size?: number | string }>(), { size: 24 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <!-- single(单曲循环)= loop 图标 + “1” 文本,与官方 getModeIcon 一致 -->
    <path :d="PATHS[name === 'single' ? 'loop' : name]" />
    <text
      v-if="name === 'single'"
      x="12"
      y="14.5"
      font-size="7"
      text-anchor="middle"
      font-weight="bold"
      >1</text
    >
  </svg>
</template>
