'use client'

import { PipelineResult } from '@/lib/types'

interface Props {
  results: PipelineResult[]
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'var(--accent-red)',
  HOD: 'var(--accent-purple)',
  EDITOR: 'var(--accent-cyan)',
  VIEWER: 'var(--accent-green)',
  QUALITY: 'var(--accent-amber)',
  AUDITOR: 'var(--accent-amber)',
}

export default function ComparisonView({ results }: Props) {
  if (results.length === 0) return null

  const maxFinal = Math.max(...results.map((r) => r.funnel.after_check5_derivability))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${results.length}, 1fr)`,
        gap: 16,
      }}>
        {results.map((r) => {
          const roleColor = ROLE_COLORS[r.role] || 'var(--text-secondary)'
          const finalCount = r.funnel.after_check5_derivability
          const heightPct = maxFinal > 0 ? (finalCount / maxFinal) * 100 : 0

          return (
            <div key={r.user} className="panel" style={{ padding: '24px' }}>
              {/* User header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: 8, marginBottom: 6,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `${roleColor}20`,
                    border: `1px solid ${roleColor}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, color: roleColor,
                  }}>
                    {r.user_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.user_name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      <span className="mono" style={{
                        fontSize: 10, color: roleColor,
                        background: `${roleColor}18`,
                        padding: '1px 5px', borderRadius: 3,
                      }}>
                        {r.role}
                      </span>
                      <span className="mono" style={{
                        fontSize: 10, color: 'var(--text-muted)',
                      }}>
                        L{r.ceiling_level} · {r.department.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Big number */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  fontSize: 52, fontWeight: 800,
                  color: roleColor,
                  lineHeight: 1,
                }}>
                  {finalCount}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)',
                  marginTop: 4, fontFamily: 'IBM Plex Mono',
                }}>
                  CANDIDATE NODES
                </div>
              </div>

              {/* Bar visual */}
              <div style={{
                height: 6, background: 'var(--bg-card)',
                borderRadius: 3, overflow: 'hidden', marginBottom: 20,
              }}>
                <div style={{
                  height: '100%',
                  width: `${heightPct}%`,
                  background: roleColor,
                  borderRadius: 3,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>

              {/* Funnel mini */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'BFS REACH', val: r.funnel.after_bfs, color: '#6699ff' },
                  { label: '+ZONE 2', val: r.funnel.after_zone2, color: 'var(--accent-amber)' },
                  { label: 'COMPLIANCE', val: r.funnel.after_check2_compliance, color: 'var(--accent-purple)' },
                  { label: 'PERMISSION', val: r.funnel.after_check3_permission, color: 'var(--accent-cyan)' },
                  { label: 'TEMPORAL', val: r.funnel.after_check4_temporal, color: 'var(--accent-amber)' },
                  { label: 'DERIVABILITY', val: r.funnel.after_check5_derivability, color: 'var(--accent-green)' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {label}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color, fontWeight: 500 }}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Timing */}
              <div style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  TOTAL TIME
                </span>
                <span className="mono" style={{
                  fontSize: 11,
                  color: r.pipeline_timing.total_ms < 300 ? 'var(--accent-green)' : 'var(--accent-amber)',
                }}>
                  {r.pipeline_timing.total_ms}ms
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Difference table */}
      <div className="panel" style={{ padding: '24px' }}>
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
          What changes between users?
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{
                  textAlign: 'left', padding: '8px 12px',
                  color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono',
                  fontSize: 10, letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--border)',
                }}>
                  PROPERTY
                </th>
                {results.map((r) => (
                  <th key={r.user} style={{
                    textAlign: 'right', padding: '8px 12px',
                    color: ROLE_COLORS[r.role],
                    fontFamily: 'IBM Plex Mono', fontSize: 10,
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {r.user_name.split(' ')[0].toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'BFS Entry Level', fn: (r: PipelineResult) => `L${r.ceiling_level}` },
                { label: 'BFS Reachable', fn: (r: PipelineResult) => r.funnel.after_bfs },
                { label: 'After Zone 2', fn: (r: PipelineResult) => r.funnel.after_zone2 },
                { label: 'After Compliance', fn: (r: PipelineResult) => r.funnel.after_check2_compliance },
                { label: 'After Permission', fn: (r: PipelineResult) => r.funnel.after_check3_permission },
                { label: 'After Temporal', fn: (r: PipelineResult) => r.funnel.after_check4_temporal },
                { label: 'Final Set', fn: (r: PipelineResult) => r.funnel.after_check5_derivability },
                { label: 'Total Time', fn: (r: PipelineResult) => `${r.pipeline_timing.total_ms}ms` },
              ].map(({ label, fn }, i) => (
                <tr key={label} style={{
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  <td style={{
                    padding: '8px 12px',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {label}
                  </td>
                  {results.map((r) => (
                    <td key={r.user} style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontFamily: 'IBM Plex Mono',
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      borderBottom: '1px solid var(--border)',
                    }}>
                      {fn(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
