import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listenMediaQuery } from '../utils/media-query'

export type PlayerViewportMode = 'desktop' | 'mobile-sheet'

export function useDeviceDetection() {
  const compactViewport = ref(false)
  const portableDevice = ref(false)
  const phoneDevice = ref(false)

  let compactViewportQuery: MediaQueryList | undefined
  let stopCompactViewportListener: (() => void) | null = null

  const viewportMode = computed<PlayerViewportMode>(() => {
    if (phoneDevice.value || compactViewport.value) return 'mobile-sheet'
    return 'desktop'
  })
  const isMobileSheet = computed(() => viewportMode.value === 'mobile-sheet')

  function updateCompactViewport(event: MediaQueryListEvent | MediaQueryList) {
    compactViewport.value = event.matches
  }

  function updateDeviceKind() {
    const userAgent = navigator.userAgent
    const platform = navigator.platform
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const touchPoints = navigator.maxTouchPoints || 0
    const iPadDesktopMode = platform === 'MacIntel' && touchPoints > 1
    const phoneLike =
      /iPhone|iPod|Windows Phone/i.test(userAgent) ||
      /Android.*Mobile/i.test(userAgent) ||
      (coarsePointer &&
        touchPoints > 0 &&
        Math.min(window.screen.width, window.screen.height) <= 520)
    portableDevice.value =
      iPadDesktopMode ||
      /Android|iPhone|iPad|iPod|Mobile|Tablet|Windows Phone/i.test(userAgent) ||
      (coarsePointer && touchPoints > 0)
    phoneDevice.value = !iPadDesktopMode && phoneLike
  }

  onMounted(() => {
    compactViewportQuery = window.matchMedia('(max-width: 720px)')
    updateCompactViewport(compactViewportQuery)
    updateDeviceKind()
    stopCompactViewportListener = listenMediaQuery(compactViewportQuery, updateCompactViewport)
    window.addEventListener('resize', updateDeviceKind)
  })

  onBeforeUnmount(() => {
    stopCompactViewportListener?.()
    stopCompactViewportListener = null
    window.removeEventListener('resize', updateDeviceKind)
  })

  return {
    compactViewport,
    portableDevice,
    phoneDevice,
    viewportMode,
    isMobileSheet,
  }
}
