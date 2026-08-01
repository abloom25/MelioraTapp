/*
 * Meliora Tapp — Page:沉浸式歌词 + 节拍呼吸背景。
 * 数据全部来自 Myriad 宿主 Tapp.media;页面仅负责视图与动效。
 */

var melPage = (function () {
  const LYRIC_LEAD = 0.15 // 歌词高亮提前量(秒),比节拍提前量小,贴人声
  const SPECTRUM_POLL_MS = 66 // ~15fps 拉取宿主频谱(postMessage 有成本)
  const GRID_MIN_CONFIDENCE = 0.5

  const state = {
    mounted: false,
    status: null,
    trackKey: '',
    lyrics: { lines: [], verbatim: null, hasVerbatim: false, hasTranslation: false },
    beatGrid: { available: false, bpm: 0, beats: [], confidence: 0 },
    nextBeatIndex: 0,
    activeLine: -1,
    activeWord: -1,
    loadingTrack: false,
  }

  const els = {}
  const clock = melCreateAnchorClock()
  const pulse = melCreatePulseEnvelope()
  const bandEnvelopes = []
  let rafId = 0
  let lastFrameAt = 0
  let spectrumTimer = 0
  let unsubscribers = []
  let lyricsRequestId = 0

  function $(tag, className, text) {
    const el = document.createElement(tag)
    if (className) el.className = className
    if (text !== undefined) el.textContent = text
    return el
  }

  function mount(root) {
    if (state.mounted) return
    state.mounted = true

    const app = $('div', 'mel-app')
    els.bg = $('div', 'mel-bg')
    els.bgImg = $('img', 'mel-bg-img')
    els.bgImg.alt = ''
    els.bgShade = $('div', 'mel-bg-shade')
    els.bg.append(els.bgImg, els.bgShade)

    const main = $('main', 'mel-main')
    const head = $('header', 'mel-head')
    els.cover = $('img', 'mel-cover')
    els.cover.alt = ''
    els.cover.addEventListener('error', () => {
      els.cover.style.visibility = 'hidden'
    })
    const meta = $('div', 'mel-meta')
    els.title = $('h1', 'mel-title', 'Meliora')
    els.artist = $('p', 'mel-artist', '等待播放')
    meta.append(els.title, els.artist)
    head.append(els.cover, meta)

    els.progress = $('div', 'mel-progress')
    els.progressFill = $('div', 'mel-progress-fill')
    els.progress.append(els.progressFill)
    els.progress.addEventListener('click', (event) => {
      if (!state.status || !state.status.duration) return
      const rect = els.progress.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      melMedia.seek(ratio * state.status.duration).catch(() => {})
    })

    const controls = $('div', 'mel-controls')
    els.prevBtn = $('button', 'mel-btn', '⏮')
    els.playBtn = $('button', 'mel-btn mel-btn-primary', '▶')
    els.nextBtn = $('button', 'mel-btn', '⏭')
    els.prevBtn.addEventListener('click', () => melMedia.prev().catch(() => {}))
    els.nextBtn.addEventListener('click', () => melMedia.next().catch(() => {}))
    els.playBtn.addEventListener('click', () => {
      if (!state.status) return
      const action = state.status.isPlaying ? melMedia.pause() : melMedia.play()
      Promise.resolve(action).catch(() => {})
    })
    controls.append(els.prevBtn, els.playBtn, els.nextBtn)

    els.lyrics = $('div', 'mel-lyrics')
    els.lyricsState = $('div', 'mel-lyrics-state', '暂无歌词')

    els.viz = $('div', 'mel-viz')
    els.vizBars = []
    for (let i = 0; i < 8; i += 1) {
      const bar = $('i', 'mel-viz-bar')
      els.viz.append(bar)
      els.vizBars.push(bar)
      bandEnvelopes.push(melCreateLevelEnvelope(0.05, 0.22))
    }

    main.append(head, els.progress, controls, els.lyrics, els.lyricsState, els.viz)
    app.append(els.bg, main)
    root.append(app)
    els.root = app

    if (!melMedia.available()) {
      els.artist.textContent = '宿主不支持媒体控制'
      return
    }

    unsubscribers.push(melMedia.onStateChange(handleStateChange))
    unsubscribers.push(melMedia.onProgress(handleProgress))
    melMedia.getStatus().then((status) => handleStateChange(status)).catch(() => {})

    lastFrameAt = performance.now()
    rafId = requestAnimationFrame(frame)
    spectrumTimer = window.setInterval(pollSpectrum, SPECTRUM_POLL_MS)
  }

  function unmount() {
    state.mounted = false
    cancelAnimationFrame(rafId)
    window.clearInterval(spectrumTimer)
    unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe()
      } catch {
        // 忽略宿主反注册异常
      }
    })
    unsubscribers = []
  }

  function handleStateChange(status) {
    if (!status) return
    state.status = status
    els.playBtn.textContent = status.isPlaying ? '⏸' : '▶'

    const track = status.currentTrack || {}
    const key = `${track.id || ''}:${track.title || ''}:${track.artist || ''}`
    if (key !== state.trackKey) {
      state.trackKey = key
      els.title.textContent = track.title || '未知曲目'
      els.artist.textContent = track.artist || '未知艺术家'
      setCover(track.cover)
      loadLyrics()
      loadBeatGrid()
    }
  }

  function handleProgress(progress) {
    if (!progress) return
    clock.reanchor(progress.current || 0)
    if (state.status) {
      state.status.duration = progress.duration || state.status.duration
      state.status.position = progress.current
    }
    if (progress.duration > 0) {
      els.progressFill.style.width = `${Math.min(100, (progress.current / progress.duration) * 100)}%`
    }
  }

  function setCover(url) {
    if (url) {
      els.cover.style.visibility = 'visible'
      // 沙箱 img-src 仅放行宿主同源:远程封面经宿主图片代理
      els.cover.src = `/api/proxy/image?url=${encodeURIComponent(url)}`
      els.bgImg.src = els.cover.src
    } else {
      els.cover.style.visibility = 'hidden'
      els.cover.removeAttribute('src')
      els.bgImg.removeAttribute('src')
    }
  }

  async function loadLyrics() {
    const id = ++lyricsRequestId
    state.lyrics = { lines: [], verbatim: null, hasVerbatim: false, hasTranslation: false }
    state.activeLine = -1
    state.activeWord = -1
    renderLyrics()
    try {
      const result = await melMedia.getLyrics()
      if (id !== lyricsRequestId) return
      state.lyrics = {
        lines: Array.isArray(result && result.lines) ? result.lines : [],
        verbatim: result && result.hasVerbatim ? result.verbatim : null,
        hasVerbatim: Boolean(result && result.hasVerbatim),
        hasTranslation: Boolean(result && result.hasTranslation),
      }
      renderLyrics()
    } catch {
      if (id === lyricsRequestId) renderLyrics()
    }
  }

  async function loadBeatGrid() {
    state.beatGrid = { available: false, bpm: 0, beats: [], confidence: 0 }
    state.nextBeatIndex = 0
    pulse.reset()
    try {
      const grid = await melMedia.getBeatGrid()
      if (!grid || !grid.available || (grid.confidence || 0) < GRID_MIN_CONFIDENCE) return
      if (!Array.isArray(grid.beats) || !grid.beats.length) return
      state.beatGrid = grid
    } catch {
      // 无节拍网格时退回频谱能量驱动
    }
  }

  function renderLyrics() {
    els.lyrics.textContent = ''
    const { lines, verbatim, hasVerbatim } = state.lyrics
    const ready = lines.length > 0
    els.lyricsState.textContent = ready ? '' : '暂无歌词'
    if (!ready) return

    const source = hasVerbatim && verbatim ? verbatim : lines
    source.forEach((line, index) => {
      const row = $('button', 'mel-line')
      row.type = 'button'
      row.dataset.index = String(index)
      if (hasVerbatim && Array.isArray(line.words) && line.words.length) {
        line.words.forEach((word) => {
          row.append($('span', 'mel-word', word.text))
        })
      } else {
        row.append($('span', 'mel-word', line.text))
      }
      if (line.translation && state.lyrics.hasTranslation) {
        row.append($('span', 'mel-translation', line.translation))
      }
      row.addEventListener('click', () => {
        if (typeof line.time === 'number') melMedia.seek(line.time).catch(() => {})
      })
      els.lyrics.append(row)
    })
  }

  function frame(now) {
    if (!state.mounted) return
    const dt = Math.min(0.1, Math.max(0.001, (now - lastFrameAt) / 1000))
    lastFrameAt = now
    const t = clock.now()

    syncLyrics(t)
    syncBeat(t, dt)
    rafId = requestAnimationFrame(frame)
  }

  function syncLyrics(t) {
    const { lines, verbatim, hasVerbatim } = state.lyrics
    if (!lines.length) return
    const source = hasVerbatim && verbatim ? verbatim : lines
    const index = melFindActiveIndex(source, t + LYRIC_LEAD)
    if (index !== state.activeLine) {
      state.activeLine = index
      state.activeWord = -1
      const rows = els.lyrics.children
      for (let i = 0; i < rows.length; i += 1) {
        const distance = index < 0 ? 0 : Math.min(Math.abs(i - index), 5)
        rows[i].className = `mel-line d${distance}${i === index ? ' on' : ''}`
      }
      const active = index >= 0 ? rows[index] : null
      if (active && active.scrollIntoView) {
        active.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }

    // 逐字高亮:仅处理激活行
    if (hasVerbatim && index >= 0) {
      const line = source[index]
      if (line && Array.isArray(line.words)) {
        let wordIndex = -1
        for (let i = 0; i < line.words.length; i += 1) {
          if (line.words[i].time <= t + LYRIC_LEAD) wordIndex = i
          else break
        }
        if (wordIndex !== state.activeWord) {
          state.activeWord = wordIndex
          const words = els.lyrics.children[index].querySelectorAll('.mel-word')
          words.forEach((wordEl, i) => {
            wordEl.classList.toggle('on', i <= wordIndex)
          })
        }
      }
    }
  }

  function syncBeat(t, dt) {
    // 节拍网格优先:到点即触发;无网格时由频谱低频能量驱动
    if (state.beatGrid.available) {
      const beats = state.beatGrid.beats
      while (state.nextBeatIndex < beats.length && beats[state.nextBeatIndex] <= t) {
        pulse.fire(0.85)
        state.nextBeatIndex += 1
      }
    }
    const level = pulse.value(dt)
    els.root.style.setProperty('--mel-beat', level.toFixed(3))
  }

  async function pollSpectrum() {
    if (!state.mounted || !state.status || !state.status.isPlaying) return
    try {
      const data = await melMedia.getSpectrum()
      if (!data || !Array.isArray(data.bands)) return
      const now = performance.now()
      const dt = Math.min(0.2, SPECTRUM_POLL_MS / 1000)
      data.bands.slice(0, 8).forEach((target, i) => {
        const level = bandEnvelopes[i].update(target, dt)
        els.vizBars[i].style.height = `${Math.round(level * 100)}%`
      })
      // 无节拍网格时的兜底:低频能量驱动背景脉冲
      if (!state.beatGrid.available) {
        const bass = (Number(data.bands[0]) + Number(data.bands[1] || 0)) / 2
        const energy = Number(data.energy) || 0
        if (bass > 0.55 && energy > 0.3) pulse.fire(Math.min(1, bass))
      }
      void now
    } catch {
      // 频谱拉取失败静默,下一周期重试
    }
  }

  return {
    mount(root) {
      try {
        mount(root)
      } catch (error) {
        console.error('[Meliora] 页面初始化失败', error)
      }
    },
    unmount,
  }
})()

Tapp.lifecycle.onReady(function () {
  const root = document.getElementById('tapp-root')
  if (root) melPage.mount(root)
})

Tapp.lifecycle.onDestroy(function () {
  melPage.unmount()
})
