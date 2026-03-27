import { useEffect, useState } from 'react'

const DEFAULTS = {
  theme: 'dark',
  cardSize: 'normal',
  customShelves: [],
  notificationsEnabled: false,
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('app-settings')
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  const update = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem('app-settings', JSON.stringify(next))
      } catch (_) {}
      return next
    })
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  return { settings, update }
}
