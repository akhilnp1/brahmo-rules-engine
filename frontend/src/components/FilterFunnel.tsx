'use client'

import { PipelineFunnel } from '@/lib/types'

interface Props {
  funnel: PipelineFunnel
}

const STAGES = [
  {
    key: 'total_nodes',
    label: 'TOTAL GRAPH',
    sublabel: 'all nodes in database',
    color: 'var(--text-muted)',
    checkNum: null,
  },
  {
    key: 'after_bfs',
    label: 'AFTER BFS',
    sublabel: 'reachable from entry point',
    color: '#6699ff',
    checkNum: null,
  },
  {
    key: 'after_zone2',
    label: '+ ZONE 2',
    sublabel: 'global nodes injected',
    color: 'var(--accent-amber)',
    checkNum: null,
  },
  {
    key: 'after_check1_isolation',
    label: 'CHECK 1: ISOLATION',
    sublabel: 'org_id filter',
    color: '#99aaff',
    checkNum: 1,
  },
  {
    key: 'after_check2_compliance',
    label: 'CHECK 2: COMPLIANCE',
    sublabel: 'MNPI / PHI / CONFIDENTIAL tags',
    color: 'var(--accent-purple)',
    checkNum: 2,
  },
  {
    key: 'after_check3_permission',
    label: 'CHECK 3: PERMISSION',
    sublabel: 'hierarchy ceiling',
    color: 'var(--accent-cyan)',
    checkNum: 3,
  },
  {
    key: 'after_check4_temporal',
    label: 'CHECK 4: TEMPORAL',
    sublabel: 'expired + superseded',
    color: 'var(--accent-amber)',
    checkNum: 4,
  },
  {
    key: 'after_check5_derivability',
    label: 'CHECK 5: DERIVABILITY',
    sublabel: 'AI already knows this',
    color: 'var(--accent-green)',
    checkNum: 5,
  },
]

export default function FilterFunnel({ funnel }: Props) {
  const maxCount = funnel.total_nodes || 1

  return (
    <div className="panel" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 20,
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Filter Funnel</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Nodes eliminated at each stage · sequential, not parallel
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-green)' }}>
            {funnel.after_check5_derivability}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            / {funnel.total_nodes} nodes
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STAGES.map((stage, idx) => {
          const count = funnel[stage.key as keyof PipelineFunnel] as number
          const prevCount = idx > 0
            ? funnel[STAGES[idx - 1].key as keyof PipelineFunnel] as number
            : count
          const eliminated = prevCount - count
          const pct = Math.round((count / maxCount) * 100)

          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Check number badge */}
              <div className="mono" style={{
                width: 24, height: 24, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: stage.checkNum ? `${stage.color}20` : 'transparent',
                border: stage.checkNum ? `1px solid ${stage.color}40` : '1px solid transparent',
                borderRadius: 4,
                fontSize: 10, fontWeight: 600,
                color: stage.checkNum ? stage.color : 'var(--text-muted)',
              }}>
                {stage.checkNum || '—'}
              </div>

              {/* Label */}
              <div style={{ width: 220, flexShrink: 0 }}>
                <div className="mono" style={{
                  fontSize: 11, fontWeight: 500,
                  color: stage.color,
                  letterSpacing: '0.04em',
                }}>
                  {stage.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {stage.sublabel}
                </div>
              </div>

              {/* Bar */}
              <div style={{
                flex: 1,
                height: 28,
                background: 'var(--bg-card)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div
                  className="bar-fill"
                  style={{
                    '--bar-width': `${pct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${stage.color}40, ${stage.color}20)`,
                    borderRight: `2px solid ${stage.color}`,
                    borderRadius: 4,
                    width: `${pct}%`,
                  } as React.CSSProperties}
                />
                {/* Node count label */}
                <span className="mono" style={{
                  position: 'absolute',
                  left: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  {count}
                </span>
              </div>

              {/* Eliminated badge */}
              <div style={{ width: 72, textAlign: 'right', flexShrink: 0 }}>
                {eliminated > 0 && (
                  <span className="mono" style={{
                    fontSize: 11,
                    color: 'var(--accent-red)',
                    background: 'var(--accent-red-dim)',
                    padding: '2px 7px',
                    borderRadius: 3,
                  }}>
                    −{eliminated}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom summary */}
      <div style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 32,
        flexWrap: 'wrap',
      }}>
        {[
          {
            label: 'BFS REDUCED',
            value: `${funnel.total_nodes - funnel.after_bfs}`,
            color: '#6699ff',
          },
          {
            label: 'ZONE 2 ADDED',
            value: `+${funnel.after_zone2 - funnel.after_bfs}`,
            color: 'var(--accent-amber)',
          },
          {
            label: 'COMPLIANCE BLOCKED',
            value: `${funnel.after_check1_isolation - funnel.after_check2_compliance}`,
            color: 'var(--accent-purple)',
          },
          {
            label: 'PERMISSION BLOCKED',
            value: `${funnel.after_check2_compliance - funnel.after_check3_permission}`,
            color: 'var(--accent-cyan)',
          },
          {
            label: 'DERIVABILITY CUT',
            value: `${funnel.after_check4_temporal - funnel.after_check5_derivability}`,
            color: 'var(--accent-green)',
          },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
