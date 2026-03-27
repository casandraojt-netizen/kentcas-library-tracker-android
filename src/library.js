import { DEFAULT_SHELVES, getShelfDescription, getShelfLabel } from './constants'

export function normalizeShelves(rawShelves, fallbackCollection = 'physical') {
  let shelves = []
  if (Array.isArray(rawShelves)) {
    shelves = rawShelves
  } else if (typeof rawShelves === 'string' && rawShelves.trim()) {
    const trimmed = rawShelves.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) shelves = parsed
      } catch (_) {}
    } else if (trimmed.includes('|')) {
      shelves = trimmed.split('|')
    } else {
      shelves = [trimmed]
    }
  }

  const normalized = shelves
    .map(value => String(value || '').trim())
    .filter(Boolean)

  const unique = [...new Set(normalized.filter(value => value !== fallbackCollection))]
  return [fallbackCollection, ...unique]
}

export function getBookShelves(book) {
  return normalizeShelves(book?.shelves ?? book?.shelf ?? book?.collection, book?.collection || 'physical')
}

export function getBookShelf(book) {
  return getBookShelves(book)[0]
}

export function buildShelves(books, customShelves = []) {
  const shelfMap = new Map(DEFAULT_SHELVES.map(shelf => [shelf.id, { ...shelf, count: 0 }]))

  for (const shelf of customShelves) {
    const name = shelf?.name?.trim()
    if (!name || shelfMap.has(name)) continue
    shelfMap.set(name, {
      id: name,
      name,
      collection: shelf.collection === 'web' ? 'web' : 'physical',
      isDefault: false,
      description: 'Custom shelf',
      count: 0,
    })
  }

  for (const book of books) {
    for (const shelfId of getBookShelves(book)) {
      const existing = shelfMap.get(shelfId)
      if (existing) {
        existing.count += 1
        continue
      }
      shelfMap.set(shelfId, {
        id: shelfId,
        name: getShelfLabel(shelfId),
        collection: book.collection === 'web' ? 'web' : 'physical',
        isDefault: false,
        description: getShelfDescription(shelfId),
        count: 1,
      })
    }
  }

  return Array.from(shelfMap.values()).sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function getBooksInShelf(books, shelfId) {
  return books.filter(book => getBookShelves(book).includes(shelfId))
}
