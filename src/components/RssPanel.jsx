import React, { useEffect, useState } from 'react'
import { fetchRssItems } from '../lib/rss'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  if (days > 30) return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'just now'
}

function ChapterRow({ title, link, pubDate, isLatest }) {
  const inner = (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
        {isLatest && <span style={{ fontSize: '9px', background: 'rgba(201,135,58,0.2)', color: 'var(--accent)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0, fontWeight: '600' }}>LATEST</span>}
        <p style={{ fontSize: '14px', fontWeight: '500', color: isLatest ? 'var(--accent-light)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{title}</p>
      </div>
      {pubDate && <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{timeAgo(pubDate)}</p>}
    </div>
  )

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
        {inner}
        <span style={{ color: 'var(--text-muted)', fontSize: '16px', flexShrink: 0 }}>↗</span>
      </a>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      {inner}
    </div>
  )
}

export default function RssPanel({ book, onClose, onMarkRead }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!book.rss_feed_url) {
      setLoading(false)
      setError('No RSS feed URL set.')
      return
    }
    loadFeed()
  }, [book.id])

  const loadFeed = async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await fetchRssItems(book.rss_feed_url))
    } catch (e) {
      setItems([])
      setError('Could not load feed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const hasStoredData = book.rss_last_item_title
  const storedUrl = book.rss_last_item_url || book.source_url || ''

  const getThreadmarksUrl = () => {
    if (!book.rss_feed_url) return book.source_url || ''
    try {
      const url = new URL(book.rss_feed_url)
      const path = url.pathname.replace('/threadmarks.rss', '/threadmarks').replace('.rss', '')
      return url.origin + path
    } catch {
      return book.source_url || ''
    }
  }

  const threadmarksUrl = getThreadmarksUrl()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', paddingTop: 'max(16px, env(safe-area-inset-top))', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{book.title}</p>
          <p style={{ fontSize: '11px', color: 'var(--accent)', margin: 0 }}>RSS Feed · {items.length} chapters</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {book.rss_has_update && onMarkRead && (
            <button onClick={() => { onMarkRead(book.id); onClose() }} style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(90,154,110,0.15)', border: '1px solid rgba(90,154,110,0.4)', color: '#5a9a6e', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Mark Read
            </button>
          )}
          <button onClick={loadFeed} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>↻</button>
        </div>
      </div>

      <div className="scroll-area" style={{ flex: 1 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading feed...</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Live feed unavailable, showing the last saved feed state</p>
            </div>
            {hasStoredData ? (
              <ChapterRow title={book.rss_last_item_title} link={storedUrl} pubDate={book.rss_last_item_date} isLatest={true} />
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No saved feed data yet for this story.</p>
              </div>
            )}
            {(threadmarksUrl || book.source_url) && (
              <a href={threadmarksUrl || book.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
                <p style={{ fontSize: '13px', color: 'var(--accent)', margin: 0 }}>
                  {threadmarksUrl ? 'Open threadmarks page ↗' : 'Open story page ↗'}
                </p>
              </a>
            )}
          </div>
        )}

        {!loading && !error && items.map((item, index) => (
          <ChapterRow key={index} title={item.title} link={item.link} pubDate={item.pubDate} isLatest={index === 0} />
        ))}
      </div>
    </div>
  )
}
