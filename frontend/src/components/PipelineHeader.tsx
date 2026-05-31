'use client'

export default function PipelineHeader() {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          BFS Traversal{' '}
          <span style={{ color: 'var(--accent-cyan)' }}>+</span>{' '}
          5-Check Filter Pipeline
        </h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 640 }}>
        Traverses a DAG of knowledge nodes upward from a user&apos;s entry point,
        injects globally-relevant nodes, then applies 5 sequential checks —
        all deterministically, with{' '}
        <span style={{ color: 'var(--accent-green)', fontWeight: 500 }}>zero LLM involvement</span>.
      </p>

      {/* Flow diagram */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        marginTop: 18,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {[
          { label: 'USER SESSION', sub: 'role + ceiling + dept', color: 'var(--text-muted)' },
          { arrow: true },
          { label: 'PERMISSION\nCOMPILER', sub: 'O(1) lookup built', color: 'var(--accent-purple)' },
          { arrow: true },
          { label: 'ENTRY POINT\nRESOLVER', sub: 'DAG leaf node', color: 'var(--accent-purple)' },
          { arrow: true },
          { label: 'BFS\nTRAVERSAL', sub: 'walk upward', color: 'var(--accent-cyan)' },
          { arrow: true },
          { label: 'ZONE 2\nINJECTOR', sub: 'global safety', color: 'var(--accent-amber)' },
          { arrow: true },
          { label: '5-CHECK\nFILTER', sub: 'sequential', color: 'var(--accent-red)' },
          { arrow: true },
          { label: 'CANDIDATE\nSET', sub: 'annotated JSON', color: 'var(--accent-green)' },
        ].map((item, i) => {
          if ('arrow' in item) {
            return (
              <div key={i} style={{
                color: 'var(--text-muted)',
                fontSize: 16,
                padding: '0 4px',
                flexShrink: 0,
              }}>→</div>
            )
          }
          return (
            <div key={i} style={{
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: `1px solid ${item.color}30`,
              borderRadius: 6,
              flexShrink: 0,
              textAlign: 'center',
            }}>
              <div className="mono" style={{
                fontSize: 10, fontWeight: 600,
                color: item.color,
                letterSpacing: '0.05em',
                whiteSpace: 'pre',
              }}>
                {item.label}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {item.sub}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
