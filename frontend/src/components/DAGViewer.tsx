'use client'

import { PipelineResult, User } from '@/lib/types'

interface Props {
  result: PipelineResult | null
  selectedUser: User | null
}

// Hardcoded DAG structure for visualization (matches seed data)
const DAG_HIERARCHY = [
  {
    id: 'HL-01', label: 'Supra Hospital', level: 1, dept: null,
    children: ['HL-03-CLIN', 'HL-03-ADMIN', 'HL-GLOBAL'],
  },
  {
    id: 'HL-03-CLIN', label: 'Clinical Division', level: 3, dept: null,
    children: ['HL-05-ORTHO', 'HL-05-MED', 'HL-05-CARDIO', 'HL-05-PAEDS', 'HL-05-SURG', 'HL-05-ICU'],
  },
  {
    id: 'HL-03-ADMIN', label: 'Admin Division', level: 3, dept: 'admin',
    children: [],
  },
  {
    id: 'HL-GLOBAL', label: 'Global Constraints', level: 3, dept: null,
    isGlobal: true, children: [],
  },
  {
    id: 'HL-05-ORTHO', label: 'Orthopaedics', level: 5, dept: 'ortho',
    children: ['HL-08-ORTHO-GEN', 'HL-08-ORTHO-TKR', 'HL-08-POST-TKR'],
  },
  {
    id: 'HL-05-MED', label: 'General Medicine', level: 5, dept: 'medicine',
    children: ['HL-08-MED-GEN'],
  },
  {
    id: 'HL-05-CARDIO', label: 'Cardiology', level: 5, dept: 'cardiology',
    children: ['HL-08-CARDIO-CCU'],
  },
  {
    id: 'HL-05-PAEDS', label: 'Paediatrics', level: 5, dept: 'paediatrics',
    children: ['HL-10-PAEDS-W'],
  },
  {
    id: 'HL-05-SURG', label: 'Surgery', level: 5, dept: 'surgery',
    children: ['HL-08-POST-TKR'],
  },
  {
    id: 'HL-05-ICU', label: 'ICU', level: 5, dept: 'icu',
    children: [],
  },
  {
    id: 'HL-08-ORTHO-GEN', label: 'Ortho General', level: 8, dept: 'ortho',
    children: ['HL-10-ORTHO-W'],
  },
  {
    id: 'HL-08-ORTHO-TKR', label: 'Ortho TKR Unit', level: 8, dept: 'ortho',
    children: [],
  },
  {
    id: 'HL-08-POST-TKR', label: 'Post-TKR Protocol', level: 8, dept: 'ortho',
    isMultiParent: true, children: [],
  },
  {
    id: 'HL-08-MED-GEN', label: 'Medicine General', level: 8, dept: 'medicine',
    children: ['HL-10-MED-W'],
  },
  {
    id: 'HL-08-CARDIO-CCU', label: 'Cardiac Care Unit', level: 8, dept: 'cardiology',
    children: [],
  },
  {
    id: 'HL-10-ORTHO-W', label: 'Ortho Ward', level: 10, dept: 'ortho',
    children: ['HL-12-RAJAN'],
  },
  {
    id: 'HL-10-MED-W', label: 'Medicine Ward', level: 10, dept: 'medicine',
    children: ['HL-12-PADMA'],
  },
  {
    id: 'HL-10-PAEDS-W', label: 'Paediatrics Ward', level: 10, dept: 'paediatrics',
    children: [],
  },
  {
    id: 'HL-12-RAJAN', label: 'Patient: Rajan', level: 12, dept: 'ortho',
    children: [],
  },
  {
    id: 'HL-12-PADMA', label: 'Patient: Padma', level: 12, dept: 'medicine',
    children: [],
  },
]

const DEPT_COLORS: Record<string, string> = {
  ortho: 'var(--accent-cyan)',
  medicine: 'var(--accent-green)',
  cardiology: 'var(--accent-red)',
  paediatrics: 'var(--accent-purple)',
  surgery: 'var(--accent-amber)',
  icu: '#ff9966',
  admin: 'var(--text-muted)',
}

interface NodeDef {
  id: string
  label: string
  level: number
  dept: string | null
  children: string[]
  isGlobal?: boolean
  isMultiParent?: boolean
}

function DagNode({
  node,
  visitedLevels,
  entryPoint,
}: {
  node: NodeDef
  visitedLevels: Set<string>
  entryPoint: string | null
}) {
  const isReachable = visitedLevels.has(node.id)
  const isEntry = node.id === entryPoint
  const deptColor = node.dept ? DEPT_COLORS[node.dept] || 'var(--text-muted)' : 'var(--text-secondary)'
  const color = node.isGlobal ? 'var(--accent-amber)' : deptColor

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 0,
    }}>
      {/* Node box */}
      <div style={{
        padding: '6px 10px',
        borderRadius: 5,
        border: `1px solid ${isEntry ? 'var(--accent-green)' : isReachable ? color : 'var(--border)'}`,
        background: isEntry
          ? 'var(--accent-green-dim)'
          : isReachable
          ? `${color}12`
          : 'var(--bg-card)',
        color: isEntry
          ? 'var(--accent-green)'
          : isReachable
          ? color
          : 'var(--text-muted)',
        fontSize: 10,
        fontFamily: 'IBM Plex Mono',
        fontWeight: isReachable ? 600 : 400,
        textAlign: 'center',
        minWidth: 80,
        maxWidth: 120,
        position: 'relative',
        opacity: isReachable ? 1 : 0.35,
        transition: 'all 0.3s',
        boxShadow: isEntry ? `0 0 12px ${color}40` : 'none',
      }}>
        {/* Level badge */}
        <span style={{
          position: 'absolute', top: -7, left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 8,
          background: 'var(--bg-base)',
          padding: '0 4px',
          color: 'var(--text-muted)',
          fontFamily: 'IBM Plex Mono',
          whiteSpace: 'nowrap',
        }}>
          L{node.level}
        </span>

        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
          {node.label}
        </div>

        {node.isMultiParent && (
          <div style={{ fontSize: 8, color: 'var(--accent-amber)', marginTop: 2 }}>
            multi-parent
          </div>
        )}
        {isEntry && (
          <div style={{ fontSize: 8, color: 'var(--accent-green)', marginTop: 2 }}>
            ← ENTRY
          </div>
        )}
        {node.isGlobal && (
          <div style={{ fontSize: 8, color: 'var(--accent-amber)', marginTop: 2 }}>
            ZONE 2
          </div>
        )}
      </div>
    </div>
  )
}

export default function DAGViewer({ result, selectedUser }: Props) {
  const visitedLevels = new Set(result?.bfs_visited_levels || [])
  const entryPoint = result?.entry_point || null

  // Group levels by number for row layout
  const rows: Record<number, NodeDef[]> = {}
  for (const node of DAG_HIERARCHY) {
    if (!rows[node.level]) rows[node.level] = []
    rows[node.level].push(node)
  }

  const sortedLevels = Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>DAG Hierarchy Viewer</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          Shows which levels are reachable for the current user via BFS.
          {result
            ? ` ${visitedLevels.size} levels reachable from ${entryPoint}.`
            : ' Run pipeline to see BFS traversal.'}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { color: 'var(--accent-green)', label: 'Entry point' },
          { color: 'var(--accent-cyan)', label: 'Reachable (BFS)' },
          { color: 'var(--border)', label: 'Not reachable', dim: true },
          { color: 'var(--accent-amber)', label: 'Zone 2 (Global)' },
        ].map(({ color, label, dim }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2,
              border: `1px solid ${color}`,
              background: `${color}20`,
              opacity: dim ? 0.4 : 1,
            }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* DAG rows */}
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 700 }}>
          {sortedLevels.map((levelNum) => (
            <div key={levelNum} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Level label */}
              <div className="mono" style={{
                width: 32, flexShrink: 0, textAlign: 'right',
                fontSize: 10, color: 'var(--text-muted)',
                paddingTop: 8,
              }}>
                {levelNum}
              </div>

              {/* Vertical divider */}
              <div style={{
                width: 1, alignSelf: 'stretch',
                background: 'var(--border)',
                flexShrink: 0,
              }} />

              {/* Nodes at this level */}
              <div style={{
                display: 'flex', gap: 12, flexWrap: 'wrap',
                flex: 1, paddingTop: 4,
              }}>
                {rows[levelNum].map((node) => (
                  <DagNode
                    key={node.id}
                    node={node}
                    visitedLevels={visitedLevels}
                    entryPoint={entryPoint}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!result && (
        <div style={{
          marginTop: 20,
          padding: '16px',
          background: 'var(--bg-card)',
          borderRadius: 6,
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'IBM Plex Mono',
          fontSize: 12,
        }}>
          Run the pipeline on the PIPELINE tab to highlight BFS-reachable levels
        </div>
      )}

      {/* Dept color key */}
      <div style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 16, flexWrap: 'wrap',
      }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
          DEPT COLORS:
        </span>
        {Object.entries(DEPT_COLORS).filter(([d]) => d !== 'admin').map(([dept, color]) => (
          <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: color,
            }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {dept}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
