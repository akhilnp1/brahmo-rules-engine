import { PipelineResult, User } from './types'

const BASE = '/api/backend'

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${BASE}/users`)
  if (!res.ok) throw new Error('Failed to fetch users')
  const data = await res.json()
  return data.users
}

export async function runPipeline(userId: string): Promise<PipelineResult> {
  const res = await fetch(`${BASE}/pipeline/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Pipeline failed')
  }
  return res.json()
}

export async function compareUsers(userIds: string[]): Promise<PipelineResult[]> {
  const params = userIds.join(',')
  const res = await fetch(`${BASE}/pipeline/compare?user_ids=${encodeURIComponent(params)}`)
  if (!res.ok) throw new Error('Comparison failed')
  const data = await res.json()
  return data.comparison
}
