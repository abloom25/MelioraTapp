/*
 * Tapp.storage 适配层:宿主的异步键值存储镜像为同步读缓存。
 * - 启动时(initTappStorage)把关心的 key 一次性读入内存镜像
 * - 写操作同步落镜像,再异步上行到宿主(失败静默,镜像仍保持会话内一致)
 * - 访客没有 Runtime Grant 时宿主存储不可用,自动退化为会话内存,
 *   行为与主仓 localStorage 被禁时一致
 */

const mirror = new Map<string, string>()

interface TappStorageApi {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

function api(): TappStorageApi | null {
  // media.ts 的 declare 是模块作用域,这里统一从 globalThis 取
  const host = (globalThis as { Tapp?: { storage?: TappStorageApi } }).Tapp
  return host?.storage ?? null
}

/** 是否在 Tapp 宿主内(有 storage 通道);无宿主时走 localStorage 兜底 */
export function hasTappStorage(): boolean {
  return Boolean(api()?.get)
}

/** 启动时把指定 key 读入镜像;必须在 store 初始化前 await */
export async function initTappStorage(keys: readonly string[]): Promise<void> {
  const storage = api()
  if (!storage) return
  await Promise.all(
    keys.map(async (key) => {
      try {
        const value = await storage.get(key)
        if (value === null || value === undefined) return
        mirror.set(key, typeof value === 'string' ? value : JSON.stringify(value))
      } catch {
        // 单项读取失败忽略(权限/网络),保持镜像中无该键
      }
    }),
  )
}

export function tappStorageGet(key: string): string | null {
  return mirror.get(key) ?? null
}

export function tappStorageSet(key: string, value: string): void {
  mirror.set(key, value)
  const storage = api()
  if (!storage) return
  void storage.set(key, value).catch(() => {
    // 上行失败(访客无 grant/配额满):镜像已更新,会话内行为不受影响
  })
}

export function tappStorageRemove(key: string): void {
  mirror.delete(key)
  const storage = api()
  if (!storage) return
  void storage.remove(key).catch(() => {})
}
