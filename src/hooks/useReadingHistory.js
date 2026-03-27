import { useCallback, useEffect, useState } from 'react'
import { getReadingHistory } from '../db'

export function useReadingHistory(page = 1, pageSize = 20, filters = {}) {
  const [history, setHistory] = useState({
    entries: [],
    page,
    pageSize,
    totalPages: 1,
    totalCount: 0,
    rawCount: 0,
    truncatedToRecent: false,
    cutoff: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setHistory(await getReadingHistory(page, pageSize, filters))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return { history, loading, error, refetch: fetchHistory }
}
