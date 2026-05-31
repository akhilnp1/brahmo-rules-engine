'use client'

import { PipelineTiming } from '@/lib/types'

interface Props {
  timing: PipelineTiming
}

export default function TimingBar({ timing }: Props) {
  const stages = [
    { label: 'PERM COMPILE', ms: timing.permission_compile_ms, color: 'var(--accent-purple)' },
    { label: 'ENTRY POINT', ms: timing.entry_point_ms, color: '#6699ff' },
    { label: 'BFS', ms: timing.bfs_ms, color: 'var(--accent-cyan)' },
    { label: 'ZONE 2', ms: timing.zone2_inject_ms, color: 'var(--accent-amber)' },
    { label: '5 CHECKS', ms: timing.five_checks_ms, color: 'var(--accent-red)' },
    { label: 'ASSEMBLE', ms: timing.assemble_ms, color: 'var(--accent-green)' },
  ]

  const total = timing.total_ms

  return (
    <div className="panel" style={{ padding: '16px 24px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
      }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          PIPELINE TIMING BREAKDOWN
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className="mono" style={{
            fontSize: 20, fontWeight: 700,
            color: total < 200 ? 'var(--accent-green)' : total < 500 ? 'var(--accent-amber)' : 'var(--accent-red)',
          }}>
            {total}ms
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>total</span>
          <span style={{
            fontSize: 11, fontFamily: 'IBM Plex Mono',
            color: 'var(--accent-green)',
            background: 'var(--accent-green-dim)',
            padding: '1px 6px', borderRadius: 3,
            border: '1px solid rgba(0,255,157,0.2)',
          }}>
            ZERO LLM
          </span>
        </div>
      </div>

      {/* Proportional time bar */}
      <div style={{
        height: 8, borderRadius: 4,
        display: 'flex', overflow: 'hidden',
        marginBottom: 14, gap: 1,
      }}>
        {stages.map((s) => (
          <div
            key={s.label}
            style={{
              height: '100%',
              width: `${(s.ms / total) * 100}%`,
              background: s.color,
              minWidth: s.ms > 0 ? 2 : 0,
              transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        ))}
      </div>

      {/* Stage breakdown */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {stages.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 2,
              background: s.color, flexShrink: 0,
            }} />
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {s.label}
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {s.ms}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
