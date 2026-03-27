import React, { useEffect, useMemo, useRef, useState } from 'react'
import { clearNeonUrl, hasNeonUrl } from './db'
import CollectionView from './components/CollectionView'
import ReadingHistoryView from './components/ReadingHistoryView'
import SearchView from './components/SearchView'
import Setup from './components/Setup'
import ShelfModal from './components/ShelfModal'
import { DEFAULT_SHELVES, getCollectionLabel } from './constants'
import { useBooks } from './hooks/useBooks'
import { useReadingHistory } from './hooks/useReadingHistory'
import { useSettings } from './hooks/useSettings'
import { getNotificationStatus, notifyBrowserUpdate, requestNotificationPermission, syncNotificationFeeds } from './lib/updateNotifications'
import { refreshRssFeeds } from './lib/rssPoller'
import { buildShelves, getBooksInShelf } from './library'

function StatsView({ books, shelves }) {
  const stats = [
    { label: 'Total', value: books.length, color: 'var(--accent)' },
    { label: 'Reading', value: books.filter(book => book.status === 'reading').length, color: '#c9873a' },
    { label: 'Finished', value: books.filter(book => book.status === 'finished').length, color: '#5a9a6e' },
    { label: 'Favorites', value: books.filter(book => book.is_favorite).length, color: '#f0c040' },
    { label: 'Physical', value: books.filter(book => book.collection === 'physical').length, color: '#4a7a9a' },
    { label: 'Web', value: books.filter(book => book.collection === 'web').length, color: '#7a6a3a' },
  ]

  return (
    <div className="scroll-area" style={{ flex: 1, padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {stats.map(stat => (
          <div key={stat.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Shelf Counts</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          {shelves.map(shelf => (
            <div key={shelf.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)' }}>{shelf.name}</p>
                {!shelf.isDefault && <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--text-muted)' }}>{getCollectionLabel(shelf.collection)}</p>}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--accent)' }}>{shelf.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingsView({ settings, updateSettings, shelves, onCreateShelf, onDisconnect, notificationState, onConfigureNotifications }) {
  const cardSizes = ['compact', 'normal', 'large']

  return (
    <div className="scroll-area" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Settings</h2>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 10px' }}>Appearance</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {['dark', 'light'].map(theme => (
            <button
              key={theme}
              onClick={() => updateSettings('theme', theme)}
              style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', background: settings.theme === theme ? 'rgba(201,135,58,0.15)' : 'var(--bg-overlay)', border: `1px solid ${settings.theme === theme ? 'rgba(201,135,58,0.4)' : 'var(--border)'}`, color: settings.theme === theme ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
            >
              {theme === 'dark' ? 'Dark theme' : 'Light theme'}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px' }}>Card size</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {cardSizes.map(size => (
            <button
              key={size}
              onClick={() => updateSettings('cardSize', size)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '10px', background: settings.cardSize === size ? 'rgba(201,135,58,0.15)' : 'var(--bg-overlay)', border: `1px solid ${settings.cardSize === size ? 'rgba(201,135,58,0.4)' : 'var(--border)'}`, color: settings.cardSize === size ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize' }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px' }}>Shelves</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>Books can live in multiple shelves while keeping their physical/web collection.</p>
        <button onClick={onCreateShelf} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(201,135,58,0.12)', border: '1px solid rgba(201,135,58,0.3)', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer' }}>
          Create shelf
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
          {shelves.map(shelf => (
            <span key={shelf.id} style={{ padding: '4px 8px', borderRadius: '999px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px' }}>
              {shelf.name}
            </span>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>Notifications</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          Alert when a web book flips into a NEW state. Current status: {notificationState.label}
        </p>
        <button onClick={onConfigureNotifications} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(90,154,110,0.12)', border: '1px solid rgba(90,154,110,0.3)', color: '#5a9a6e', fontSize: '14px', cursor: 'pointer' }}>
          {notificationState.actionLabel}
        </button>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Database</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Connected to Neon PostgreSQL</p>
        <button onClick={onDisconnect} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(154,64,64,0.1)', border: '1px solid rgba(154,64,64,0.3)', color: '#f0a0a0', fontSize: '14px', cursor: 'pointer' }}>
          Disconnect & Change Database
        </button>
      </div>
    </div>
  )
}

const NAV = [
  { id: 'library', label: 'Library' },
  { id: 'search', label: 'Search' },
  { id: 'history', label: 'History' },
  { id: 'stats', label: 'Stats' },
  { id: 'settings', label: 'Settings' },
]

function describeNotificationState(status, enabledRequested) {
  if (!status.supported) {
    return { ...status, label: 'Not supported on this device', actionLabel: 'Unavailable' }
  }
  if (status.permission !== 'granted') {
    return { ...status, label: 'Permission not granted', actionLabel: 'Enable alerts' }
  }
  if (enabledRequested && status.enabled) {
    return { ...status, label: `Watching ${status.watchCount || 0} feeds`, actionLabel: 'Disable alerts' }
  }
  return { ...status, label: 'Permission granted, alerts off', actionLabel: 'Enable alerts' }
}

function LibraryApp() {
  const { settings, update: updateSettings } = useSettings()
  const [view, setView] = useState('library')
  const [activeShelfId, setActiveShelfId] = useState('physical')
  const [showCreateShelf, setShowCreateShelf] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyFilters, setHistoryFilters] = useState({
    search: '',
    shelf: '',
    genre: '',
    tag: '',
    eventTypes: [],
    showAll: false,
  })
  const [notificationState, setNotificationState] = useState({
    supported: false,
    enabled: false,
    label: 'Not configured',
    actionLabel: 'Check permission',
  })
  const previousUpdatesRef = useRef(new Map())
  const allBooksRef = useRef([])
  const rssCheckRunningRef = useRef(false)

  const booksStore = useBooks()
  const historyStore = useReadingHistory(historyPage, 20, historyFilters)
  const allBooks = booksStore.books

  const shelves = useMemo(() => buildShelves(allBooks, settings.customShelves), [allBooks, settings.customShelves])
  const currentShelf = useMemo(() => {
    const fallback = shelves[0] || DEFAULT_SHELVES[0]
    return shelves.find(shelf => shelf.id === activeShelfId) || fallback
  }, [activeShelfId, shelves])
  const currentShelfBooks = useMemo(() => getBooksInShelf(allBooks, currentShelf.id), [allBooks, currentShelf.id])
  const historyGenres = useMemo(() => [...new Set(allBooks.map(book => book.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [allBooks])
  const totalRssUpdates = allBooks.filter(book => book.rss_has_update).length

  useEffect(() => {
    allBooksRef.current = allBooks
  }, [allBooks])

  useEffect(() => {
    if (!shelves.find(shelf => shelf.id === activeShelfId)) {
      setActiveShelfId(shelves[0]?.id || 'physical')
    }
  }, [activeShelfId, shelves])

  useEffect(() => {
    setHistoryPage(1)
  }, [historyFilters])

  useEffect(() => {
    let active = true
    getNotificationStatus(settings.notificationsEnabled).then(status => {
      if (active) setNotificationState(describeNotificationState(status, settings.notificationsEnabled))
    })
    return () => { active = false }
  }, [settings.notificationsEnabled])

  useEffect(() => {
    syncNotificationFeeds({
      enabled: settings.notificationsEnabled,
      books: allBooks,
    }).then(() => getNotificationStatus(settings.notificationsEnabled)).then(status => {
      setNotificationState(describeNotificationState(status, settings.notificationsEnabled))
    }).catch(() => {})
  }, [allBooks, settings.notificationsEnabled])

  useEffect(() => {
    for (const book of allBooks) {
      const previous = previousUpdatesRef.current.get(book.id)
      if (settings.notificationsEnabled && notificationState.permission === 'granted' && book.rss_has_update && !previous?.rss_has_update) {
        notifyBrowserUpdate(book)
      }
    }

    previousUpdatesRef.current = new Map(
      allBooks.map(book => [book.id, { rss_has_update: book.rss_has_update }])
    )
  }, [allBooks, notificationState.permission, settings.notificationsEnabled])

  const refreshAll = async () => {
    await booksStore.refetch()
    await runRssCheck(true)
    if (view === 'history') await historyStore.refetch()
  }

  const refreshAfterMutation = async () => {
    await booksStore.refetch()
    await historyStore.refetch()
  }

  const handleAddBook = async (book) => {
    const saved = await booksStore.add(book)
    await refreshAfterMutation()
    return saved
  }

  const handleUpdateBook = async (id, updates, options = {}) => {
    const saved = await booksStore.update(id, updates)
    if (!options.skipRefresh) await refreshAfterMutation()
    return saved
  }

  const handleDeleteBook = async (id) => {
    await booksStore.remove(id)
    await refreshAfterMutation()
  }

  const handleCreateShelf = ({ name, collection }) => {
    updateSettings('customShelves', [...settings.customShelves, { name, collection }])
    setShowCreateShelf(false)
    setView('library')
    setActiveShelfId(name)
  }

  const handleConfigureNotifications = async () => {
    if (settings.notificationsEnabled) {
      updateSettings('notificationsEnabled', false)
      return
    }

    const permission = await requestNotificationPermission()
    if (permission.permission === 'granted') {
      updateSettings('notificationsEnabled', true)
      setNotificationState(describeNotificationState({ ...permission, enabled: true }, true))
    } else {
      setNotificationState(describeNotificationState(permission, false))
    }
  }

  const runRssCheck = async (force = false) => {
    if (rssCheckRunningRef.current) return
    rssCheckRunningRef.current = true
    try {
      await refreshRssFeeds(allBooksRef.current, handleUpdateBook, { force })
    } finally {
      rssCheckRunningRef.current = false
    }
  }

  useEffect(() => {
    if (booksStore.loading || !allBooks.length) return
    runRssCheck(true)
    const intervalId = window.setInterval(() => {
      runRssCheck(false)
    }, 15 * 60 * 1000)
    return () => window.clearInterval(intervalId)
  }, [booksStore.loading, allBooks.length])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', paddingTop: 'max(16px, env(safe-area-inset-top))', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-light)', lineHeight: 1 }}>Library</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {view === 'library' ? `${currentShelf.name} · ${currentShelfBooks.length} books` : `${allBooks.length} books total`}
          </div>
        </div>
        <button onClick={refreshAll} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {view === 'library' && (
        <div style={{ flexShrink: 0, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {shelves.map(shelf => {
              const shelfBooks = getBooksInShelf(allBooks, shelf.id)
              const badge = shelf.collection === 'web' ? shelfBooks.filter(book => book.rss_has_update).length : 0
              return (
                <button
                  key={shelf.id}
                  onClick={() => setActiveShelfId(shelf.id)}
                  style={{ padding: '8px 12px', borderRadius: '999px', whiteSpace: 'nowrap', cursor: 'pointer', background: currentShelf.id === shelf.id ? 'rgba(201,135,58,0.15)' : 'var(--bg-overlay)', color: currentShelf.id === shelf.id ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${currentShelf.id === shelf.id ? 'rgba(201,135,58,0.4)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <span>{shelf.name}</span>
                  <span style={{ color: currentShelf.id === shelf.id ? 'var(--accent)' : 'var(--text-secondary)' }}>{shelfBooks.length}</span>
                  {badge > 0 && <span style={{ color: '#5a9a6e' }}>{badge}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {view === 'library' && (
          <CollectionView
            key={currentShelf.id}
            shelf={currentShelf}
            books={currentShelfBooks}
            loading={booksStore.loading}
            addBook={handleAddBook}
            updateBook={handleUpdateBook}
            deleteBook={handleDeleteBook}
            allBooks={allBooks}
            shelves={shelves}
            cardSize={settings.cardSize}
          />
        )}
        {view === 'search' && (
          <SearchView
            books={allBooks}
            loading={booksStore.loading}
            shelves={shelves}
            cardSize={settings.cardSize}
            updateBook={handleUpdateBook}
            deleteBook={handleDeleteBook}
          />
        )}
        {view === 'history' && (
          <ReadingHistoryView
            history={historyStore.history}
            loading={historyStore.loading}
            error={historyStore.error}
            page={historyPage}
            onPageChange={setHistoryPage}
            filters={historyFilters}
            onFiltersChange={setHistoryFilters}
            shelves={shelves}
            genres={historyGenres}
          />
        )}
        {view === 'stats' && <StatsView books={allBooks} shelves={shelves} />}
        {view === 'settings' && (
          <SettingsView
            settings={settings}
            updateSettings={updateSettings}
            shelves={shelves}
            onCreateShelf={() => setShowCreateShelf(true)}
            onDisconnect={() => { clearNeonUrl(); window.location.reload() }}
            notificationState={notificationState}
            onConfigureNotifications={handleConfigureNotifications}
          />
        )}
      </div>

      <div style={{ flexShrink: 0, display: 'flex', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0', gap: '2px', position: 'relative', color: view === item.id ? 'var(--accent)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '10px', fontWeight: view === item.id ? '600' : '400' }}>{item.label}</span>
            {item.id === 'search' && totalRssUpdates > 0 && (
              <span style={{ position: 'absolute', top: '4px', left: 'calc(50% + 14px)', minWidth: '16px', height: '16px', padding: '0 4px', borderRadius: '50%', background: '#5a9a6e', color: '#fff', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {totalRssUpdates}
              </span>
            )}
          </button>
        ))}
      </div>

      {showCreateShelf && (
        <ShelfModal existingShelves={shelves} onClose={() => setShowCreateShelf(false)} onCreate={handleCreateShelf} />
      )}
    </div>
  )
}

export default function App() {
  const [connected, setConnected] = useState(hasNeonUrl())
  if (!connected) return <Setup onComplete={() => setConnected(true)} />
  return <LibraryApp />
}
