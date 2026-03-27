import { getLatestRssItem } from './rss'

const ACTIVE_STATUSES = ['reading', 'waiting']
const ACTIVE_INTERVAL_MS = 15 * 60 * 1000
const INACTIVE_INTERVAL_MS = 12 * 60 * 60 * 1000
const BATCH_SIZE = 4
const BATCH_DELAY_MS = 2000

function normalizeDate(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function shouldCheckBook(book, force) {
  if (!book?.rss_feed_url) return false
  if (force) return true

  const lastChecked = book.rss_last_checked ? new Date(book.rss_last_checked).getTime() : 0
  if (!lastChecked || Number.isNaN(lastChecked)) return true

  const interval = ACTIVE_STATUSES.includes(book.status) ? ACTIVE_INTERVAL_MS : INACTIVE_INTERVAL_MS
  return Date.now() - lastChecked >= interval
}

async function processBook(book, updateBook) {
  const latestItem = await getLatestRssItem(book.rss_feed_url)
  if (!latestItem?.title) return false

  const latestTitle = latestItem.title || ''
  const latestDate = normalizeDate(latestItem.pubDate)
  const latestUrl = latestItem.link || ''
  const nextUpdates = {
    rss_last_item_title: latestTitle,
    rss_last_item_date: latestDate,
    rss_last_item_url: latestUrl,
    rss_last_checked: new Date().toISOString(),
  }

  if (!book.rss_last_item_title) {
    await updateBook(book.id, { ...nextUpdates, rss_has_update: false }, { skipRefresh: true })
    return false
  }

  if (latestTitle !== book.rss_last_item_title) {
    await updateBook(book.id, { ...nextUpdates, rss_has_update: true }, { skipRefresh: true })
    return true
  }

  await updateBook(book.id, { ...nextUpdates, rss_has_update: !!book.rss_has_update }, { skipRefresh: true })
  return false
}

export async function refreshRssFeeds(books, updateBook, { force = false } = {}) {
  const candidates = books.filter(book => shouldCheckBook(book, force))
  let updatesFound = 0

  for (let index = 0; index < candidates.length; index += BATCH_SIZE) {
    const batch = candidates.slice(index, index + BATCH_SIZE)
    const results = await Promise.all(batch.map(async book => {
      try {
        return await processBook(book, updateBook)
      } catch (_) {
        return false
      }
    }))
    updatesFound += results.filter(Boolean).length

    if (index + BATCH_SIZE < candidates.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  return { checked: candidates.length, updatesFound }
}
