'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchUsers, runPipeline, compareUsers } from '@/lib/api'
import { User, PipelineResult } from '@/lib/types'
import UserSelector from '@/components/UserSelector'
import FilterFunnel from '@/components/FilterFunnel'
import CandidateTable from '@/components/CandidateTable'
import ComparisonView from '@/components/ComparisonView'
import DAGViewer from '@/components/DAGViewer'
import PipelineHeader from '@/components/PipelineHeader'
import TimingBar from '@/components/TimingBar'

type Tab = 'pipeline' | 'compare' | 'dag'

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('pipeline')
  const [compareResults, setCompareResults] = useState<PipelineResult[]>([])
  const [compareLoading, setCompareLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'ok' | 'error'>('unknown')

  useEffect(() => {
    fetchUsers()
      .then((u) => {
        setUsers(u)
        if (u.length > 0) setSelectedUserId(u[0].id)
        setBackendStatus('ok')
      })
      .catch(() => setBackendStatus('error'))
  }, [])

  const handleRunPipeline = useCallback(async () => {
    if (!selectedUserId) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await runPipeline(selectedUserId)
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [selectedUserId])

  const handleCompare = useCallback(async () => {
    const ids = users.slice(0, 3).map((u) => u.id)
    if (ids.length < 2) return
    setCompareLoading(true)
    try {
      const results = await compareUsers(ids)
      setCompareResults(results)
    } finally {
      setCompareLoading(false)
    }
  }, [users])

  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Top nav bar */}
      <nav style={{
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '52px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo mark */}
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, var(--accent-cyan), #0066ff)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#000',
            fontFamily: 'IBM Plex Mono',
          }}>B</div>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>
            BRAHMO
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Rules Engine
          </span>
          <span className="mono" style={{
            fontSize: 10, color: 'var(--accent-cyan)',
            background: 'var(--accent-cyan-dim)',
            border: '1px solid rgba(0,212,255,0.2)',
            padding: '1px 6px', borderRadius: 3,
          }}>ZERO LLM</span>
        </div>

        {/* Backend status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <div className="pulse-dot" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: backendStatus === 'ok' ? 'var(--accent-green)'
              : backendStatus === 'error' ? 'var(--accent-red)'
              : 'var(--text-muted)',
          }} />
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono' }}>
            {backendStatus === 'ok' ? 'API CONNECTED'
              : backendStatus === 'error' ? 'API OFFLINE'
              : 'CONNECTING...'}
          </span>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Pipeline header */}
        <PipelineHeader />

        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 4,
          borderBottom: '1px solid var(--border)',
          marginBottom: 24,
        }}>
          {(['pipeline', 'compare', 'dag'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="mono"
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab
                  ? '2px solid var(--accent-cyan)'
                  : '2px solid transparent',
                color: activeTab === tab ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                transition: 'color 0.2s',
                marginBottom: -1,
              }}
            >
              {tab === 'pipeline' ? '01 PIPELINE' : tab === 'compare' ? '02 COMPARE' : '03 DAG'}
            </button>
          ))}
        </div>

        {/* ── PIPELINE TAB ─────────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Controls row */}
            <div className="panel" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <UserSelector
                    users={users}
                    selectedUserId={selectedUserId}
                    onSelect={setSelectedUserId}
                  />
                </div>

                <button
                  onClick={handleRunPipeline}
                  disabled={loading || !selectedUserId || backendStatus !== 'ok'}
                  style={{
                    padding: '10px 28px',
                    background: loading ? 'transparent' : 'var(--accent-cyan)',
                    border: '1px solid var(--accent-cyan)',
                    borderRadius: 6,
                    color: loading ? 'var(--accent-cyan)' : '#000',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'IBM Plex Mono',
                    letterSpacing: '0.04em',
                    display: 'flex', alignItems: 'center', gap: 8,
                    opacity: backendStatus !== 'ok' ? 0.4 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: 12, height: 12,
                        border: '2px solid var(--accent-cyan)',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      RUNNING...
                    </>
                  ) : '▶ RUN PIPELINE'}
                </button>

                {result && (
                  <div className="mono" style={{
                    padding: '10px 16px',
                    background: 'var(--accent-green-dim)',
                    border: '1px solid rgba(0,255,157,0.2)',
                    borderRadius: 6,
                    color: 'var(--accent-green)',
                    fontSize: 12,
                  }}>
                    ✓ {result.pipeline_timing.total_ms}ms · {result.candidate_set.length} nodes
                  </div>
                )}
              </div>

              {/* User info strip */}
              {selectedUser && (
                <div style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid var(--border)',
                  display: 'flex', gap: 24, flexWrap: 'wrap',
                }}>
                  {[
                    { label: 'ROLE', value: selectedUser.role },
                    { label: 'DEPT', value: selectedUser.department.toUpperCase() },
                    { label: 'CEILING', value: `LEVEL ${selectedUser.ceiling_level}` },
                    { label: 'CLEARANCE', value: selectedUser.compliance_clearance.length > 0 ? selectedUser.compliance_clearance.join(', ') : 'NONE' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="panel" style={{
                padding: '16px 20px',
                border: '1px solid rgba(255,77,109,0.3)',
                background: 'var(--accent-red-dim)',
                color: 'var(--accent-red)',
                fontFamily: 'IBM Plex Mono', fontSize: 13,
              }}>
                ✗ {error}
                {error.includes('offline') || error.includes('fetch') ? (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                    Make sure the FastAPI backend is running: <code>uvicorn main:app --reload --port 8000</code>
                  </div>
                ) : null}
              </div>
            )}

            {result && (
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Timing breakdown */}
                <TimingBar timing={result.pipeline_timing} />

                {/* Filter funnel */}
                <FilterFunnel funnel={result.funnel} />

                {/* Candidate set table */}
                <CandidateTable nodes={result.candidate_set} userName={result.user_name} />
              </div>
            )}

            {!result && !loading && !error && (
              <div className="panel" style={{
                padding: '60px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⬡</div>
                <div className="mono" style={{ fontSize: 13, letterSpacing: '0.05em' }}>
                  SELECT A USER AND RUN THE PIPELINE
                </div>
                <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>
                  842 nodes in graph · filtered down to exactly the right set for this user
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COMPARE TAB ──────────────────────────────────────── */}
        {activeTab === 'compare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="panel" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Side-by-Side Comparison</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Same graph, same 5 checks — different results per user. Shows the first 3 users.
                  </div>
                </div>
                <button
                  onClick={handleCompare}
                  disabled={compareLoading || backendStatus !== 'ok'}
                  style={{
                    marginLeft: 'auto',
                    padding: '10px 24px',
                    background: compareLoading ? 'transparent' : 'var(--accent-purple)',
                    border: '1px solid var(--accent-purple)',
                    borderRadius: 6,
                    color: compareLoading ? 'var(--accent-purple)' : '#000',
                    fontWeight: 600, fontSize: 13,
                    cursor: compareLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'IBM Plex Mono',
                    opacity: backendStatus !== 'ok' ? 0.4 : 1,
                  }}
                >
                  {compareLoading ? 'RUNNING...' : '▶ RUN COMPARE'}
                </button>
              </div>
            </div>

            {compareResults.length > 0 && (
              <ComparisonView results={compareResults} />
            )}

            {compareResults.length === 0 && !compareLoading && (
              <div className="panel" style={{
                padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⇄</div>
                <div className="mono" style={{ fontSize: 13 }}>CLICK RUN COMPARE TO SEE SIDE-BY-SIDE RESULTS</div>
              </div>
            )}
          </div>
        )}

        {/* ── DAG TAB ──────────────────────────────────────────── */}
        {activeTab === 'dag' && (
          <DAGViewer result={result} selectedUser={selectedUser || null} />
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
