import React, { useMemo, useState } from 'react'
import BookCard from './BookCard'
import BookModal from './BookModal'
import RssPanel from './RssPanel'
import { getGenres, getStatuses } from '../constants'

const SORT_OPTIONS = [
  { value: 'rss_date', label: 'Recently Updated' },
  { value: 'updated_at', label: 'Last Modified' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'status', label: 'Status' },
]

const CARD_SIZES = ['compact', 'normal', 'large']
const CARD_MIN = { compact: '90px', normal: '130px', large: '180px' }

export default function CollectionView({
  shelf,
  books,
  loading,
  addBook,
  updateBook,
  deleteBook,
  allBooks,
  shelves,
  cardSize = 'normal',
}) {
  const [modal, setModal] = useState(null)
  const [rssBook, setRssBook] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [sortBy, setSortBy] = useState(shelf.collection === 'web' ? 'rss_date' : 'updated_at')
  const [showR18, setShowR18] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [localCardSize, setLocalCardSize] = useState(cardSize)

  const statuses = getStatuses(shelf.collection)
  const allGenres = useMemo(() => {
    const fromBooks = books.map(book => book.genre).filter(Boolean)
    return [...new Set([...getGenres(shelf.collection), ...fromBooks])].sort((a, b) => a.localeCompare(b))
  }, [books, shelf.collection])
  const rssCount = books.filter(book => book.rss_has_update).length
  const r18Count = books.filter(book => book.is_r18 && !showR18).length

  const filtered = useMemo(() => {
    let result = books.filter(book => !book.is_r18 || showR18)
    if (search) {
      const query = search.toLowerCase()
      result = result.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query) ||
        book.tags?.toLowerCase().includes(query) ||
        book.notes?.toLowerCase().includes(query)
      )
    }
    if (statusFilter) result = result.filter(book => book.status === statusFilter)
    if (genreFilter) result = result.filter(book => book.genre === genreFilter)
    result.sort((a, b) => {
      if (a.rss_has_update !== b.rss_has_update) return a.rss_has_update ? -1 : 1
      if (sortBy === 'rss_date') {
        const aDate = a.rss_last_item_date ? new Date(a.rss_last_item_date).getTime() : 0
        const bDate = b.rss_last_item_date ? new Date(b.rss_last_item_date).getTime() : 0
        return bDate - aDate
      }
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
    })
    return result
  }, [books, genreFilter, search, showR18, sortBy, statusFilter])

  const handleSave = async (bookData) => {
    if (bookData.id && allBooks.find(book => book.id === bookData.id)) {
      await updateBook(bookData.id, bookData)
      return
    }

    await addBook({
      ...bookData,
      collection: shelf.collection,
      shelves: bookData.shelves || (shelf.id === shelf.collection ? [shelf.collection] : [shelf.collection, shelf.id]),
    })
  }

  const handleIncrement = async (id, chapter) => {
    await updateBook(id, { current_chapter: chapter })
  }

  const effectiveCardSize = CARD_SIZES.includes(localCardSize) ? localCardSize : cardSize
  const gridCols = `repeat(auto-fill, minmax(${CARD_MIN[effectiveCardSize]}, 1fr))`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '19px', color: 'var(--text-primary)' }}>{shelf.name}</h2>
            <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              {shelf.description} · {filtered.length} entries
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              title={`Size: ${effectiveCardSize}`}
              onClick={() => setLocalCardSize(size => CARD_SIZES[(CARD_SIZES.indexOf(size) + 1) % CARD_SIZES.length])}
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
            >
              Grid
            </button>
            <button
              onClick={() => setShowFilters(value => !value)}
              style={{ color: showFilters ? 'var(--accent)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 9h10M10 14h4" />
              </svg>
            </button>
            <button onClick={() => setShowSearch(true)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            <button onClick={() => setModal({ isNew: true })} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '22px', height: '22px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
          {rssCount > 0 && (
            <span style={{ fontSize: '11px', background: 'rgba(90,154,110,0.15)', color: '#5a9a6e', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(90,154,110,0.3)' }}>
              {rssCount} new
            </span>
          )}
          {r18Count > 0 && (
            <button
              onClick={() => setShowR18(value => !value)}
              style={{ fontSize: '11px', background: 'rgba(154,64,64,0.1)', color: '#ffaaaa', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(154,64,64,0.3)', cursor: 'pointer' }}
            >
              {showR18 ? 'Hide R18' : `+${r18Count} R18`}
            </button>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Swipe right for +1 · swipe left for RSS</span>
        </div>

        {showSearch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <input
              autoFocus
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search this shelf"
              style={{ flex: 1, background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '10px', padding: '10px 12px', fontSize: '15px', outline: 'none' }}
            />
            <button onClick={() => { setSearch(''); setShowSearch(false) }} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
              Done
            </button>
          </div>
        )}
      </div>

      {showFilters && (
        <div style={{ flexShrink: 0, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {SORT_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  background: sortBy === option.value ? 'rgba(201,135,58,0.15)' : 'var(--bg-overlay)',
                  color: sortBy === option.value ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${sortBy === option.value ? 'rgba(201,135,58,0.4)' : 'var(--border)'}`,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[{ value: '', label: 'All' }, ...statuses].map(status => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(value => value === status.value ? '' : status.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  background: statusFilter === status.value ? `${status.color}22` : 'var(--bg-overlay)',
                  color: statusFilter === status.value ? status.color : 'var(--text-muted)',
                  border: `1px solid ${statusFilter === status.value ? `${status.color}66` : 'var(--border)'}`,
                }}
              >
                {status.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <button
              onClick={() => setGenreFilter('')}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                background: !genreFilter ? 'rgba(201,135,58,0.15)' : 'var(--bg-overlay)',
                color: !genreFilter ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${!genreFilter ? 'rgba(201,135,58,0.4)' : 'var(--border)'}`,
              }}
            >
              Any genre
            </button>
            {allGenres.map(genre => (
              <button
                key={genre}
                onClick={() => setGenreFilter(value => value === genre ? '' : genre)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  background: genreFilter === genre ? 'rgba(201,135,58,0.15)' : 'var(--bg-overlay)',
                  color: genreFilter === genre ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${genreFilter === genre ? 'rgba(201,135,58,0.4)' : 'var(--border)'}`,
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="scroll-area" style={{ flex: 1, padding: '10px 12px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px' }}>
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} style={{ aspectRatio: '2/3', background: 'var(--bg-card)', borderRadius: '12px', opacity: 0.4 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', gap: '12px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>{search || statusFilter || genreFilter ? 'No matches' : 'No books here yet'}</p>
            {!search && !statusFilter && !genreFilter && (
              <button onClick={() => setModal({ isNew: true })} style={{ color: 'var(--accent)', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>
                Add the first book
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px' }}>
            {filtered.map(book => (
              <BookCard
                key={book.id}
                book={book}
                cardSize={effectiveCardSize}
                onTap={() => setModal({ book })}
                onIncrement={handleIncrement}
                onOpenRss={() => setRssBook(book)}
              />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <BookModal
            book={modal.isNew ? null : modal.book}
            collection={modal.isNew ? shelf.collection : modal.book.collection}
            shelf={modal.isNew ? shelf.id : modal.book.shelves?.[0]}
            shelves={shelves}
            allBooks={allBooks}
            onClose={() => setModal(null)}
            onSave={handleSave}
            onDelete={deleteBook}
            onOpenRss={book => setRssBook(book)}
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
