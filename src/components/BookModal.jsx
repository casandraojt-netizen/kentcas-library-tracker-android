import React, { useMemo, useState } from 'react'
import { getGenres, getShelfLabel, getStatuses } from '../constants'
import { getBookShelves } from '../library'

const TAG_SUGGESTIONS = ['SI', 'Self-Insert', 'OC', 'Gamer', 'System', 'Cultivation', 'Xianxia', 'LitRPG', 'Isekai', 'Reincarnation', 'Progression', 'Dark', 'Comedy', 'Wholesome', 'Romance', 'Completed', 'Ongoing', 'Crossover', 'AU']

export default function BookModal({
  book,
  collection,
  shelf,
  shelves = [],
  onClose,
  onSave,
  onDelete,
  onOpenRss,
  allBooks = [],
}) {
  const isNew = !book?.id
  const [form, setForm] = useState(() => {
    const initialShelves = shelf && shelf !== collection ? [collection, shelf] : [collection]
    return {
      title: '',
      author: '',
      cover_url: '',
      genre: '',
      status: 'unread',
      current_chapter: '',
      total_chapters: '',
      notes: '',
      source_url: '',
      rss_feed_url: '',
      tags: '',
      is_favorite: false,
      is_r18: false,
      web_type: 'novel',
      collection,
      ...(book || {}),
      year: book?.year ?? '',
      shelves: book ? getBookShelves(book) : initialShelves,
    }
  })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDupe, setConfirmDupe] = useState(null)
  const [tab, setTab] = useState('basic')
  const [tagInput, setTagInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const statuses = getStatuses(form.collection)
  const genres = getGenres(form.collection)
  const shelfOptions = useMemo(
    () => shelves.filter(item => item.collection === form.collection && !item.isDefault),
    [form.collection, shelves]
  )
  const tagList = form.tags ? form.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []

  const toggleShelf = (shelfId) => {
    setForm(current => {
      const exists = current.shelves.includes(shelfId)
      const next = exists
        ? current.shelves.filter(item => item !== shelfId)
        : [...current.shelves, shelfId]
      return { ...current, shelves: [current.collection, ...next.filter(item => item && item !== current.collection)] }
    })
  }

  const findDuplicate = () => {
    if (!isNew) return null
    if (form.title.trim()) {
      const match = allBooks.find(item => item.title.trim().toLowerCase() === form.title.trim().toLowerCase())
      if (match) return { field: 'title', book: match }
    }
    if (form.rss_feed_url.trim()) {
      const match = allBooks.find(item => item.rss_feed_url && item.rss_feed_url.trim() === form.rss_feed_url.trim())
      if (match) return { field: 'RSS feed URL', book: match }
    }
    if (form.source_url.trim()) {
      const match = allBooks.find(item => item.source_url && item.source_url.trim() === form.source_url.trim())
      if (match) return { field: 'source URL', book: match }
    }
    return null
  }

  const doSave = async () => {
    setSaving(true)
    try {
      await onSave({
        ...form,
        shelves: [form.collection, ...form.shelves.filter(item => item && item !== form.collection)],
        year: form.year ? parseInt(form.year, 10) : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    if (isNew && !confirmDupe) {
      const duplicate = findDuplicate()
      if (duplicate) {
        setConfirmDupe(duplicate)
        return
      }
    }
    await doSave()
  }

  const addTag = (tag) => {
    const trimmed = tag.trim()
    if (!trimmed || tagList.includes(trimmed)) {
      setTagInput('')
      return
    }
    set('tags', [...tagList, trimmed].join(', '))
    setTagInput('')
    setShowSuggestions(false)
  }

  const removeTag = (tag) => {
    set('tags', tagList.filter(item => item !== tag).join(', '))
  }

  const handleTagKey = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(tagInput)
    } else if (event.key === 'Backspace' && !tagInput && tagList.length) {
      removeTag(tagList[tagList.length - 1])
    }
  }

  const filteredSuggestions = tagInput.trim()
    ? TAG_SUGGESTIONS.filter(tag => tag.toLowerCase().includes(tagInput.toLowerCase()) && !tagList.includes(tag)).slice(0, 5)
    : []

  const inputStyle = {
    background: 'var(--bg-overlay)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '16px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  }
  const Label = ({ text }) => (
    <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
      {text}
    </label>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', paddingTop: 'max(16px, env(safe-area-inset-top))', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>
          ×
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{isNew ? 'Add Book' : 'Edit Book'}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isNew && form.rss_feed_url && onOpenRss && (
            <button onClick={() => { onClose(); onOpenRss(book) }} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }} title="Open RSS Feed">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z" />
              </svg>
            </button>
          )}
          <button onClick={handleSave} disabled={!form.title.trim() || saving} style={{ color: !form.title.trim() || saving ? 'var(--text-muted)' : 'var(--accent)', fontSize: '16px', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>
            {saving ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {confirmDupe && (
        <div style={{ flexShrink: 0, padding: '12px 16px', background: 'rgba(201,135,58,0.1)', borderBottom: '1px solid rgba(201,135,58,0.3)' }}>
          <p style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '8px' }}>
            Same {confirmDupe.field} as existing book: <strong>"{confirmDupe.book.title}"</strong> in {getBookShelves(confirmDupe.book).map(getShelfLabel).join(', ')}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setConfirmDupe(null)} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px' }}>
              Cancel
            </button>
            <button onClick={doSave} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--accent)', color: '#0a0908', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              Add Anyway
            </button>
          </div>
        </div>
      )}

      <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        {['basic', 'details', 'tracking'].map(section => (
          <button
            key={section}
            onClick={() => setTab(section)}
            style={{ flex: 1, padding: '10px 0', textTransform: 'capitalize', fontSize: '13px', color: tab === section ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === section ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: tab === section ? '600' : '400', background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none', cursor: 'pointer' }}
          >
            {section}
          </button>
        ))}
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tab === 'basic' && (
          <>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flexShrink: 0, width: '80px', height: '112px', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-overlay)' }}>
                <img src={form.cover_url || '/book-cover.png'} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={event => { event.target.src = '/book-cover.png' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <Label text="Title *" />
                  <input style={inputStyle} value={form.title} onChange={event => set('title', event.target.value)} placeholder="Book title" />
                </div>
                <div>
                  <Label text="Author" />
                  <input style={inputStyle} value={form.author} onChange={event => set('author', event.target.value)} placeholder="Author name" />
                </div>
              </div>
            </div>

            <div>
              <Label text="Cover Image URL" />
              <input style={inputStyle} value={form.cover_url} onChange={event => set('cover_url', event.target.value)} placeholder="https://..." />
            </div>

            <div>
              <Label text="Status" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {statuses.map(status => (
                  <button
                    key={status.value}
                    onClick={() => set('status', status.value)}
                    style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', background: form.status === status.value ? `${status.color}22` : 'var(--bg-overlay)', color: form.status === status.value ? status.color : 'var(--text-muted)', border: `1px solid ${form.status === status.value ? `${status.color}66` : 'var(--border)'}` }}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label text="Genre" />
              <select style={inputStyle} value={form.genre} onChange={event => set('genre', event.target.value)}>
                <option value="">Select genre</option>
                {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
              </select>
            </div>

            <div>
              <Label text="Shelves" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ padding: '6px 12px', borderRadius: '999px', background: 'rgba(201,135,58,0.15)', color: 'var(--accent)', border: '1px solid rgba(201,135,58,0.35)', fontSize: '12px' }}>
                  {getShelfLabel(form.collection)}
                </span>
                {shelfOptions.map(option => {
                  const active = form.shelves.includes(option.id)
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleShelf(option.id)}
                      style={{ padding: '6px 12px', borderRadius: '999px', background: active ? 'rgba(201,135,58,0.15)' : 'var(--bg-overlay)', color: active ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${active ? 'rgba(201,135,58,0.35)' : 'var(--border)'}`, fontSize: '12px', cursor: 'pointer' }}
                    >
                      {option.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => set('is_favorite', !form.is_favorite)} style={{ flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer', background: form.is_favorite ? 'rgba(240,192,64,0.12)' : 'var(--bg-overlay)', border: `1px solid ${form.is_favorite ? 'rgba(240,192,64,0.4)' : 'var(--border)'}`, color: form.is_favorite ? '#f0c040' : 'var(--text-muted)', fontSize: '13px' }}>
                ★ Favorite
              </button>
              <button onClick={() => set('is_r18', !form.is_r18)} style={{ flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer', background: form.is_r18 ? 'rgba(154,64,64,0.12)' : 'var(--bg-overlay)', border: `1px solid ${form.is_r18 ? 'rgba(154,64,64,0.4)' : 'var(--border)'}`, color: form.is_r18 ? '#ffaaaa' : 'var(--text-muted)', fontSize: '13px' }}>
                R18
              </button>
            </div>
          </>
        )}

        {tab === 'details' && (
          <>
            <div>
              <Label text="Year Published" />
              <input style={inputStyle} type="number" value={form.year} onChange={event => set('year', event.target.value)} placeholder="e.g. 2020" />
            </div>

            {form.collection === 'web' && (
              <>
                <div>
                  <Label text="Type" />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['novel', 'comic', 'manhwa', 'manga'].map(type => (
                      <button
                        key={type}
                        onClick={() => set('web_type', type)}
                        style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', background: form.web_type === type ? 'var(--accent)' : 'var(--bg-overlay)', color: form.web_type === type ? '#0a0908' : 'var(--text-muted)', border: `1px solid ${form.web_type === type ? 'var(--accent)' : 'var(--border)'}` }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label text="Source URL" />
                  <input style={inputStyle} value={form.source_url} onChange={event => set('source_url', event.target.value)} placeholder="https://..." />
                </div>

                <div>
                  <Label text="RSS Feed URL" />
                  <input style={inputStyle} value={form.rss_feed_url} onChange={event => set('rss_feed_url', event.target.value)} placeholder=".../threadmarks.rss?threadmark_category=1" />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Used for NEW badge tracking and notifications</p>
                </div>
              </>
            )}

            <div>
              <Label text="Tags" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px', borderRadius: '10px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', minHeight: '44px', cursor: 'text' }}>
                {tagList.map(tag => (
                  <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(201,135,58,0.15)', color: 'var(--accent)', fontSize: '12px', border: '1px solid rgba(201,135,58,0.3)' }}>
                    {tag}
                    <button onClick={() => removeTag(tag)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={event => { setTagInput(event.target.value); setShowSuggestions(true) }}
                  onKeyDown={handleTagKey}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder={tagList.length === 0 ? 'Type a tag, press Enter...' : ''}
                  style={{ flex: 1, minWidth: '120px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', overflow: 'hidden', marginTop: '4px' }}>
                  {filteredSuggestions.map(tag => (
                    <button key={tag} onClick={() => addTag(tag)} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label text="Notes" />
              <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'none' }} value={form.notes} onChange={event => set('notes', event.target.value)} placeholder="Personal notes..." />
            </div>
          </>
        )}

        {tab === 'tracking' && (
          <>
            <div>
              <Label text="Current Chapter" />
              <input style={inputStyle} value={form.current_chapter} onChange={event => set('current_chapter', event.target.value)} placeholder="e.g. 42, c14, v7c36" />
            </div>

            <div>
              <Label text="Total Chapters" />
              <input style={inputStyle} value={form.total_chapters} onChange={event => set('total_chapters', event.target.value)} placeholder="Total or 'Ongoing'" />
            </div>

            {form.current_chapter && form.total_chapters && !isNaN(parseFloat(form.current_chapter)) && !isNaN(parseFloat(form.total_chapters)) && (
              <div style={{ background: 'var(--bg-overlay)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Progress</span>
                  <span style={{ fontSize: '12px', color: 'var(--accent)' }}>{Math.round((parseFloat(form.current_chapter) / parseFloat(form.total_chapters)) * 100)}%</span>
                </div>
                <div style={{ height: '4px', background: 'var(--border)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (parseFloat(form.current_chapter) / parseFloat(form.total_chapters)) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: '9999px' }} />
                </div>
              </div>
            )}
          </>
        )}

        {!isNew && (
          <button onClick={async () => { if (!confirmDelete) { setConfirmDelete(true); return } await onDelete(book.id); onClose() }} style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', color: confirmDelete ? '#f0a0a0' : 'var(--text-muted)', background: confirmDelete ? 'rgba(154,64,64,0.15)' : 'var(--bg-overlay)', border: '1px solid var(--border)', fontSize: '14px', marginTop: '8px' }}>
            {confirmDelete ? 'Tap again to confirm delete' : 'Delete Book'}
          </button>
        )}
      </div>
    </div>
  )
}
