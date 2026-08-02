// 浏览器能力检测工具:集中管理 Safari 等浏览器的兼容性差异。
// 优先使用能力检测(feature detection),仅在无法用能力检测区分时才回退到 UA 嗅探。

export function supportsWebAnimations(): boolean {
  return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function'
}

// iOS Safari 检测:iPadOS 13+ 默认请求桌面 UA,需要结合 platform + maxTouchPoints 判断
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const platform = navigator.platform
  const touchPoints = navigator.maxTouchPoints || 0
  // iPhone / iPod / 旧 iPad 直接通过 UA 判断
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  // iPadOS 13+ 桌面 UA:platform 仍是 MacIntel 但有多点触控
  if (platform === 'MacIntel' && touchPoints > 1) return true
  return false
}

// iOS Safari 的 PWA 安装:不支持 beforeinstallprompt,需要引导用户手动"添加到主屏幕"
export function canShowIosInstallGuide(): boolean {
  if (!isIOSDevice()) return false
  // 已独立运行(已添加到主屏幕)则不需要再引导
  const nav = navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return false
  // display-mode: standalone 表示已在 PWA 模式运行
  if (window.matchMedia('(display-mode: standalone)').matches) return false
  return true
}
