/**
 * HTTP helper — uses Capacitor native HTTP on Android (bypasses CORS),
 * falls back to regular fetch in browser.
 */

export function isNative() {
  return typeof window !== 'undefined' &&
    window.Capacitor !== undefined &&
    window.Capacitor.isNativePlatform()
}

export async function nativeFetch(url, options = {}) {
  if (isNative()) {
    try {
      const { CapacitorHttp } = await import('@capacitor/core')
      const response = await CapacitorHttp.request({
        method: options.method || 'GET',
        url,
        headers: options.headers || {},
        ...(options.body ? { data: options.body } : {}),
      })
      const data = response.data
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        text: async () => typeof data === 'string' ? data : JSON.stringify(data),
        json: async () => typeof data === 'string' ? JSON.parse(data) : data,
      }
    } catch (e) {
      console.warn('Capacitor HTTP failed, falling back to fetch:', e.message)
    }
  }
  return fetch(url, options)
}
