'use client'

import { User } from '@/lib/types'

interface Props {
  users: User[]
  selectedUserId: string
  onSelect: (id: string) => void
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'var(--accent-red)',
  HOD: 'var(--accent-purple)',
  EDITOR: 'var(--accent-cyan)',
  VIEWER: 'var(--accent-green)',
  QUALITY: 'var(--accent-amber)',
  AUDITOR: 'var(--accent-amber)',
}

export default function UserSelector({ users, selectedUserId, onSelect }: Props) {
  return (
    <div>
      <label className="mono" style={{
        display: 'block', fontSize: 10, color: 'var(--text-muted)',
        letterSpacing: '0.08em', marginBottom: 8,
      }}>
        SELECT USER
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {users.map((user) => {
          const selected = user.id === selectedUserId
          const roleColor = ROLE_COLORS[user.role] || 'var(--text-secondary)'
          return (
            <button
              key={user.id}
              onClick={() => onSelect(user.id)}
              style={{
                padding: '8px 14px',
                background: selected ? `${roleColor}18` : 'var(--bg-card)',
                border: `1px solid ${selected ? roleColor : 'var(--border)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                minWidth: 140,
              }}
            >
              <div style={{
                fontSize: 13, fontWeight: selected ? 600 : 400,
                color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                marginBottom: 2,
              }}>
                {user.name}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="mono" style={{
                  fontSize: 10, color: roleColor,
                  background: `${roleColor}18`,
                  padding: '1px 5px', borderRadius: 3,
                }}>
                  {user.role}
                </span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  L{user.ceiling_level}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
