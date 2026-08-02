<script setup lang="ts">
  import { computed } from 'vue'
  import type { LyricWord } from '../types/music'

  // 逐字(卡拉OK)歌词行,Apple Music 风格:
  // 正在唱的词整词点亮并轻微上浮,唱完落回基线保持亮,未唱保持暗。
  // 时钟以函数 prop 传入,读取发生在本组件的 computed 内,
  // 因此 60fps 的时钟更新只重渲染本行,不触发整个歌词面板重渲染。
  const props = defineProps<{
    words: LyricWord[]
    /** 同步时钟(秒),每次调用返回最新值 */
    clock: () => number
  }>()

  type WordState = 'pending' | 'current' | 'sung'

  interface WordView {
    text: string
    state: WordState
  }

  const views = computed<WordView[]>(() => {
    // 略提前 80ms,抵消人眼对音频/渲染的感知延迟
    const time = props.clock() + 0.08
    return props.words.map((word) => {
      let state: WordState = 'pending'
      if (time >= word.time + word.duration) state = 'sung'
      else if (time >= word.time) state = 'current'
      return { text: word.text, state }
    })
  })
</script>

<template>
  <span class="lyric-words">
    <span
      v-for="(word, index) in views"
      :key="index"
      class="lyric-word"
      :class="word.state"
      >{{ word.text }}</span
    >
  </span>
</template>

<style scoped lang="scss">
  .lyric-word {
    display: inline-block;
    color: #fff;
    transform: translateY(0);
    transition:
      transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
      color 0.18s ease;
  }
  .lyric-word.pending {
    color: rgba(255, 255, 255, 0.43);
  }
  // Apple Music 味道:正在唱的词轻微上浮,唱完落回
  .lyric-word.current {
    transform: translateY(-0.08em);
  }
</style>
