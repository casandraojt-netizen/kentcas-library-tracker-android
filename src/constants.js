export const PHYSICAL_STATUSES = [
  { value: 'reading', label: 'Reading', color: '#c9873a' },
  { value: 'finished', label: 'Finished', color: '#5a9a6e' },
  { value: 'unread', label: 'Unread', color: '#6b5f52' },
  { value: 'dropped', label: 'Dropped', color: '#9a4040' },
]

export const WEB_STATUSES = [
  { value: 'reading', label: 'Reading', color: '#c9873a' },
  { value: 'finished', label: 'Finished', color: '#5a9a6e' },
  { value: 'unread', label: 'Unread', color: '#6b5f52' },
  { value: 'dropped', label: 'Dropped', color: '#9a4040' },
  { value: 'waiting', label: 'Waiting', color: '#4a7a9a' },
  { value: 'abandoned', label: 'Abandoned', color: '#8a5030' },
  { value: 'hiatus', label: 'Hiatus', color: '#7a6a3a' },
]

export const PHYSICAL_GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Romance', 'Historical Fiction',
  'Literary Fiction', 'Horror', 'Adventure', 'Biography', 'Self-Help', 'Non-Fiction',
  'Philosophy', 'Classics', 'Young Adult', 'Graphic Novel', 'Poetry', 'Other',
]

export const WEB_GENRES = [
  'Xianxia', 'Wuxia', 'Xuanhuan', 'Isekai', 'Fantasy', 'System / LitRPG',
  'Romance', 'Harem', 'Action', 'Adventure', 'Horror', 'Mystery', 'Slice of Life',
  'Sci-Fi', 'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Manhwa', 'Manhua', 'Manga',
  'Webcomic', 'Progression Fantasy', 'Dungeon Core', 'Reincarnation', 'Other',
]

export const DEFAULT_SHELVES = [
  { id: 'physical', name: 'Physical Books', collection: 'physical', isDefault: true, description: 'Your shelf for print books' },
  { id: 'web', name: 'Web Books', collection: 'web', isDefault: true, description: 'Novels, manga, manhwa, and forum fiction' },
]

export function getStatuses(collection) {
  return collection === 'physical' ? PHYSICAL_STATUSES : WEB_STATUSES
}

export function getGenres(collection) {
  return collection === 'physical' ? PHYSICAL_GENRES : WEB_GENRES
}

export function getStatusInfo(status) {
  return [...PHYSICAL_STATUSES, ...WEB_STATUSES].find(item => item.value === status) || { label: status, color: 'var(--text-muted)' }
}

export function getCollectionLabel(collection) {
  return collection === 'physical' ? 'Physical' : 'Web'
}

export function getShelfLabel(shelf) {
  return DEFAULT_SHELVES.find(item => item.id === shelf)?.name || shelf
}

export function getShelfDescription(shelf) {
  return DEFAULT_SHELVES.find(item => item.id === shelf)?.description || 'Custom shelf'
}
