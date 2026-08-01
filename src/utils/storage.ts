// 安全的存储包装:Tapp 宿主内走 Tapp.storage 内存镜像(见 tapp/storage.ts),
// 否则回退 localStorage;所有读写均 try/catch,避免 Safari Private 模式 /
// quota 满 / SSR / 沙箱禁用存储等场景下抛异常
import { hasTappStorage, tappStorageGet, tappStorageRemove, tappStorageSet } from '../tapp/storage'

function getStorage(): Storage | null {
  // 先用 typeof 判断，兼容 SSR 与 jsdom 等无 window 的边界场景
  if (typeof window === 'undefined') return null
  try {
    // 某些浏览器在禁用存储时访问 localStorage 属性本身就会抛异常
    return window.localStorage ?? null
  } catch {
    return null
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (hasTappStorage()) return tappStorageGet(key)
    const storage = getStorage()
    if (!storage) return null
    try {
      return storage.getItem(key)
    } catch {
      // Safari Private 模式或权限受限时静默失败，避免影响调用方初始化
      return null
    }
  },
  setItem(key: string, value: string): void {
    if (hasTappStorage()) {
      tappStorageSet(key, value)
      return
    }
    const storage = getStorage()
    if (!storage) return
    try {
      storage.setItem(key, value)
    } catch {
      // quota 已满或被禁用时静默忽略，保持调用方流程不被中断
    }
  },
  removeItem(key: string): void {
    if (hasTappStorage()) {
      tappStorageRemove(key)
      return
    }
    const storage = getStorage()
    if (!storage) return
    try {
      storage.removeItem(key)
    } catch {
      // 任何异常都静默处理，确保 store 操作不会因存储失败而崩溃
    }
  },
}
