import { useState, useEffect, useCallback } from 'react'
import {
  getBook,
  getBooks,
  updateBook,
  upsertBook,
  deleteBook,
  uuid,
  getNeonUrl,
  recordBookChanges,
  recordCreateHistory,
} from '../db'

export function useBooks(collection) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!getNeonUrl()) { setLoading(false); return }
    try {
      setLoading(true)
      setBooks(await getBooks(collection))
      setError(null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [collection])

  useEffect(() => { fetch() }, [fetch])

  const add = useCallback(async (book) => {
    const now = new Date().toISOString()
    const newBook = {
      ...book,
      id: uuid(),
      collection: book.collection || collection || 'physical',
      created_at: now,
      updated_at: now,
      status_changed_at: book.status_changed_at || now,
    }
    const saved = await upsertBook(newBook)
    await recordCreateHistory(saved, saved.created_at || now)
    await fetch()
    return saved
  }, [collection, fetch])

  const update = useCallback(async (id, updates) => {
    const previous = await getBook(id)
    if (!previous) throw new Error('Book not found: ' + id)
    const saved = await updateBook(id, updates)
    await recordBookChanges(previous, saved)
    setBooks(prev => prev.map(book => book.id === id ? saved : book))
    return saved
  }, [])

  const remove = useCallback(async (id) => {
    await deleteBook(id)
    setBooks(prev => prev.filter(b => b.id !== id))
  }, [])

  return { books, loading, error, refetch: fetch, add, update, remove }
}
