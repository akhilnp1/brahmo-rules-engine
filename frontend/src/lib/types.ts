export interface User {
  id: string
  org_id: string
  name: string
  role: 'ADMIN' | 'HOD' | 'EDITOR' | 'VIEWER' | 'QUALITY' | 'AUDITOR'
  department: string
  ceiling_level: number
  write_ceiling: number | null
  compliance_clearance: string[]
  status: string
}

export interface CandidateNode {
  id: string
  type: 'CONSTRAINT' | 'DECISION' | 'ANTI_PATTERN' | 'FACT'
  title: string
  content: string
  importance: number
  zone: number
  zone_label: string
  hierarchy_level_number: number
  hierarchy_level_name: string
  department: string | null
  status: string
  compliance_tags: string[]
  derivability_score: number
  distance_from_entry: number
  is_zone2_injected: boolean
  compression_hint: 'FULL' | 'COMPRESSED' | 'CONSTRAINT_ONLY'
}

export interface PipelineFunnel {
  total_nodes: number
  after_bfs: number
  after_zone2: number
  after_check1_isolation: number
  after_check2_compliance: number
  after_check3_permission: number
  after_check4_temporal: number
  after_check5_derivability: number
}

export interface PipelineTiming {
  permission_compile_ms: number
  entry_point_ms: number
  bfs_ms: number
  zone2_inject_ms: number
  five_checks_ms: number
  assemble_ms: number
  total_ms: number
}

export interface PipelineResult {
  user: string
  user_name: string
  role: string
  ceiling_level: number
  department: string
  entry_point: string
  pipeline_timing: PipelineTiming
  funnel: PipelineFunnel
  candidate_set: CandidateNode[]
  bfs_visited_levels: string[]
}
