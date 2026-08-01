import { onBeforeUnmount, ref } from 'vue'
import { hostMedia, type HostBeatGrid } from '../tapp/media'

// 帧率无关的一阶指数平滑(移植自 Meliora useBeatAnalyser,AGPL-3.0)
function smoothingAlpha(dtSeconds: number, tauSeconds: number) {
  return 1 - Math.exp(-dtSeconds / tauSeconds)
}

const SPECTRUM_POLL_MS = 66 // ~15fps 拉取宿主频谱(postMessage 有成本)
const GRID_MIN_CONFIDENCE = 0.5
const BAND_COUNT = 5

// 宿主 8 频段 → 主仓五段(sub/low/mid/high/air)映射权重
const BAND_MAP: number[][] = [[0], [1, 2], [3, 4], [5, 6], [7]]

export interface HostBeatOptions {
  /** 每帧写入 --beat-level 的目标节点(背景容器) */
  getBeatTargets?: () => readonly (HTMLElement | null | undefined)[]
  /** 每帧写入 --spectrum-level-N 的目标节点(队列小频谱 meter) */
  getSpectrumTargets?: () => readonly (HTMLElement | null | undefined)[]
}

/**
 * 节拍可视化驱动:与 Meliora useBeatAnalyser 同形状输出
 * ({ beatLevel, spectrumLevels, start, stop }),数据源改为宿主
 * getBeatGrid(离线网格,优先)+ getSpectrum(实时频谱,兜底与柱图)。
 */
export function useHostBeat(options: HostBeatOptions = {}) {
  const beatLevel = ref(0)
  const spectrumLevels = ref<number[]>(Array.from({ length: BAND_COUNT }, () => 0.1))

  let beatGrid: HostBeatGrid = { available: false, beats: [], confidence: 0 }
  let nextBeatIndex = 0
  let impulse = 0
  let clockAnchorTime = 0
  let clockAnchorStamp = 0
  let rafId = 0
  let lastFrameAt = 0
  let spectrumTimer = 0
  const bandLevels = Array.from({ length: BAND_COUNT }, () => 0.08)
  let bassFloor = 0.3
  let isRunning = false
  let lastBeatCssValue = ''
  let lastBeatTarget: HTMLElement | null = null
  let lastSpectrumCssValues: string[] = []
  let lastSpectrumTarget: HTMLElement | null = null

  function writeBeatLevelToTargets(value: number) {
    const targets = options.getBeatTargets?.()
    if (!targets) return
    const primary = targets.find((el) => el && el.isConnected) ?? null
    if (!primary) {
      lastBeatCssValue = ''
      lastBeatTarget = null
      return
    }
    const next = value.toFixed(3)
    if (primary === lastBeatTarget && next === lastBeatCssValue) return
    lastBeatCssValue = next
    lastBeatTarget = primary
    for (const el of targets) {
      if (el && el.isConnected) el.style.setProperty('--beat-level', next)
    }
  }

  function writeSpectrumToTargets(levels: readonly number[]) {
    const targets = options.getSpectrumTargets?.()
    if (!targets) return
    const primary = targets.find((el) => el && el.isConnected) ?? null
    if (!primary) {
      lastSpectrumCssValues = []
      lastSpectrumTarget = null
      return
    }
    const nextValues = levels.map(
      (level) => `${(Math.max(0.08, Math.min(1, level)) * 100).toFixed(1)}%`,
    )
    if (
      primary === lastSpectrumTarget &&
      nextValues.every((value, index) => value === lastSpectrumCssValues[index])
    ) {
      return
    }
    lastSpectrumCssValues = nextValues
    lastSpectrumTarget = primary
    for (const el of targets) {
      if (!el || !el.isConnected) continue
      nextValues.forEach((value, index) => {
        el.style.setProperty(`--spectrum-level-${index}`, value)
      })
    }
  }

  function reanchorClock(timeSeconds: number) {
    clockAnchorTime = timeSeconds
    clockAnchorStamp = performance.now()
    // 进度回调可能回跳(seek/切歌):节拍网格游标重新对齐
    if (beatGrid.available && beatGrid.beats) {
      nextBeatIndex = 0
      while (nextBeatIndex < beatGrid.beats.length && beatGrid.beats[nextBeatIndex]! <= timeSeconds) {
        nextBeatIndex += 1
      }
    }
  }

  function clockNow() {
    const extrapolated = clockAnchorTime + (performance.now() - clockAnchorStamp) / 1000
    return Math.min(extrapolated, clockAnchorTime + 1)
  }

  function frame(now: number) {
    if (!isRunning) return
    const dt = Math.min(0.1, Math.max(0.001, (now - lastFrameAt) / 1000))
    lastFrameAt = now
    const t = clockNow()

    if (beatGrid.available && beatGrid.beats) {
      const beats = beatGrid.beats
      while (nextBeatIndex < beats.length && beats[nextBeatIndex]! <= t) {
        impulse = Math.max(impulse, 0.85)
        nextBeatIndex += 1
      }
    }
    impulse *= Math.exp(-dt / 0.23)
    beatLevel.value = impulse
    writeBeatLevelToTargets(impulse)

    rafId = requestAnimationFrame(frame)
  }

  async function pollSpectrum() {
    if (!isRunning) return
    try {
      const data = await hostMedia.getSpectrum()
      if (!data || !Array.isArray(data.bands)) return
      const dt = SPECTRUM_POLL_MS / 1000
      const next = spectrumLevels.value.map((_, band) => {
        const indices = BAND_MAP[band] ?? [band]
        const target = indices.reduce((sum, i) => sum + (Number(data.bands![i]) || 0), 0) / indices.length
        const previous = bandLevels[band]!
        const tau = target > previous ? 0.05 : 0.22
        const level = previous + (target - previous) * smoothingAlpha(dt, tau)
        bandLevels[band] = level
        return level
      })
      spectrumLevels.value = next
      writeSpectrumToTargets(next)

      // 无节拍网格时退回低频能量驱动脉冲
      if (!beatGrid.available) {
        const bass = Number(data.bass) || (Number(data.bands[0]) || 0)
        bassFloor += (bass - bassFloor) * smoothingAlpha(dt, 1.1)
        if (bass > bassFloor * 1.4 && bass > 0.2) {
          impulse = Math.max(impulse, Math.min(1, 0.55 + bass * 0.45))
        }
      }
    } catch {
      // 宿主频谱暂不可用时静默,下一周期重试
    }
  }

  async function loadBeatGrid() {
    beatGrid = { available: false, beats: [], confidence: 0 }
    nextBeatIndex = 0
    impulse = 0
    try {
      const grid = await hostMedia.getBeatGrid()
      if (grid?.available && (grid.confidence || 0) >= GRID_MIN_CONFIDENCE && grid.beats?.length) {
        beatGrid = grid
        reanchorClock(clockNow())
      }
    } catch {
      // 无网格时退回频谱驱动
    }
  }

  function startBeatAnalysis() {
    if (isRunning) return
    isRunning = true
    lastFrameAt = performance.now()
    rafId = requestAnimationFrame(frame)
    spectrumTimer = window.setInterval(() => void pollSpectrum(), SPECTRUM_POLL_MS)
  }

  function stopBeatAnalysis() {
    isRunning = false
    cancelAnimationFrame(rafId)
    window.clearInterval(spectrumTimer)
    beatLevel.value = 0
    writeBeatLevelToTargets(0)
    spectrumLevels.value = spectrumLevels.value.map(() => 0.08)
    writeSpectrumToTargets(spectrumLevels.value)
  }

  onBeforeUnmount(() => {
    stopBeatAnalysis()
  })

  return {
    beatLevel,
    spectrumLevels,
    startBeatAnalysis,
    stopBeatAnalysis,
    /** 进度回调时同步时钟与网格游标 */
    syncProgress: reanchorClock,
    /** 曲目切换时重新加载节拍网格 */
    reloadBeatGrid: loadBeatGrid,
  }
}
