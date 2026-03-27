import React, { useState } from 'react'
import { getCollectionLabel } from '../constants'

export default function ShelfModal({ existingShelves, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [collection, setCollection] = useState('physical')
  const [error, setError] = useState('')

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Shelf name is required.')
      return
    }
    const duplicate = existingShelves.some(shelf =>
      shelf.name.toLowerCase() === trimmed.toLowerCase() || shelf.id.toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) {
      setError('A shelf with that name already exists.')
      return
    }
    onCreate({ name: trimmed, collection })
  }

  const buttonStyle = (active) => ({
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(201,135,58,0.14)' : 'var(--bg-overlay)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '360px', borderRadius: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }} onClick={event => event.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Create Shelf</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 0, cursor: 'pointer', fontSize: '20px' }}>
            ×
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'block' }}>Shelf Name</label>
            <input
              autoFocus
              value={name}
              onChange={event => { setName(event.target.value); setError('') }}
              placeholder='e.g. "To Buy"'
              style={{ width: '100%', background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'block' }}>Shelf Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['physical', 'web'].map(type => (
                <button key={type} type="button" onClick={() => setCollection(type)} style={buttonStyle(collection === type)}>
                  {getCollectionLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(154,64,64,0.1)', border: '1px solid rgba(154,64,64,0.3)', color: '#f0a0a0', fontSize: '12px' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleCreate} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--accent)', background: 'var(--accent)', color: '#0a0908', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            Create Shelf
          </button>
        </div>
      </div>
    </div>
  )
}
