import type { PlaceManifestEntry } from './places-manifest.js'

/**
 * Популярные POI Бишкека: парки, бульвары, отели, гостиницы, кафе, спешелти,
 * бары, клубы, ТРЦ, парки развлечений.
 * Геокодируются в server/data/place-coords.json (пропуск уже сохранённых).
 */
export const POPULAR_PLACES_MANIFEST: PlaceManifestEntry[] = [
  // Парки и отдых на воздухе
  { id: 'poi-park-panfilov', query: 'Бишкек, парк им. Панфилова' },
  { id: 'poi-park-pobedy', query: 'Бишкек, парк Победы' },
  { id: 'poi-park-dubovy', query: 'Бишкек, парк Дубовый' },
  { id: 'poi-park-ata-turk', query: 'Бишкек, парк Ататюрка' },
  { id: 'poi-park-botanic', query: 'Бишкек, ботанический сад' },
  { id: 'poi-park-molodezhny', query: 'Бишкек, парк Молодёжный' },
  { id: 'poi-park-ak-keme', query: 'Бишкек, парк Ак-Кеме, проспект Манаса 8' },
  { id: 'poi-bulvar-erkendik', query: 'Бишкек, бульвар Эркиндик' },
  { id: 'poi-skver-toktogul', query: 'Бишкек, сквер им. Токтогула' },
  { id: 'poi-ploshchad-ala-too', query: 'Бишкек, площадь Ала-Тоо' },
  {
    id: 'poi-park-yuzhny',
    query: 'Бишкек, Южный парк, микрорайон Восток-5',
  },
  {
    id: 'poi-zoo',
    query: 'Бишкек, зоопарк, проспект Молодёжный 3',
    fallbackQuery: 'Бишкек, зоологический сад, ул. Раззакова 37',
  },
  { id: 'poi-park-family', query: 'Бишкек, Семейный парк, ул. Коенкозова' },
  { id: 'poi-park-sverdlov', query: 'Бишкек, парк им. Свердлова' },
  {
    id: 'poi-park-alamedin',
    query: 'Бишкек, парк у реки Аламедин, ул. Ахунбаева',
  },
  { id: 'poi-park-borboruk', query: 'Бишкек, парк Борбордук' },
  {
    id: 'poi-park-toktogul',
    query: 'Бишкек, парк им. Токтогула, ул. Токтогула',
  },
  { id: 'poi-bulvar-kok-jar', query: 'Бишкек, бульвар Кок-Жар' },
  {
    id: 'poi-bulvar-moskovskaya',
    query: 'Бишкек, бульвар на Московской, ул. Московская',
  },
  {
    id: 'poi-bulvar-molodezhny',
    query: 'Бишкек, бульвар Молодёжный, проспект Молодёжный',
  },

  // Отели
  {
    id: 'poi-hotel-hyatt',
    query: 'Бишкек, Hyatt Regency Bishkek, ул. Токтогула 107',
  },
  { id: 'poi-hotel-orion', query: 'Бишкек, Orion Hotel, проспект Манаса 158' },
  { id: 'poi-hotel-plaza', query: 'Бишкек, Plaza Hotel, пр. Манаса 49' },
  { id: 'poi-hotel-ambassador', query: 'Бишкек, Ambassador Hotel, пр. Молодёжная 113' },
  { id: 'poi-hotel-smart', query: 'Бишкек, Smart Hotel, ул. Токтогула 105' },
  { id: 'poi-hotel-damas', query: 'Бишкек, Damas Hotel, ул. Боконбаева 129' },
  {
    id: 'poi-hotel-ak-keme',
    query: 'Бишкек, отель Ак-Кеме, проспект Манаса 8',
  },
  { id: 'poi-hotel-solutel', query: 'Бишкек, Solutel Hotel, ул. Боконбаева 125' },
  { id: 'poi-hotel-novotel', query: 'Бишкек, Novotel Bishkek City Center, пр. Манаса 16' },
  { id: 'poi-hotel-futuro', query: 'Бишкек, Futuro Hotel, ул. Боконбаева 94' },
  {
    id: 'poi-hotel-garden',
    query: 'Бишкек, Garden Hotel & SPA, ул. Медерова 20',
  },
  { id: 'poi-hotel-king', query: 'Бишкек, King Hotel, ул. Боконбаева 96' },
  { id: 'poi-hotel-ala-too', query: 'Бишкек, Ala-Too Hotel, ул. Боконбаева 98' },
  {
    id: 'poi-hotel-golden-dragon',
    query: 'Бишкек, Golden Dragon Hotel, ул. Токтогула 110',
  },
  { id: 'poi-hotel-kapital', query: 'Бишкек, Kapital Hotel, ул. Токтогула 136' },
  { id: 'poi-hotel-umai', query: 'Бишкек, Umai Hotel, ул. Боконбаева 94' },
  {
    id: 'poi-hotel-jannat',
    query: 'Бишкек, Jannat Regency Bishkek, ул. Медерова 6',
  },
  { id: 'poi-hotel-tehran', query: 'Бишкек, Tehran Hotel, ул. Токтогула 94' },
  { id: 'poi-hotel-city', query: 'Бишкек, City Hotel Bishkek, ул. Токтогула 106' },
  { id: 'poi-hotel-pinberry', query: 'Бишкек, Pinberry Hotel, ул. Киевская 107' },

  // Гостиницы и хостелы
  { id: 'poi-guest-nomad', query: 'Бишкек, Nomad Hostel, ул. Киевская 22' },
  { id: 'poi-guest-apple', query: 'Бишкек, Apple Hostel, ул. Киевская 64' },
  {
    id: 'poi-guest-center',
    query: 'Бишкек, Center Hostel, ул. Ибраимова 30',
  },
  { id: 'poi-guest-art', query: 'Бишкек, Art Hostel, ул. Киевская 86' },
  {
    id: 'poi-guest-sakura',
    query: 'Бишкек, Sakura Guest House, ул. Токтогула 136',
  },
  {
    id: 'poi-guest-bishkek-house',
    query: 'Бишкек, Bishkek Guest House, ул. Киевская 28',
  },

  // Кафе и кофейни
  { id: 'poi-cafe-sierra', query: 'Бишкек, Sierra Coffee, ул. Киевская 107' },
  { id: 'poi-cafe-coffee30', query: 'Бишкек, Coffee 3.0, ул. Токтогула 87' },
  { id: 'poi-cafe-ants', query: 'Бишкек, Ants Cafe, ул. Ахунбаева 127' },
  { id: 'poi-cafe-skovoroda', query: 'Бишкек, Сковорода, проспект Чуй 150' },
  { id: 'poi-cafe-casa', query: 'Бишкек, Casa Coffee, ул. Абдрахманова 144' },
  { id: 'poi-cafe-coffee-mood', query: 'Бишкек, Coffee Mood, пр. Чуй 126' },
  { id: 'poi-cafe-gap', query: 'Бишкек, Gap Food, пр. Чуй 164' },
  { id: 'poi-cafe-teplo', query: 'Бишкек, кафе Тепло, ул. Ахунбаева 113' },
  { id: 'poi-cafe-kapuchino', query: 'Бишкек, кофейня Капучино, пр. Чуй 126' },
  { id: 'poi-cafe-ololo', query: 'Бишкек, O!Kroshka, ул. Киевская 107' },
  { id: 'poi-cafe-latte', query: 'Бишкек, Latte, пр. Чуй 127' },
  {
    id: 'poi-cafe-coffee-island',
    query: 'Бишкек, Coffee Island, пр. Чуй 127',
  },
  {
    id: 'poi-cafe-sierra-chui',
    query: 'Бишкек, Sierra Coffee, проспект Чуй 126',
  },

  // Спешелти-кофейни
  { id: 'poi-specialty-bon', query: 'Бишкек, Bon! Coffee, ул. Киевская 107' },
  {
    id: 'poi-specialty-adriano',
    query: 'Бишкек, Adriano Coffee, ул. Ахунбаева 105',
  },
  {
    id: 'poi-specialty-twelve-horses',
    query: 'Бишкек, Twelve Horses Coffee, ул. Киевская 107',
  },
  { id: 'poi-specialty-q', query: 'Бишкек, Q Coffee, ул. Киевская 64' },
  {
    id: 'poi-specialty-bublik',
    query: 'Бишкек, Bublik Coffee, ул. Киевская 107',
  },
  { id: 'poi-specialty-sens', query: 'Бишкек, Sens Coffee, ул. Киевская 107' },
  { id: 'poi-specialty-wilton', query: 'Бишкек, Wilton Cafe, ул. Киевская 107' },
  {
    id: 'poi-specialty-corretto',
    query: 'Бишкек, Corretto, проспект Чуй 126',
  },
  {
    id: 'poi-specialty-craft',
    query: 'Бишкек, Craft Coffee, ул. Ахунбаева 127',
  },

  // Рестораны и общепит
  { id: 'poi-rest-supara', query: 'Бишкек, Supara Ethno-Complex, ул. Карасаева 1' },
  { id: 'poi-rest-faiza', query: 'Бишкек, Faiza, ул. Жибек-Жолу 555' },
  { id: 'poi-rest-buhara', query: 'Бишкек, чайхана Бухара, ул. Ибраимова 103' },
  {
    id: 'poi-rest-navigator',
    query: 'Бишкек, ресторан Navigator, проспект Манаса 57',
  },
  { id: 'poi-rest-chicken-star', query: 'Бишкек, Chicken Star, пр. Чуй 127' },
  { id: 'poi-rest-arzu', query: 'Бишкек, Arzu, ул. Ибраимова 78' },
  {
    id: 'poi-rest-ethno-complex',
    query: 'Бишкек, этно-комплекс Алай, ул. Карасаева 51',
  },
  { id: 'poi-rest-mughal', query: 'Бишкек, Mughal, пр. Чуй 127' },
  { id: 'poi-rest-navat', query: 'Бишкек, Navat, проспект Чуй 96' },
  {
    id: 'poi-rest-old-bukhara',
    query: 'Бишкек, ресторан Old Bukhara, ул. Ибраимова',
  },

  // Бары и ночная жизнь
  { id: 'poi-bar-12', query: 'Бишкек, Bar 12, ул. Киевская 77' },
  { id: 'poi-bar-save-the-ales', query: 'Бишкек, Save the Ales, ул. Московская 189' },
  { id: 'poi-bar-ipub', query: 'Бишкек, I-Pub, ул. Киевская 107' },
  { id: 'poi-bar-metro-pub', query: 'Бишкек, Metro Pub, ул. Панфилова 148' },
  { id: 'poi-bar-pinta', query: 'Бишкек, Pinta Pub, ул. Коенкозова 75' },
  { id: 'poi-bar-garage', query: 'Бишкек, Garage Pub, ул. Киевская 87' },
  { id: 'poi-bar-klub-kvartira', query: 'Бишкек, клуб Квартира, ул. Киевская 109' },
  { id: 'poi-bar-promzona', query: 'Бишкек, Promzona, ул. Щербакова 1' },
  { id: 'poi-bar-twelve', query: 'Бишкек, Twelve Bar, ул. Киевская 77' },
  { id: 'poi-bar-monkey', query: 'Бишкек, Monkey Bar, ул. Киевская 77' },
  { id: 'poi-bar-timeout', query: 'Бишкек, Time Out Bar, ул. Киевская 77' },
  { id: 'poi-bar-old-school', query: 'Бишкек, Old School Bar, ул. Киевская 77' },
  { id: 'poi-bar-buddha', query: 'Бишкек, Buddha Bar, ул. Московская 189' },

  // Клубы
  { id: 'poi-club-studio9', query: 'Бишкек, Studio 9, ул. Киевская 109' },
  { id: 'poi-club-gagarin', query: 'Бишкек, Gagarin Night Club, ул. Киевская' },
  { id: 'poi-club-retro', query: 'Бишкек, Retro Club, ул. Киевская 77' },
  {
    id: 'poi-club-platinum',
    query: 'Бишкек, Platinum Night Club, ул. Московская',
  },
  { id: 'poi-club-rubicon', query: 'Бишкек, Rubicon Club, ул. Киевская' },
  { id: 'poi-club-zhara', query: 'Бишкек, ночной клуб Жара, ул. Киевская' },
  { id: 'poi-club-eshak', query: 'Бишкек, Eshak Club, ул. Киевская 109' },

  // Торговые центры
  {
    id: 'poi-mall-bishkek-park',
    query: 'Бишкек, торговый центр Bishkek Park, проспект Чуй',
  },
  { id: 'poi-mall-asia-mall', query: 'Бишкек, Asia Mall, проспект Манаса 62' },
  { id: 'poi-mall-tsum', query: 'Бишкек, ЦУМ' },
  { id: 'poi-mall-dordoi-plaza', query: 'Бишкек, Dordoi Plaza' },
  { id: 'poi-mall-globus', query: 'Бишкек, торговый центр Globus' },
  { id: 'poi-mall-vesna', query: 'Бишкек, торговый центр Весна' },
  { id: 'poi-mall-vefa', query: 'Бишкек, Vefa Center, ул. Горького 1' },
  { id: 'poi-mall-umai', query: 'Бишкек, Umai Center, ул. Боконбаева' },
  { id: 'poi-mall-frunze', query: 'Бишкек, торговый центр Фрунзе, пр. Чуй' },
  {
    id: 'poi-mall-12-mega',
    query: 'Бишкек, 12 Mega, проспект Манаса 57',
  },

  // Рынки
  { id: 'poi-market-osh', query: 'Бишкек, Ошский базар, ул. Айни 14' },
  { id: 'poi-market-dordoi', query: 'Бишкек, рынок Дордой, село Сокулук' },
  { id: 'poi-market-ortosai', query: 'Бишкек, Орто-Сай, проспект Чуй' },

  // Культура и музеи
  { id: 'poi-culture-philharmonic', query: 'Бишкек, Кыргызская национальная филармония' },
  { id: 'poi-culture-opera', query: 'Бишкек, театр оперы и балета' },
  { id: 'poi-culture-history-museum', query: 'Бишкек, Государственный исторический музей' },
  { id: 'poi-culture-art-museum', query: 'Бишкек, музей изобразительных искусств' },
  { id: 'poi-culture-russian-theatre', query: 'Бишкек, русский драматический театр' },
  {
    id: 'poi-culture-manas',
    query: 'Бишкек, памятник Манаса, площадь Манаса',
  },

  // Спорт и развлечения
  {
    id: 'poi-fun-aquapark',
    query: 'Бишкек, аквапарк Ак-Кеме, проспект Манаса 8',
  },
  { id: 'poi-fun-ice-palace', query: 'Бишкек, ледовый дворец, ул. Юргенева 11' },
  { id: 'poi-fun-spartak-stadium', query: 'Бишкек, стадион Спартак' },
  { id: 'poi-fun-dordoi-ethno', query: 'Кыргызстан, этнокомплекс Дордой, Кашка-Суу' },
  { id: 'poi-fun-kidburg', query: 'Бишкек, Kidburg, пр. Чуй 127' },
  {
    id: 'poi-fun-galaxy',
    query: 'Бишкек, Galaxy Entertainment, пр. Чуй 127',
  },
  { id: 'poi-fun-circus', query: 'Бишкек, цирк, ул. Фрунзе 109' },
  {
    id: 'poi-fun-bowling-strike',
    query: 'Бишкек, Strike Bowling, пр. Чуй 127',
  },
  {
    id: 'poi-fun-karting',
    query: 'Бишкек, Karting Club, пр. Чуй 127',
  },
  {
    id: 'poi-fun-cinema-olimp',
    query: 'Бишкек, кинотеатр Олимп, пр. Чуй 127',
  },
  {
    id: 'poi-fun-happy-city',
    query: 'Бишкек, Happy City, торговый центр Bishkek Park',
  },

  // Коворкинги и книги
  { id: 'poi-work-kitap', query: 'Бишкек, Kitap.kg, проспект Чуй 124' },
  { id: 'poi-work-impact-hub', query: 'Бишкек, Impact Hub, ул. Исанова 78' },
  { id: 'poi-work-fablab', query: 'Бишкек, FabLab KG, пр. Чуй 124' },
]
