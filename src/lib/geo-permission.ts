/** Решение пользователя в NORA (до/вместе с системным диалогом браузера). */
export type GeoPermissionPref = 'unset' | 'granted' | 'denied'

const KEY = 'nora_geo_permission'
const CHANGE_EVENT = 'nora-geo-permission-change'

export function getGeoPermission(): GeoPermissionPref {
  if (typeof window === 'undefined') return 'unset'
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === 'granted' || raw === 'denied' || raw === 'unset') return raw
  } catch {
    /* private mode */
  }
  return 'unset'
}

export function setGeoPermission(pref: GeoPermissionPref): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, pref)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    /* quota */
  }
}

export function isGeoAllowed(): boolean {
  return getGeoPermission() === 'granted'
}

export function subscribeGeoPermission(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

/** Статус разрешения в браузере (если поддерживается Permissions API). */
export async function queryBrowserGeoPermission(): Promise<
  PermissionState | 'unsupported'
> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unsupported'
  }
  try {
    const result = await navigator.permissions.query({
      name: 'geolocation',
    })
    return result.state
  } catch {
    return 'unsupported'
  }
}
