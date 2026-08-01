<script setup lang="ts">
  import { computed } from 'vue'
  import type { LyricWord } from '../types/music'

  // 逐字(卡拉OK)歌词行:按同步时钟逐词扫亮。
  // 时钟以函数 prop 传入,读取发生在本组件的 computed 内,
  // 因此 60fps 的时钟更新只重渲染本行,不触发整个歌词面板重渲染。
  const props = defineProps<{
    words: LyricWord[]
    /** 同步时钟(秒),每次调用返回最新值 */
    clock: () => number
  }>()

  interface WordView {
    text: string
    /** 0-1:0 未唱,1 唱完,中间为正在唱的扫亮进度 */
    progress: number
  }

  const views = computed<WordView[]>(() => {
    const time = props.clock()
    return props.words.map((word) => ({
      text: word.text,
      progress: Math.min(1, Math.max(0, (time - word.time) / Math.max(word.duration, 0.01))),
    }))
  })
</script>

<template>
  <span class="lyric-words">
    <span
      v-for="(word, index) in views"
      :key="index"
      class="lyric-word"
      :style="{ '--word-progress': word.progress }"
      >{{ word.text }}</span
    >
  </span>
</template>

<style scoped lang="scss">
  .lyric-word {
    // 扫亮效果:已唱部分实色,未唱部分暗色,边界随 --word-progress 移动。
    // 行级距离透明度(.lyric-line 的 opacity)叠在上面,唱过的行仍会自然变暗。
    background: linear-gradient(
      90deg,
      #fff calc(var(--word-progress) * 100%),
      rgba(255, 255, 255, 0.43) calc(var(--word-progress) * 100%)
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
</style>
