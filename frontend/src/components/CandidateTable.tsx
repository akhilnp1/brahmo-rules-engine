'use client'

import { useState } from 'react'
import { CandidateNode } from '@/lib/types'

interface Props {
  nodes: CandidateNode[]
  userName: string
}

type Filter = 'ALL' | 'CONSTRAINT' | 'DECISION' | 'ANTI_PATTERN' | 'FACT'

const TYPE_CONFIG = {
  CONSTRAINT:   { color: 'var(--constraint)',   bg: 'var(--accent-red-dim)',    icon: '🛑' },
  DECISION:     { color: 'var(--decision)',      bg: 'var(--accent-cyan-dim)',   icon: '◆' },
  ANTI_PATTERN: { color: 'var(--antipattern)',   bg: 'var(--accent-amber-dim)',  icon: '⚠' },
  FACT:         { color: 'var(--fact)',          bg: 'var(--accent-green-dim)',  icon: '◎' },
}

const HINT_CONFIG = {
  FULL:            { color: 'var(--accent-green)',  label: 'FULL' },
  COMPRESSED:      { color: 'var(--accent-amber)',  label: 'COMPRESSED' },
  CONSTRAINT_ONLY: { color: 'var(--text-muted)',    label: 'CONSTRAINT ONLY' },
}

export default function CandidateTable({ nodes, userName }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = filter === 'ALL' ? nodes : nodes.filter((n) => n.type === filter)

  const counts = {
    CONSTRAINT: nodes.filter((n) => n.type === 'CONSTRAINT').length,
    DECISION: nodes.filter((n) => n.type === 'DECISION').length,
    ANTI_PATTERN: nodes.filter((n) => n.type === 'ANTI_PATTERN').length,
    FACT: nodes.filter((n) => n.type === 'FACT').length,
  }

  return (
    <div className="panel" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            Candidate Set
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8, fontSize: 13 }}>
              for {userName}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {nodes.length} nodes · sorted by importance · silent exclusion applied
          </div>
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('ALL')}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: `1px solid ${filter === 'ALL' ? 'var(--text-secondary)' : 'var(--border)'}`,
              background: filter === 'ALL' ? 'var(--bg-card-hover)' : 'transparent',
              color: filter === 'ALL' ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 11, fontFamily: 'IBM Plex Mono',
            }}
          >
            ALL ({nodes.length})
          </button>
          {(Object.entries(counts) as [Exclude<Filter, 'ALL'>, number][]).map(([type, count]) => {
            const cfg = TYPE_CONFIG[type]
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  border: `1px solid ${filter === type ? cfg.color : 'var(--border)'}`,
                  background: filter === type ? cfg.bg : 'transparent',
                  color: filter === type ? cfg.color : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 11, fontFamily: 'IBM Plex Mono',
                }}
              >
                {type.replace('_', ' ')} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Node list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((node, idx) => {
          const cfg = TYPE_CONFIG[node.type]
          const hintCfg = HINT_CONFIG[node.compression_hint]
          const isExpanded = expanded === node.id

          return (
            <div
              key={node.id}
              className="panel-card"
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                borderLeft: `3px solid ${cfg.color}`,
                animationDelay: `${idx * 0.04}s`,
              }}
              onClick={() => setExpanded(isExpanded ? null : node.id)}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Type icon */}
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Title row */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 8, flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontWeight: 600, fontSize: 13,
                      color: 'var(--text-primary)',
                    }}>
                      {node.title}
                    </span>
                    {node.is_zone2_injected && (
                      <span className="mono" style={{
                        fontSize: 9, padding: '1px 5px',
                        background: 'var(--accent-amber-dim)',
                        color: 'var(--accent-amber)',
                        border: '1px solid rgba(255,184,0,0.3)',
                        borderRadius: 3,
                      }}>
                        ZONE 2 · GLOBAL
                      </span>
                    )}
                    {node.compliance_tags.length > 0 && node.compliance_tags.map((tag) => (
                      <span key={tag} className="mono" style={{
                        fontSize: 9, padding: '1px 5px',
                        background: 'var(--accent-red-dim)',
                        color: 'var(--accent-red)',
                        border: '1px solid rgba(255,77,109,0.3)',
                        borderRadius: 3,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Meta row */}
                  <div style={{
                    display: 'flex', gap: 16, marginTop: 6,
                    flexWrap: 'wrap',
                  }}>
                    {/* Type badge */}
                    <span className="badge" style={{
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.color}40`,
                    }}>
                      {node.type.replace('_', ' ')}
                    </span>

                    {/* Importance */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>
                        IMP
                      </span>
                      <div style={{
                        width: 48, height: 4, background: 'var(--bg-base)',
                        borderRadius: 2, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${node.importance * 100}%`,
                          height: '100%',
                          background: node.importance > 0.8 ? 'var(--accent-red)'
                            : node.importance > 0.6 ? 'var(--accent-amber)'
                            : 'var(--accent-green)',
                          borderRadius: 2,
                        }} />
                      </div>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                        {node.importance.toFixed(2)}
                      </span>
                    </div>

                    {/* Distance */}
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      DIST {node.is_zone2_injected ? 'GLOBAL' : node.distance_from_entry}
                    </span>

                    {/* Level */}
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      L{node.hierarchy_level_number}
                    </span>

                    {/* Dept */}
                    {node.department && (
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {node.department.toUpperCase()}
                      </span>
                    )}

                    {/* Compression hint */}
                    <span className="mono" style={{
                      fontSize: 10,
                      color: hintCfg.color,
                    }}>
                      {hintCfg.label}
                    </span>
                  </div>
                </div>

                {/* Expand chevron */}
                <span style={{
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  flexShrink: 0,
                  transition: 'transform 0.2s',
                  transform: isExpanded ? 'rotate(180deg)' : 'none',
                }}>
                  ▾
                </span>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border)',
                }}>
                  <p style={{
                    fontSize: 13, color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                  }}>
                    {node.content}
                  </p>
                  <div style={{
                    marginTop: 10, display: 'flex', gap: 20,
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>NODE ID </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--accent-cyan)' }}>{node.id}</span>
                    </div>
                    <div>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>STATUS </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{node.status}</span>
                    </div>
                    <div>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>DERIVABILITY </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--accent-green)' }}>{node.derivability_score.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>LEVEL </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{node.hierarchy_level_name}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '32px',
          color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', fontSize: 12,
        }}>
          NO NODES OF TYPE {filter}
        </div>
      )}
    </div>
  )
}
