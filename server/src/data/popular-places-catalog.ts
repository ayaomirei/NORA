import { POPULAR_PLACES_MANIFEST } from './popular-places-manifest.js'
import type { PlaceManifestEntry } from './places-manifest.js'

export type PopularPlaceCatalogItem = {
  id: string
  title: string
  place: string
  address: string
  lng: number
  lat: number
  duration: string
  budgetTier: number
  badge: string
  venueTags: string[]
  minAge?: number
  moods: Array<'calm' | 'energy' | 'tired' | 'anxious'>
}

type CategoryKey =
  | 'park'
  | 'hotel'
  | 'guest'
  | 'cafe'
  | 'specialty'
  | 'rest'
  | 'bar'
  | 'club'
  | 'mall'
  | 'market'
  | 'culture'
  | 'fun'
  | 'work'
  | 'other'

const CATEGORY_META: Record<
  CategoryKey,
  {
    titlePrefix: string
    duration: string
    budgetTier: number
    badge: string
    venueTags: string[]
    moods: PopularPlaceCatalogItem['moods']
    minAge?: number
  }
> = {
  park: {
    titlePrefix: 'Прогулка',
    duration: '1 ч',
    budgetTier: 0,
    badge: 'Свежий воздух и неспешный темп',
    venueTags: ['park', 'wellness'],
    moods: ['calm', 'anxious'],
  },
  hotel: {
    titlePrefix: 'Отдых в',
    duration: '1 ч 30 мин',
    budgetTier: 3,
    badge: 'Комфорт и спокойная атмосфера',
    venueTags: ['culture'],
    moods: ['calm', 'tired'],
  },
  guest: {
    titlePrefix: 'Гостиница',
    duration: '1 ч',
    budgetTier: 1,
    badge: 'Бюджетное размещение в центре',
    venueTags: ['culture'],
    moods: ['calm', 'tired'],
  },
  cafe: {
    titlePrefix: 'Кофе в',
    duration: '50 мин',
    budgetTier: 1,
    badge: 'Уютная пауза в течение дня',
    venueTags: ['cafe', 'food'],
    moods: ['calm', 'tired', 'anxious'],
  },
  specialty: {
    titlePrefix: 'Спешелти в',
    duration: '45 мин',
    budgetTier: 2,
    badge: 'Авторский кофе и обжарка',
    venueTags: ['cafe', 'food'],
    moods: ['calm', 'tired', 'anxious'],
  },
  rest: {
    titlePrefix: 'Ужин в',
    duration: '1 ч 15 мин',
    budgetTier: 2,
    badge: 'Вкусная остановка в маршруте',
    venueTags: ['food'],
    moods: ['calm', 'energy'],
  },
  bar: {
    titlePrefix: 'Вечер в',
    duration: '1 ч 30 мин',
    budgetTier: 2,
    badge: 'Живая атмосфера и общение',
    venueTags: ['bar', 'nightlife'],
    moods: ['energy'],
    minAge: 18,
  },
  club: {
    titlePrefix: 'Клуб',
    duration: '2 ч',
    budgetTier: 3,
    badge: 'Ночная жизнь и танцпол',
    venueTags: ['club', 'nightlife'],
    moods: ['energy'],
    minAge: 18,
  },
  mall: {
    titlePrefix: 'Шопинг в',
    duration: '1 ч 30 мин',
    budgetTier: 2,
    badge: 'Торговый центр и развлечения',
    venueTags: ['culture', 'family'],
    moods: ['energy', 'calm'],
  },
  market: {
    titlePrefix: 'По рынку',
    duration: '1 ч',
    budgetTier: 1,
    badge: 'Местный колорит и уличная еда',
    venueTags: ['market', 'food'],
    moods: ['energy'],
  },
  culture: {
    titlePrefix: 'Культура',
    duration: '1 ч 15 мин',
    budgetTier: 1,
    badge: 'Музей, театр или площадь',
    venueTags: ['culture'],
    moods: ['calm', 'anxious'],
  },
  fun: {
    titlePrefix: 'Активный отдых',
    duration: '2 ч',
    budgetTier: 2,
    badge: 'Спорт, аквапарк или этно-комплекс',
    venueTags: ['family', 'wellness'],
    moods: ['energy', 'calm'],
  },
  work: {
    titlePrefix: 'Рабочая пауза',
    duration: '45 мин',
    budgetTier: 1,
    badge: 'Книги, коворкинг или тихое место',
    venueTags: ['cafe', 'culture'],
    moods: ['calm', 'tired'],
  },
  other: {
    titlePrefix: 'Визит',
    duration: '1 ч',
    budgetTier: 1,
    badge: 'Популярное место в городе',
    venueTags: ['culture'],
    moods: ['calm', 'energy'],
  },
}

function categoryFromId(id: string): CategoryKey {
  const m = id.match(/^poi-([^-]+)/)
  const raw = m?.[1] ?? 'other'
  if (raw in CATEGORY_META) return raw as CategoryKey
  return 'other'
}

function parseQuery(query: string): { place: string; address: string } {
  const stripped = query
    .replace(/^Бишкек,\s*/i, '')
    .replace(/^Кыргызстан,\s*/i, '')
    .trim()
  const parts = stripped.split(/,\s*/)
  if (parts.length >= 2) {
    return {
      place: parts[0]!,
      address: parts.slice(1).join(', '),
    }
  }
  return { place: stripped, address: 'Бишкек' }
}

function buildCatalogItem(entry: PlaceManifestEntry): PopularPlaceCatalogItem {
  const cat = categoryFromId(entry.id)
  const meta = CATEGORY_META[cat]
  const { place, address } = parseQuery(entry.query)
  const title =
    cat === 'culture' && !place.toLowerCase().includes('театр')
      ? `${meta.titlePrefix}: ${place}`
      : `${meta.titlePrefix} «${place}»`

  return {
    id: entry.id,
    title,
    place,
    address,
    lng: 74.6036,
    lat: 42.8746,
    duration: meta.duration,
    budgetTier: meta.budgetTier,
    badge: meta.badge,
    venueTags: meta.venueTags,
    moods: meta.moods,
    ...(meta.minAge !== undefined ? { minAge: meta.minAge } : {}),
  }
}

export const POPULAR_PLACES_CATALOG: PopularPlaceCatalogItem[] =
  POPULAR_PLACES_MANIFEST.map(buildCatalogItem)
