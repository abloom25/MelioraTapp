/*
 * Meliora Tapp — core:节拍包络与媒体适配层。
 * 部分逻辑移植自 Meliora(https://github.com/abloom25/Meliora,AGPL-3.0)。
 * 本文件在 Page / Headless 模式都会执行,只放与界面无关的共享逻辑。
 */

// 帧率无关的一阶指数平滑:给定时间常数 tau(秒),返回本帧应向目标逼近的比例
function melSmoothingAlpha(dtSeconds, tauSeconds) {
  return 1 - Math.exp(-dtSeconds / tauSeconds)
}

// 节拍脉冲包络:触发时抬升并按 230ms 时间常数衰减,视觉呈现"随节拍呼吸"
function melCreatePulseEnvelope() {
  let impulse = 0
  return {
    fire(strength) {
      impulse = Math.max(impulse, Math.min(1, 0.55 + strength * 0.45))
    },
    value(dtSeconds) {
      impulse *= Math.exp(-dtSeconds / 0.23)
      return impulse
    },
    reset() {
      impulse = 0
    },
  }
}

// 电平包络:快起慢落,用于频谱柱与背景能量
function melCreateLevelEnvelope(riseTau, fallTau) {
  let level = 0.08
  return {
    update(target, dtSeconds) {
      const clamped = Math.max(0.04, Math.min(1, target))
      const tau = clamped > level ? riseTau : fallTau
      level += (clamped - level) * melSmoothingAlpha(dtSeconds, tau)
      return level
    },
    reset() {
      level = 0.08
    },
  }
}

// 外推时钟:以最近一次进度回调为锚点做 rAF 外推(增量封顶 1s),
// 避免回调间隔内的歌词/节拍时间基准卡顿
function melCreateAnchorClock() {
  let anchorTime = 0
  let anchorStamp = 0
  return {
    reanchor(timeSeconds) {
      anchorTime = timeSeconds
      anchorStamp = performance.now()
    },
    now() {
      const extrapolated = anchorTime + (performance.now() - anchorStamp) / 1000
      return Math.min(extrapolated, anchorTime + 1)
    },
  }
}

// 二分查找:lines(按 time 升序)中 time <= t 的最后一项下标,无则 -1
function melFindActiveIndex(lines, t) {
  let low = 0
  let high = lines.length - 1
  let active = -1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const time = lines[middle] && typeof lines[middle].time === 'number' ? lines[middle].time : null
    if (time === null || time > t) high = middle - 1
    else {
      active = middle
      low = middle + 1
    }
  }
  return active
}

// Tapp.media 防御性封装:宿主版本较旧缺少部分 API 时降级而不是抛错
var melMedia = (function () {
  function api() {
    return typeof Tapp !== 'undefined' && Tapp.media ? Tapp.media : null
  }
  return {
    available() {
      return Boolean(api() && api().getStatus)
    },
    getStatus() {
      return api().getStatus()
    },
    getPlaylist() {
      const m = api()
      return m.getPlaylist ? m.getPlaylist() : Promise.resolve([])
    },
    play() {
      return api().play()
    },
    pause() {
      return api().pause()
    },
    next() {
      return api().next()
    },
    prev() {
      return api().prev()
    },
    seek(seconds) {
      return api().seek(seconds)
    },
    setVolume(value) {
      return api().setVolume(value)
    },
    setMode(mode) {
      const m = api()
      return m.setMode ? m.setMode(mode) : Promise.resolve()
    },
    getLyrics(args) {
      return api().getLyrics(args)
    },
    getBeatGrid() {
      const m = api()
      return m.getBeatGrid
        ? m.getBeatGrid()
        : Promise.resolve({ available: false, bpm: 0, beats: [], confidence: 0 })
    },
    getSpectrum() {
      const m = api()
      return m.getSpectrum ? m.getSpectrum() : Promise.resolve(null)
    },
    onStateChange(callback) {
      const m = api()
      return m.onStateChange ? m.onStateChange(callback) : function () {}
    },
    onProgress(callback) {
      const m = api()
      return m.onProgress ? m.onProgress(callback) : function () {}
    },
  }
})()
