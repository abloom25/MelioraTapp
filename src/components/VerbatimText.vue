<script setup lang="ts">
  import { computed } from 'vue'
  import type { LyricWord } from '../types/music'

  // 逐字(卡拉OK)歌词行,Apple Music 风格:正在唱的词立即整词点亮,
  // 唱过保持亮,未唱保持暗,词与词之间跳变(不做词内渐变扫过)。
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
    const time = props.clock()
    return props.words.map((word) => ({
      text: word.text,
      // 到词起始时间即点亮(略提前 80ms,抵消人眼对音频/渲染的感知延迟)
      sung: time >= word.time - 0.08,
    }))
  })
</script>

<template>
  <span class="lyric-words">
    <span
      v-for="(word, index) in views"
      :key="index"
      class="lyric-word"
      :class="{ pending: !word.sung }"
      >{{ word.text }}</span
    >
  </span>
</template>

<style scoped lang="scss">
  .lyric-word {
    color: #fff;
    // 词边界处的明暗跳变加短过渡,避免生硬闪烁
    transition: color 0.18s ease;
  }
  .lyric-word.pending {
    color: rgba(255, 255, 255, 0.43);
  }
</style>
