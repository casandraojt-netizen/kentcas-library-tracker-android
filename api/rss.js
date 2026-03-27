module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { feedUrl } = req.body || {}
  if (!feedUrl) return res.status(400).json({ error: 'Missing feedUrl' })

  // Try the URL as-is first, then with www variant if it fails
  const tryFetch = async (url) => {
    return fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    })
  }

  try {
    let response = await tryFetch(feedUrl)

    // If 403, try without query params (some sites block bot-looking params)
    if (response.status === 403) {
      const baseUrl = feedUrl.split('?')[0]
      if (baseUrl !== feedUrl) {
        response = await tryFetch(baseUrl)
      }
    }

    if (!response.ok) {
      // Return specific message for 403 so user knows it's a server block
      if (response.status === 403) {
        return res.status(200).json({
          success: false,
          error: 'SpaceBattles blocked this request (403). RSS feeds from SB/SV may not work in the web app due to bot protection — they work in the desktop app.',
          items: [],
          blocked: true,
        })
      }
      return res.status(200).json({ success: false, error: `Feed returned HTTP ${response.status}`, items: [] })
    }

    const body = await response.text()
    if (!body || body.trim().length === 0) {
      return res.status(200).json({ success: false, error: 'Feed returned no content', items: [] })
    }
    if (body.trimStart().startsWith('<!DOCTYPE') || body.trimStart().startsWith('<html')) {
      return res.status(200).json({ success: false, error: 'Server returned HTML — may be rate-limited or blocked', items: [] })
    }

    const items = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let match
    while ((match = itemRegex.exec(body)) !== null) {
      const block = match[1]
      const getTag = (tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
          || block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'))
        return m ? (m[1] || '').trim() : ''
      }
      const getLinkTag = () => {
        const m1 = block.match(/<link>([^<]+)<\/link>/i)
        if (m1) return m1[1].trim()
        const m2 = block.match(/<link[^>]+href=["']([^"']+)["']/i)
        if (m2) return m2[1].trim()
        const m3 = block.match(/<guid[^>]*>([^<]+)<\/guid>/i)
        if (m3) return m3[1].trim()
        return ''
      }
      const title = getTag('title')
      const pubDate = getTag('pubDate') || getTag('dc:date') || getTag('published')
      const link = getLinkTag()
      if (title) items.push({ title, link, pubDate })
    }

    res.status(200).json({ success: true, items })
  } catch (err) {
    console.error('RSS error:', err.message)
    res.status(200).json({ success: false, error: err.message, items: [] })
  }
}
