import React from 'react'
import { getShelfLabel, getStatusInfo } from '../constants'

function formatTimestamp(value) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ReadingHistoryView({
  history,
  loading,
  error,
  page,
  onPageChange,
  filters,
  onFiltersChange,
  shelves,
  genres,
}) {
  const toggleEventType = (eventType) => {
    const exists = filters.eventTypes.includes(eventType)
    const next = exists
      ? filters.eventTypes.filter(item => item !== eventType)
      : [...filters.eventTypes, eventType]
    onFiltersChange({ ...filters, eventTypes: next })
  }

  const inputStyle = {
    background: 'var(--bg-overlay)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <h2 style={{ margin: 0, fontSize: '19px', color: 'var(--text-primary)' }}>Reading History</h2>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Chapter progress and status changes synced from your library</p>
        {history.truncatedToRecent && (
          <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(201,135,58,0.08)', border: '1px solid rgba(201,135,58,0.25)', color: 'var(--text-secondary)', fontSize: '12px' }}>
            Showing the past 30 days because this view exceeds five pages. Turn on full history to see everything.
          </div>
        )}
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          value={filters.search}
          onChange={event => onFiltersChange({ ...filters, search: event.target.value })}
          placeholder="Search title or author"
          style={inputStyle}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
          <select value={filters.shelf} onChange={event => onFiltersChange({ ...filters, shelf: event.target.value })} style={inputStyle}>
            <option value="">All shelves</option>
            {shelves.map(shelf => <option key={shelf.id} value={shelf.id}>{shelf.name}</option>)}
          </select>
          <select value={filters.genre} onChange={event => onFiltersChange({ ...filters, genre: event.target.value })} style={inputStyle}>
            <option value="">All genres</option>
            {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
          </select>
        </div>

        <input
          value={filters.tag}
          onChange={event => onFiltersChange({ ...filters, tag: event.target.value })}
          placeholder="Filter by tag"
          style={inputStyle}
        />

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            ['created', 'Added'],
            ['status_changed', 'Status'],
            ['chapter_progress', 'Chapter'],
          ].map(([value, label]) => {
            const active = filters.eventTypes.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleEventType(value)}
                style={{ padding: '5px 10px', borderRadius: '999px', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'rgba(201,135,58,0.14)' : 'var(--bg-overlay)', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
              >
                {label}
              </button>
            )
          })}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={filters.showAll} onChange={event => onFiltersChange({ ...filters, showAll: event.target.checked })} />
            Full history
          </label>
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} style={{ height: '86px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 0.5 }} />
          ))
        ) : error ? (
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(154,64,64,0.1)', border: '1px solid rgba(154,64,64,0.3)', color: '#f0a0a0', fontSize: '12px' }}>
            {error}
          </div>
        ) : history.entries.length === 0 ? (
          <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No history entries match these filters.
          </div>
        ) : (
          history.entries.map(entry => {
            const fromStatus = entry.from_status ? getStatusInfo(entry.from_status) : null
            const toStatus = entry.to_status ? getStatusInfo(entry.to_status) : null
            return (
              <div key={entry.id} style={{ borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px', display: 'flex', gap: '12px' }}>
                <div style={{ width: '44px', height: '62px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-overlay)' }}>
                  {entry.cover_url ? <img src={entry.cover_url} alt={entry.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</p>
                      {entry.author && <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.author}</p>}
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '10px', textAlign: 'right', flexShrink: 0 }}>{formatTimestamp(entry.event_at)}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {entry.event_type === 'created' && (
                      <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(201,135,58,0.12)', color: 'var(--accent)', border: '1px solid rgba(201,135,58,0.25)', fontSize: '11px' }}>
                        Added to library
                      </span>
                    )}
                    {entry.event_type === 'status_changed' && fromStatus && toStatus && (
                      <>
                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: `${fromStatus.color}22`, color: fromStatus.color, border: `1px solid ${fromStatus.color}44`, fontSize: '11px' }}>{fromStatus.label}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: `${toStatus.color}22`, color: toStatus.color, border: `1px solid ${toStatus.color}44`, fontSize: '11px' }}>{toStatus.label}</span>
                      </>
                    )}
                    {entry.event_type === 'chapter_progress' && (
                      <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(201,135,58,0.12)', color: 'var(--accent)', border: '1px solid rgba(201,135,58,0.25)', fontSize: '11px' }}>
                        {entry.from_chapter || 'start'} → {entry.to_chapter || 'unknown'}
                      </span>
                    )}
                    {entry.shelves.map(shelf => (
                      <span key={shelf} style={{ padding: '2px 8px', borderRadius: '999px', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: '11px' }}>
                        {getShelfLabel(shelf)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {history.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Page {page} of {history.totalPages}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', fontSize: '12px', opacity: page <= 1 ? 0.45 : 1, cursor: page <= 1 ? 'default' : 'pointer' }}>
                Previous
              </button>
              <button onClick={() => onPageChange(page + 1)} disabled={page >= history.totalPages} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', fontSize: '12px', opacity: page >= history.totalPages ? 0.45 : 1, cursor: page >= history.totalPages ? 'default' : 'pointer' }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
