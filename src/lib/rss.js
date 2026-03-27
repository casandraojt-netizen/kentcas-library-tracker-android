import { isNative, nativeFetch } from './http'

export function parseRssItems(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const getTag = (tag) => {
      const found = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
        || block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'))
      return found ? (found[1] || '').trim() : ''
    }
    const getLinkTag = () => {
      const direct = block.match(/<link>([^<]+)<\/link>/i)
      if (direct) return direct[1].trim()
      const href = block.match(/<link[^>]+href=["']([^"']+)["']/i)
      if (href) return href[1].trim()
      const guid = block.match(/<guid[^>]*>([^<]+)<\/guid>/i)
      if (guid) return guid[1].trim()
      return ''
    }

    const title = getTag('title')
    const pubDate = getTag('pubDate') || getTag('dc:date') || getTag('published')
    const link = getLinkTag()
    if (title) items.push({ title, link, pubDate })
  }

  return items
}

async function fetchViaProxy(feedUrl) {
  const response = await fetch('/api/rss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedUrl }),
  })
  const data = await response.json()
  if (!data.success || !data.items?.length) {
    throw new Error(data.error || 'Could not load feed')
  }
  return data.items
}

export async function fetchRssItems(feedUrl) {
  if (!feedUrl) throw new Error('No RSS feed URL set.')

  try {
    const response = await nativeFetch(feedUrl, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    })

    if (!response.ok) {
      if (!isNative()) return fetchViaProxy(feedUrl)
      throw new Error(`Feed returned HTTP ${response.status}`)
    }

    const text = await response.text()
    if (!text || text.trim().length === 0) {
      if (!isNative()) return fetchViaProxy(feedUrl)
      throw new Error('Feed returned no content')
    }
    if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
      if (!isNative()) return fetchViaProxy(feedUrl)
      throw new Error('Server returned HTML')
    }

    const parsed = parseRssItems(text)
    if (parsed.length === 0) {
      if (!isNative()) return fetchViaProxy(feedUrl)
      throw new Error('No chapters found in feed')
    }
    return parsed
  } catch (error) {
    if (!isNative()) return fetchViaProxy(feedUrl)
    throw error
  }
}

export async function getLatestRssItem(feedUrl) {
  const items = await fetchRssItems(feedUrl)
  return items[0] || null
}
