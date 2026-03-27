import React, { useState } from 'react'
import { setNeonUrl, testConnection, clearNeonUrl } from '../db'

export default function Setup({ onComplete }) {
  const [url, setUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    if (!url.trim()) return
    setTesting(true); setError('')
    try {
      setNeonUrl(url.trim())
      await testConnection()
      onComplete()
    } catch (e) {
      clearNeonUrl()
      setError(e.message || 'Could not connect. Check your connection string.')
    } finally { setTesting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-base)', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>📚</div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--accent-light)', marginBottom: '8px' }}>Library Tracker</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Connect your Neon database to sync your library across devices
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Neon Connection String
          </label>
          <textarea value={url} onChange={e => setUrl(e.target.value)}
            placeholder="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
            style={{ width: '100%', background: 'var(--bg-overlay)', border: `1px solid ${error ? 'rgba(154,64,64,0.5)' : 'var(--border)'}`, color: 'var(--text-primary)', borderRadius: '12px', padding: '12px', fontSize: '13px', resize: 'none', height: '90px', outline: 'none', fontFamily: 'monospace', lineHeight: '1.5', boxSizing: 'border-box' }} />
          {error && (
            <div style={{ background: 'rgba(154,64,64,0.1)', border: '1px solid rgba(154,64,64,0.3)', borderRadius: '10px', padding: '10px 12px' }}>
              <p style={{ fontSize: '12px', color: '#f0a0a0', lineHeight: '1.5' }}>{error}</p>
            </div>
          )}
          <button onClick={handleConnect} disabled={!url.trim() || testing}
            style={{ padding: '14px', borderRadius: '12px', background: !url.trim() || testing ? 'var(--bg-overlay)' : 'var(--accent)', color: !url.trim() || testing ? 'var(--text-muted)' : '#0a0908', fontSize: '16px', fontWeight: '700', border: 'none', cursor: !url.trim() || testing ? 'default' : 'pointer' }}>
            {testing ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Use the same connection string from your desktop app's <code style={{ color: 'var(--accent)', fontSize: '11px' }}>.env</code> file. Your URL is stored only on this device.
          </p>
        </div>
      </div>
    </div>
  )
}
