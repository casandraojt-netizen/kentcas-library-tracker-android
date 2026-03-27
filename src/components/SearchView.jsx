import React, { useMemo, useState } from 'react'
import BookCard from './BookCard'
import BookModal from './BookModal'
import RssPanel from './RssPanel'
import { getShelfLabel } from '../constants'
import { getBookShelves } from '../library'

const COLLECTION_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'physical', label: 'Physical' },
  { value: 'web', label: 'Web' },
  { value: 'updates', label: 'NEW only' },
]

const CARD_MIN = { compact: '90px', normal: '130px', large: '180px' }

export default function SearchView({ books, loading, shelves, cardSize = 'normal', updateBook, deleteBook }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [modalBook, setModalBook] = useState(null)
  const [rssBook, setRssBook] = useState(null)

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return books
      .filter(book => {
        if (filter === 'physical' && book.collection !== 'physical') return false
        if (filter === 'web' && book.collection !== 'web') return false
        if (filter === 'updates' && !book.rss_has_update) return false
        if (!lowered) return true
        const shelvesText = getBookShelves(book).map(getShelfLabel).join(' ').toLowerCase()
        return [
          book.title,
          book.author,
          book.tags,
          book.notes,
          book.genre,
          book.source_url,
          shelvesText,
        ].some(value => String(value || '').toLowerCase().includes(lowered))
      })
      .sort((a, b) => {
        if (a.rss_has_update !== b.rss_has_update) return a.rss_has_update ? -1 : 1
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
      })
  }, [books, filter, query])

  const gridCols = `repeat(auto-fill, minmax(${CARD_MIN[cardSize] || CARD_MIN.normal}, 1fr))`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <h2 style={{ margin: 0, fontSize: '19px', color: 'var(--text-primary)' }}>Search Library</h2>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Search across every shelf and collection at once</p>
        <input
          autoFocus
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Title, author, tags, shelf..."
          style={{ marginTop: '12px', width: '100%', background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '12px', padding: '12px 14px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', marginTop: '10px' }}>
          {COLLECTION_FILTERS.map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              style={{ padding: '5px 10px', borderRadius: '999px', whiteSpace: 'nowrap', cursor: 'pointer', background: filter === option.value ? 'rgba(201,135,58,0.15)' : 'var(--bg-overlay)', color: filter === option.value ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${filter === option.value ? 'rgba(201,135,58,0.35)' : 'var(--border)'}`, fontSize: '12px' }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: '12px 14px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px' }}>
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} style={{ aspectRatio: '2/3', background: 'var(--bg-card)', borderRadius: '12px', opacity: 0.4 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No books match this search.
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted)' }}>{filtered.length} matches</p>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px' }}>
              {filtered.map(book => (
                <div key={book.id}>
                  <BookCard
                    book={book}
                    cardSize={cardSize}
                    onTap={() => setModalBook(book)}
                    onIncrement={(id, chapter) => updateBook(id, { current_chapter: chapter })}
                    onOpenRss={() => setRssBook(book)}
                  />
                  <div style={{ padding: '6px 2px 0' }}>
                    <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getBookShelves(book).map(getShelfLabel).join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalBook && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <BookModal
            book={modalBook}
            collection={modalBook.collection}
            shelf={modalBook.shelves?.[0]}
            shelves={shelves}
            allBooks={books}
            onClose={() => setModalBook(null)}
            onSave={(data) => updateBook(modalBook.id, data)}
            onDelete={deleteBook}
            onOpenRss={(book) => setRssBook(book)}
          />
        </div>
      )}

      {rssBook && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <RssPanel
            book={rssBook}
            onClose={() => setRssBook(null)}
            onMarkRead={id => updateBook(id, { rss_has_update: false })}
          />
        </div>
      )}
    </div>
  )
}
