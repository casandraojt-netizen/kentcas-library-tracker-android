import { registerPlugin } from '@capacitor/core'
import { isNative } from './http'

const NativeUpdateNotifications = registerPlugin('UpdateNotifications')

export async function getNotificationStatus(enabled = false) {
  if (isNative()) {
    try {
      return await NativeUpdateNotifications.getStatus()
    } catch (_) {
      return {
        supported: false,
        permission: 'unavailable',
        enabled: false,
      }
    }
  }

  if (typeof Notification === 'undefined') {
    return { supported: false, permission: 'unavailable', enabled: false }
  }

  return {
    supported: true,
    permission: Notification.permission,
    enabled: enabled && Notification.permission === 'granted',
  }
}

export async function requestNotificationPermission() {
  if (isNative()) {
    return NativeUpdateNotifications.requestPermission()
  }

  if (typeof Notification === 'undefined') {
    return { supported: false, permission: 'unavailable', enabled: false }
  }

  const permission = await Notification.requestPermission()
  return {
    supported: true,
    permission,
    enabled: permission === 'granted',
  }
}

export async function syncNotificationFeeds({ enabled, books }) {
  const feeds = books
    .filter(book => book.collection === 'web' && book.rss_feed_url)
    .map(book => ({
      id: book.id,
      title: book.title,
      author: book.author || '',
      feedUrl: book.rss_feed_url,
      sourceUrl: book.source_url || '',
      latestTitle: book.rss_last_item_title || '',
      latestDate: book.rss_last_item_date || '',
      latestUrl: book.rss_last_item_url || '',
      rssHasUpdate: !!book.rss_has_update,
    }))

  if (isNative()) {
    await NativeUpdateNotifications.syncFeeds({ enabled, books: feeds })
    return
  }

  try {
    localStorage.setItem('notification-watchlist', JSON.stringify({ enabled, books: feeds }))
  } catch (_) {}
}

export function notifyBrowserUpdate(book) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const body = book.rss_last_item_title
    ? `${book.title}: ${book.rss_last_item_title}`
    : `New chapter available for ${book.title}`
  new Notification('Library Tracker', { body })
}
