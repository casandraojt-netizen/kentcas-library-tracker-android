/**
 * Database layer
 * - Native (Capacitor Android): uses @neondatabase/serverless directly via WebSocket
 * - Browser (Vercel PWA): uses /api/query proxy to avoid CORS
 */

import { isNative } from './lib/http'
import { normalizeShelves } from './library'

const STORAGE_KEY = 'neon_connection_string'
const HISTORY_PAGE_SIZE = 20

let schemaReady = false
let schemaPromise = null

export function setNeonUrl(url) {
  localStorage.setItem(STORAGE_KEY, url.trim())
  schemaReady = false
  schemaPromise = null
}

export function getNeonUrl() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function clearNeonUrl() {
  localStorage.removeItem(STORAGE_KEY)
  schemaReady = false
  schemaPromise = null
}

export function hasNeonUrl() {
  return !!getNeonUrl()
}

async function queryNative(sql, params = []) {
  const { neon } = await import('@neondatabase/serverless')
  const db = neon(getNeonUrl())
  return await db(sql, params)
}

async function queryProxy(sql, params = []) {
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionString: getNeonUrl(), sql, params }),
  })
  if (!response.ok) {
    const text = await response.text()
    let msg = text
    try {
      msg = JSON.parse(text).error || text
    } catch (_) {}
    throw new Error(msg)
  }
  const data = await response.json()
  return data.rows || []
}

async function executeSql(sql, params = []) {
  if (!getNeonUrl()) throw new Error('No database URL configured')
  if (isNative()) return queryNative(sql, params)
  return queryProxy(sql, params)
}

async function ensureSchema() {
  if (schemaReady) return
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await ensureRemoteSchema()
      await runSchemaMigration()
      schemaReady = true
    })().catch(error => {
      schemaReady = false
      schemaPromise = null
      throw error
    })
  }
  await schemaPromise
}

async function runQuery(sql, params = []) {
  await ensureSchema()
  return executeSql(sql, params)
}

async function ensureRemoteSchema() {
  await executeSql(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      title TEXT NOT NULL,
      shelf TEXT DEFAULT '',
      shelves TEXT DEFAULT '[]',
      author TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'unread',
      status_changed_at TIMESTAMPTZ,
      current_chapter TEXT DEFAULT '',
      total_chapters TEXT DEFAULT '',
      year INTEGER,
      is_favorite BOOLEAN DEFAULT FALSE,
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      is_r18 BOOLEAN DEFAULT FALSE,
      source_url TEXT DEFAULT '',
      web_type TEXT DEFAULT 'novel',
      rss_feed_url TEXT DEFAULT '',
      rss_last_item_title TEXT DEFAULT '',
      rss_last_item_date TIMESTAMPTZ,
      rss_last_item_url TEXT DEFAULT '',
      rss_has_update BOOLEAN DEFAULT FALSE,
      rss_last_checked TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted BOOLEAN DEFAULT FALSE
    );
  `)

  await executeSql(`
    CREATE TABLE IF NOT EXISTS reading_history (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      event_type TEXT DEFAULT 'status_changed',
      from_status TEXT,
      to_status TEXT,
      from_chapter TEXT,
      to_chapter TEXT,
      event_at TIMESTAMPTZ,
      changed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      title TEXT DEFAULT '',
      author TEXT DEFAULT '',
      collection TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      shelves_json TEXT DEFAULT '[]'
    );
  `)

  await executeSql(`CREATE INDEX IF NOT EXISTS idx_books_collection ON books(collection);`)
  await executeSql(`CREATE INDEX IF NOT EXISTS idx_books_updated_at ON books(updated_at DESC);`)
  await executeSql(`CREATE INDEX IF NOT EXISTS idx_reading_history_book_id ON reading_history(book_id);`)
  await executeSql(`CREATE INDEX IF NOT EXISTS idx_reading_history_event_at ON reading_history(event_at DESC);`)
}

async function runSchemaMigration() {
  const statements = [
    `ALTER TABLE books ADD COLUMN shelf TEXT DEFAULT ''`,
    `ALTER TABLE books ADD COLUMN shelves TEXT DEFAULT '[]'`,
    `ALTER TABLE books ADD COLUMN tags TEXT DEFAULT ''`,
    `ALTER TABLE books ADD COLUMN is_r18 BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE books ADD COLUMN rss_last_item_date TIMESTAMPTZ`,
    `ALTER TABLE books ADD COLUMN rss_last_item_url TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN event_type TEXT DEFAULT 'status_changed'`,
    `ALTER TABLE reading_history ADD COLUMN from_status TEXT`,
    `ALTER TABLE reading_history ADD COLUMN to_status TEXT`,
    `ALTER TABLE reading_history ADD COLUMN from_chapter TEXT`,
    `ALTER TABLE reading_history ADD COLUMN to_chapter TEXT`,
    `ALTER TABLE reading_history ADD COLUMN event_at TIMESTAMPTZ`,
    `ALTER TABLE reading_history ADD COLUMN changed_at TIMESTAMPTZ`,
    `ALTER TABLE reading_history ADD COLUMN title TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN author TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN collection TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN genre TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN tags TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN cover_url TEXT DEFAULT ''`,
    `ALTER TABLE reading_history ADD COLUMN shelves_json TEXT DEFAULT '[]'`,
  ]

  for (const sql of statements) {
    try {
      await executeSql(sql)
    } catch (_) {}
  }

  try {
    await executeSql(`UPDATE books SET shelf = collection WHERE shelf IS NULL OR shelf = ''`)
    await executeSql(`
      UPDATE books
      SET shelves = to_json(ARRAY[COALESCE(NULLIF(shelf, ''), collection)])::text
      WHERE shelves IS NULL OR shelves = ''
    `)
    await executeSql(`UPDATE reading_history SET event_type = 'status_changed' WHERE event_type IS NULL OR event_type = ''`)
    await executeSql(`UPDATE reading_history SET event_at = COALESCE(event_at, changed_at, created_at) WHERE event_at IS NULL`)
    await executeSql(`
      UPDATE reading_history
      SET shelves_json = to_json(ARRAY[COALESCE(NULLIF(collection, ''), 'physical')])::text
      WHERE shelves_json IS NULL OR shelves_json = ''
    `)
  } catch (_) {}
}

function normalizeBook(book) {
  const collection = book.collection === 'web' ? 'web' : 'physical'
  const shelves = normalizeShelves(book.shelves ?? book.shelf ?? book.collection, collection)
  return {
    ...book,
    collection,
    shelf: shelves[0],
    shelves,
  }
}

function deserializeBook(row) {
  const collection = row.collection === 'web' ? 'web' : 'physical'
  const shelves = normalizeShelves(row.shelves ?? row.shelf ?? collection, collection)
  return {
    ...row,
    collection,
    shelf: shelves[0],
    shelves,
    is_favorite: !!row.is_favorite,
    is_r18: !!row.is_r18,
    rss_has_update: !!row.rss_has_update,
    deleted: !!row.deleted,
    year: row.year ? parseInt(row.year, 10) : null,
  }
}

function deserializeHistoryEntry(row) {
  const collection = row.collection === 'web' ? 'web' : 'physical'
  const shelves = normalizeShelves(row.shelves_json, collection)
  return {
    ...row,
    collection,
    event_type: row.event_type || 'status_changed',
    event_at: row.event_at || row.changed_at || row.created_at,
    shelf: shelves[0],
    shelves,
  }
}

function nextPlaceholder(params, value) {
  params.push(value)
  return `$${params.length}`
}

function buildHistoryFilter(filters = {}, params = [], includeRecentCutoff = false, cutoff = null) {
  const clauses = ['1 = 1']

  if (filters.search?.trim()) {
    const query = `%${filters.search.trim().toLowerCase()}%`
    const titleParam = nextPlaceholder(params, query)
    const authorParam = nextPlaceholder(params, query)
    clauses.push(`(LOWER(title) LIKE ${titleParam} OR LOWER(author) LIKE ${authorParam})`)
  }

  if (filters.bookId) {
    clauses.push(`book_id = ${nextPlaceholder(params, filters.bookId)}`)
  }

  if (filters.collection) {
    clauses.push(`collection = ${nextPlaceholder(params, filters.collection)}`)
  }

  if (filters.genre) {
    clauses.push(`genre = ${nextPlaceholder(params, filters.genre)}`)
  }

  if (filters.tag?.trim()) {
    clauses.push(`LOWER(tags) LIKE ${nextPlaceholder(params, `%${filters.tag.trim().toLowerCase()}%`)}`)
  }

  if (filters.shelf) {
    const escaped = String(filters.shelf).replace(/"/g, '""')
    clauses.push(`shelves_json LIKE ${nextPlaceholder(params, `%"${escaped}"%`)}`)
  }

  if (filters.eventTypes?.length) {
    const placeholders = filters.eventTypes.map(value => nextPlaceholder(params, value))
    clauses.push(`event_type IN (${placeholders.join(', ')})`)
  }

  if (includeRecentCutoff && cutoff) {
    clauses.push(`COALESCE(event_at, changed_at, created_at) >= ${nextPlaceholder(params, cutoff)}`)
  }

  return clauses.join(' AND ')
}

export async function testConnection() {
  const rows = await executeSql('SELECT 1 as ok')
  await ensureSchema()
  return rows[0]?.ok === 1 || rows[0]?.ok === '1'
}

export async function getBooks(collection) {
  const params = []
  const where = ['deleted = false']
  if (collection) {
    where.push(`collection = ${nextPlaceholder(params, collection)}`)
  }

  const rows = await runQuery(`
    SELECT *
    FROM books
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE WHEN rss_has_update = true THEN 0 ELSE 1 END,
      CASE WHEN rss_last_item_date IS NOT NULL THEN rss_last_item_date ELSE '1970-01-01'::timestamptz END DESC,
      updated_at DESC
  `, params)

  return rows.map(deserializeBook)
}

export async function getBook(id) {
  const rows = await runQuery(`SELECT * FROM books WHERE id = $1 LIMIT 1`, [id])
  return rows[0] ? deserializeBook(rows[0]) : null
}

export async function upsertBook(book) {
  const now = new Date().toISOString()
  const normalized = normalizeBook(book)

  await runQuery(`
    INSERT INTO books (
      id, collection, title, shelf, shelves, author, cover_url, genre, status, status_changed_at,
      current_chapter, total_chapters, year, is_favorite, notes, tags, is_r18, source_url,
      web_type, rss_feed_url, rss_last_item_title, rss_last_item_date, rss_last_item_url,
      rss_has_update, rss_last_checked, created_at, updated_at, deleted
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,
      $19,$20,$21,$22,$23,$24,$25,$26,$27,$28
    )
    ON CONFLICT(id) DO UPDATE SET
      shelf=EXCLUDED.shelf,
      shelves=EXCLUDED.shelves,
      title=EXCLUDED.title,
      author=EXCLUDED.author,
      cover_url=EXCLUDED.cover_url,
      genre=EXCLUDED.genre,
      status=EXCLUDED.status,
      status_changed_at=EXCLUDED.status_changed_at,
      current_chapter=EXCLUDED.current_chapter,
      total_chapters=EXCLUDED.total_chapters,
      year=EXCLUDED.year,
      is_favorite=EXCLUDED.is_favorite,
      notes=EXCLUDED.notes,
      tags=EXCLUDED.tags,
      is_r18=EXCLUDED.is_r18,
      source_url=EXCLUDED.source_url,
      web_type=EXCLUDED.web_type,
      rss_feed_url=EXCLUDED.rss_feed_url,
      rss_last_item_title=EXCLUDED.rss_last_item_title,
      rss_last_item_date=EXCLUDED.rss_last_item_date,
      rss_last_item_url=EXCLUDED.rss_last_item_url,
      rss_has_update=EXCLUDED.rss_has_update,
      rss_last_checked=EXCLUDED.rss_last_checked,
      updated_at=EXCLUDED.updated_at,
      deleted=EXCLUDED.deleted
    WHERE EXCLUDED.updated_at > books.updated_at
  `, [
    normalized.id,
    normalized.collection,
    normalized.title || '',
    normalized.shelf || normalized.collection,
    JSON.stringify(normalized.shelves),
    normalized.author || '',
    normalized.cover_url || '',
    normalized.genre || '',
    normalized.status || 'unread',
    normalized.status_changed_at || now,
    normalized.current_chapter || '',
    normalized.total_chapters || '',
    normalized.year || null,
    normalized.is_favorite ? true : false,
    normalized.notes || '',
    normalized.tags || '',
    normalized.is_r18 ? true : false,
    normalized.source_url || '',
    normalized.web_type || 'novel',
    normalized.rss_feed_url || '',
    normalized.rss_last_item_title || '',
    normalized.rss_last_item_date || null,
    normalized.rss_last_item_url || '',
    normalized.rss_has_update ? true : false,
    normalized.rss_last_checked || null,
    normalized.created_at || now,
    normalized.updated_at || now,
    normalized.deleted ? true : false,
  ])

  return getBook(normalized.id)
}

export async function updateBook(id, updates) {
  const existing = await getBook(id)
  if (!existing) throw new Error('Book not found: ' + id)

  const now = new Date().toISOString()
  const merged = normalizeBook({ ...existing, ...updates })
  const statusChanged = merged.status !== existing.status

  return upsertBook({
    ...merged,
    updated_at: updates.updated_at || now,
    status_changed_at: statusChanged ? (updates.status_changed_at || now) : (merged.status_changed_at || existing.status_changed_at || now),
  })
}

export async function deleteBook(id) {
  const existing = await getBook(id)
  if (!existing) return
  await upsertBook({
    ...existing,
    deleted: true,
    updated_at: new Date().toISOString(),
  })
}

async function createHistoryEntry({
  id = uuid(),
  book,
  eventType,
  fromStatus = null,
  toStatus = null,
  fromChapter = null,
  toChapter = null,
  eventAt = null,
}) {
  const normalized = normalizeBook(book)
  const timestamp = eventAt || normalized.updated_at || new Date().toISOString()

  await runQuery(`
    INSERT INTO reading_history (
      id, book_id, event_type, from_status, to_status, from_chapter, to_chapter,
      event_at, changed_at, created_at, title, author, collection, genre, tags, cover_url, shelves_json
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      $8,$9,$10,$11,$12,$13,$14,$15,$16,$17
    )
    ON CONFLICT(id) DO UPDATE SET
      book_id=EXCLUDED.book_id,
      event_type=EXCLUDED.event_type,
      from_status=EXCLUDED.from_status,
      to_status=EXCLUDED.to_status,
      from_chapter=EXCLUDED.from_chapter,
      to_chapter=EXCLUDED.to_chapter,
      event_at=EXCLUDED.event_at,
      changed_at=EXCLUDED.changed_at,
      created_at=EXCLUDED.created_at,
      title=EXCLUDED.title,
      author=EXCLUDED.author,
      collection=EXCLUDED.collection,
      genre=EXCLUDED.genre,
      tags=EXCLUDED.tags,
      cover_url=EXCLUDED.cover_url,
      shelves_json=EXCLUDED.shelves_json
  `, [
    id,
    normalized.id,
    eventType,
    fromStatus,
    toStatus,
    fromChapter,
    toChapter,
    timestamp,
    timestamp,
    new Date().toISOString(),
    normalized.title || '',
    normalized.author || '',
    normalized.collection,
    normalized.genre || '',
    normalized.tags || '',
    normalized.cover_url || '',
    JSON.stringify(normalized.shelves),
  ])
}

export async function recordCreateHistory(book, eventAt) {
  await createHistoryEntry({
    book,
    eventType: 'created',
    toStatus: book.status || 'unread',
    toChapter: book.current_chapter || '',
    eventAt: eventAt || book.created_at || book.updated_at,
  })
}

export async function recordStatusHistory(book, fromStatus, toStatus, eventAt) {
  await createHistoryEntry({
    book,
    eventType: 'status_changed',
    fromStatus,
    toStatus,
    fromChapter: book.current_chapter || '',
    toChapter: book.current_chapter || '',
    eventAt: eventAt || book.status_changed_at || book.updated_at,
  })
}

export async function recordChapterHistory(book, fromChapter, toChapter, eventAt) {
  await createHistoryEntry({
    book,
    eventType: 'chapter_progress',
    fromStatus: book.status || 'unread',
    toStatus: book.status || 'unread',
    fromChapter,
    toChapter,
    eventAt: eventAt || book.updated_at,
  })
}

export async function recordBookChanges(previous, next) {
  if (!previous || !next || next.deleted) return
  if ((previous.status || 'unread') !== (next.status || 'unread')) {
    await recordStatusHistory(next, previous.status || 'unread', next.status || 'unread', next.status_changed_at || next.updated_at)
  }
  if ((previous.current_chapter || '') !== (next.current_chapter || '')) {
    await recordChapterHistory(next, previous.current_chapter || '', next.current_chapter || '', next.updated_at)
  }
}

export async function getReadingHistory(page = 1, pageSize = HISTORY_PAGE_SIZE, filters = {}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || HISTORY_PAGE_SIZE)

  const baseParams = []
  const baseWhere = buildHistoryFilter(filters, baseParams)
  const rawCountRows = await runQuery(`SELECT COUNT(*) AS count FROM reading_history WHERE ${baseWhere}`, baseParams)
  const rawCount = Number(rawCountRows[0]?.count || 0)
  const shouldTruncate = !filters.showAll && rawCount > safePageSize * 5
  const cutoff = shouldTruncate
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    : null

  const filteredParams = []
  const filteredWhere = buildHistoryFilter(filters, filteredParams, shouldTruncate, cutoff)
  const totalCountRows = await runQuery(`SELECT COUNT(*) AS count FROM reading_history WHERE ${filteredWhere}`, filteredParams)
  const totalCount = Number(totalCountRows[0]?.count || 0)
  const offset = (safePage - 1) * safePageSize

  const limitPlaceholder = nextPlaceholder(filteredParams, safePageSize)
  const offsetPlaceholder = nextPlaceholder(filteredParams, offset)
  const rows = await runQuery(`
    SELECT *
    FROM reading_history
    WHERE ${filteredWhere}
    ORDER BY COALESCE(event_at, changed_at, created_at) DESC, created_at DESC
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `, filteredParams)

  return {
    entries: rows.map(deserializeHistoryEntry),
    page: safePage,
    pageSize: safePageSize,
    totalCount,
    rawCount,
    totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
    truncatedToRecent: shouldTruncate,
    cutoff,
  }
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16)
  })
}
