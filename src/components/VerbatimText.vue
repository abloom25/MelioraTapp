<script setup lang="ts">
  import { computed } from 'vue'
  import type { LyricWord } from '../types/music'

  // 逐字(卡拉OK)歌词行,Apple Music 风格:
  // 唱过的词整词点亮并缓慢上浮、保持浮起;未唱的词停在基线保持暗。
  // 时钟以函数 prop 传入,读取发生在本组件的 computed 内,
  // 因此 60fps 的时钟更新只重渲染本行,不触发整个歌词面板重渲染。
  const props = defineProps<{
    words: LyricWord[]
    /** 同步时钟(秒),每次调用返回最新值 */
    clock: () => number
  }>()

  interface WordView {
    text: string
    sung: boolean
  }

  const views = computed<WordView[]>(() => {
    // 略提前 80ms,抵消人眼对音频/渲染的感知延迟
    const time = props.clock() + 0.08
    return props.words.map((word) => ({
      text: word.text,
      sung: time >= word.time,
    }))
  })
</script>

<template>
  <span class="lyric-words">
    <span
      v-for="(word, index) in views"
      :key="index"
      class="lyric-word"
      :class="{ sung: word.sung }"
      >{{ word.text }}</span
    >
  </span>
</template>

<style scoped lang="scss">
  .lyric-word {
    display: inline-block;
    color: rgba(255, 255, 255, 0.43);
    transform: translateY(0);
    // 缓慢上浮 + 缓慢点亮,词到点后柔和地浮起来
    transition:
      transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
      color 0.3s ease;
  }
  // 唱过的词:点亮 + 上浮并保持
  .lyric-word.sung {
    color: #fff;
    transform: translateY(-0.08em);
  }
</style>
