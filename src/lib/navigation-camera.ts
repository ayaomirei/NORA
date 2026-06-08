/** Расстояние между точками на плоской проекции, м */
export function distanceMeters(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
): number {
  const R = 111_320
  const dx = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180) * R
  const dy = (a.lat - b.lat) * R
  return Math.hypot(dx, dy)
}

/** Азимут от `from` к `to`, градусы (0 = север). */
export function bearingDegrees(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Следующая остановка маршрута (первая, до которой ещё не «дошли»). */
export function pickNavigationTarget(
  user: { lng: number; lat: number },
  stops: readonly { lng: number; lat: number }[],
  reachedThresholdM = 85,
): { lng: number; lat: number } | null {
  if (!stops.length) return null
  for (const stop of stops) {
    if (distanceMeters(user, stop) > reachedThresholdM) return stop
  }
  return stops[stops.length - 1]!
}

export const NAV_CAMERA = {
  /** Наклон как в навигаторе: дорога впереди, горизонт ровный */
  pitch: 58,
  zoom: 17.25,
  /** Центр камеры смещён вперёд по курсу — маркер пользователя внизу экрана */
  forwardOffsetM: 70,
  padding: { top: 108, bottom: 148, left: 0, right: 0 },
} as const

export type NavigationCameraView = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
  padding: { top: number; bottom: number; left: number; right: number }
}

/** Сдвиг точки вперёд по азимуту (bearing 0 = север). */
export function offsetAlongBearing(
  point: { lng: number; lat: number },
  bearingDeg: number,
  distanceM: number,
): { lng: number; lat: number } {
  const R = 6_371_000
  const br = (bearingDeg * Math.PI) / 180
  const latRad = (point.lat * Math.PI) / 180
  const d = distanceM / R
  const lat2 = Math.asin(
    Math.sin(latRad) * Math.cos(d) +
      Math.cos(latRad) * Math.sin(d) * Math.cos(br),
  )
  const lng2 =
    (point.lng * Math.PI) / 180 +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(lat2),
    )
  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (((lng2 * 180) / Math.PI + 540) % 360) - 180,
  }
}

export function resolveNavigationBearing(
  user: {
    lng: number
    lat: number
    heading?: number | null
    speed?: number | null
  },
  target: { lng: number; lat: number },
  fallbackBearing: number,
): number {
  const routeBearing = bearingDegrees(user, target)
  const speed = user.speed ?? 0
  if (
    speed > 0.8 &&
    user.heading != null &&
    Number.isFinite(user.heading) &&
    user.heading >= 0
  ) {
    return user.heading
  }
  return routeBearing || fallbackBearing
}

/** Вид от 3-го лица: курс по маршруту, пользователь внизу, дорога впереди. */
export function buildNavigationCameraView(
  user: {
    lng: number
    lat: number
    heading?: number | null
    speed?: number | null
  },
  target: { lng: number; lat: number } | null,
  fallbackBearing: number,
): NavigationCameraView {
  const bearing = target
    ? resolveNavigationBearing(user, target, fallbackBearing)
    : fallbackBearing
  const forward = offsetAlongBearing(user, bearing, NAV_CAMERA.forwardOffsetM)
  return {
    center: [forward.lng, forward.lat],
    zoom: NAV_CAMERA.zoom,
    pitch: NAV_CAMERA.pitch,
    bearing,
    padding: { ...NAV_CAMERA.padding },
  }
}
