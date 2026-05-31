# BRAHMO Rules Engine — BFS + 5-Check Filter Pipeline

A deterministic knowledge graph filtering pipeline that traverses a DAG upward from a user's entry point, injects globally-relevant nodes, and applies 5 sequential checks to produce a candidate set — with **zero LLM involvement**.

---

## Quick Start (10 minutes)

### 1. Clone & install

```bash
git clone <your-repo>
cd brahmo-rules-engine
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → Create a free account
2. Create new project: `brahmo-rules-engine`
3. Wait ~2 minutes for provisioning
4. Go to **Settings → API** → copy **Project URL** and **anon key**
5. In Supabase **SQL Editor**, run `supabase/schema.sql` (creates all tables)
6. Then run `supabase/seed.sql` (loads 50 nodes + 7 users)
7. Verify: `SELECT COUNT(*) FROM knowledge_nodes` → should return **50**
8. Verify: `SELECT COUNT(*) FROM users` → should return **7**

### 3. Backend

```bash
cd backend

# Copy env file
cp .env.example .env
# Edit .env with your Supabase URL and key

# Create virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --port 8000
```

API will be live at `http://localhost:8000`
Docs available at `http://localhost:8000/docs`

### 4. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will be live at `http://localhost:3000`

---

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

All unit tests run without a database connection (pure logic tests).

---

## Project Structure

```
brahmo-rules-engine/
├── README.md
├── docs/
│   ├── architecture.md          ← Pipeline design + rationale
│   └── data_sources.md          ← Clinical data provenance
│
├── backend/
│   ├── main.py                  ← FastAPI app + all endpoints
│   ├── db.py                    ← Supabase client
│   ├── requirements.txt
│   ├── .env.example
│   ├── pipeline/
│   │   ├── permission_compiler.py   ← O(1) lookup, compiled once
│   │   ├── entry_point_resolver.py  ← User → DAG leaf node
│   │   ├── bfs_traversal.py         ← Upward DAG walk with visited set
│   │   ├── zone2_injector.py        ← Global node injection
│   │   ├── five_check_filter.py     ← Sequential 5-check filter
│   │   └── candidate_assembler.py   ← Metadata annotation + sort
│   ├── models/
│   │   ├── user.py
│   │   └── node.py
│   └── tests/
│       └── test_pipeline.py
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             ← Main demo page (3 tabs)
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── PipelineHeader.tsx   ← Flow diagram
│   │   │   ├── UserSelector.tsx     ← User picker buttons
│   │   │   ├── FilterFunnel.tsx     ← Animated bar chart
│   │   │   ├── TimingBar.tsx        ← Per-stage timing
│   │   │   ├── CandidateTable.tsx   ← Expandable node list
│   │   │   ├── ComparisonView.tsx   ← Side-by-side comparison
│   │   │   └── DAGViewer.tsx        ← BFS reach visualization
│   │   └── lib/
│   │       ├── types.ts
│   │       └── api.ts
│   └── package.json
│
└── supabase/
    ├── schema.sql               ← Run first
    └── seed.sql                 ← Run second
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/users` | All 7 user profiles for dropdown |
| POST | `/pipeline/run` | Run full pipeline for a user |
| GET | `/pipeline/compare?user_ids=U-PRIYA,U-VIKRAM,U-SURESH` | Compare multiple users |
| GET | `/nodes` | All nodes (for DAG visualization) |

### Pipeline request body

```json
{
  "user_id": "U-PRIYA",
  "org_id": "supra"
}
```

---

## Expected Results (50-node demo graph)

| User | Role | Entry Point | Final Nodes |
|------|------|-------------|-------------|
| Nurse Priya | VIEWER L10 | Ortho Ward | ~15 |
| Dr. Vikram | HOD L4 | Ortho Dept | ~22 |
| Dr. Ananya | EDITOR L8 | Medicine Gen | ~18 |
| Dr. Sharma | HOD L4 | Medicine Dept | ~20 |
| Pharmacist Ravi | VIEWER L12 | (pharmacy) | ~10 |
| Dr. Sunita QA | QUALITY L6 | (quality) | ~25 |
| Admin Suresh | ADMIN L1 | Hospital Root | ~38 |

---

## The 5 Checks (sequential)

```
Check 1 — ISOLATION:     WHERE org_id = user.org_id
Check 2 — COMPLIANCE:    WHERE NOT (compliance_tags ∩ user_lacks)
Check 3 — PERMISSION:    WHERE level >= user.ceiling_level  [O(1) lookup]
Check 4 — TEMPORAL:      WHERE status NOT IN ('SUPERSEDED','EXPIRED')
                         AND (valid_until IS NULL OR valid_until > NOW())
Check 5 — DERIVABILITY:  WHERE derivability_score < 0.7
```

**Critical:** Sequential. Output of check N is input to check N+1.

---

## Demo Scenarios

1. **Core pipeline** — Run Nurse Priya. Watch 50 → 15. Narrate each check.
2. **Same graph, different user** — Switch to Dr. Vikram. 15 → 22 nodes. Same code path.
3. **Silent exclusion** — Priya's result contains zero Cardiology/Paeds/Admin nodes. No error messages.
4. **Zone 2 matters** — Toggle Zone 2 injection off. Drug safety nodes disappear. Toggle on.

---

## Surprise Test Preparation

The demo includes a 7th user slot. To add a new user on the fly:

```sql
INSERT INTO users (id, org_id, name, role, department, ceiling_level, write_ceiling, compliance_clearance)
VALUES ('U-NEW', 'supra', 'New User', 'AUDITOR', 'quality', 3, NULL, '{"MNPI"}');
```

Then select `U-NEW` in the dropdown and run pipeline — zero code changes needed.

---

## Architecture Notes

See `docs/architecture.md` for:
- Why checks are sequential, not parallel
- O(1) permission compilation rationale
- Multi-parent DAG node handling
- Scalability analysis (50 nodes → 15,000 nodes)
- GAP 5 compliance explanation
- Compression hint logic

---

## Cost

**$0.** All free tier:
- Supabase free tier (500 MB, 50K rows) — 50 nodes is trivial
- No LLM API calls anywhere in the pipeline
