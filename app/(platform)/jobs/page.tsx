'use client'

import { useEffect, useRef, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  getJobs, createJob, updateJob, deleteJob, publishJob, unpublishJob,
  generateSlug, formatSalary, JOB_TYPE_LABELS, WORK_MODE_LABELS,
} from '@/lib/jobs'
import type { Job, JobApplication, JobStatus, JobType, WorkMode } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const JOB_TYPES:  JobType[]  = ['full-time', 'part-time', 'contract', 'freelance']
const WORK_MODES: WorkMode[] = ['remote', 'hybrid', 'onsite']

const TECH_SUGGESTIONS = [
  // AI / ML
  'Python', 'PyTorch', 'TensorFlow', 'LangChain', 'LlamaIndex', 'OpenAI API',
  'Anthropic API', 'Hugging Face', 'LLM', 'RAG', 'MLflow', 'Scikit-learn',
  'Pandas', 'NumPy', 'CUDA', 'Ollama', 'Vector DB', 'Vertex AI',
  'AWS Bedrock', 'Transformers',
  // DevOps / Cloud
  'Docker', 'Kubernetes', 'Terraform', 'AWS', 'GCP', 'Azure',
  'CI/CD', 'GitHub Actions', 'ArgoCD', 'Helm', 'Prometheus', 'Grafana',
  'Linux', 'Bash', 'Ansible', 'GitLab CI', 'Datadog', 'Nginx',
  // Backend / Data
  'Node.js', 'FastAPI', 'Go', 'Rust', 'Java', 'TypeScript', 'JavaScript',
  'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'Elasticsearch', 'Spark',
  // Frontend
  'React', 'Next.js', 'GraphQL', 'REST API', 'gRPC',
  // Security
  'OWASP', 'SAST', 'DAST', 'Penetration Testing', 'Vulnerability Assessment',
  'SIEM', 'SOC', 'Zero Trust', 'IAM', 'OAuth2', 'SAML', 'PKI',
  'Burp Suite', 'Metasploit', 'Nmap', 'Wireshark', 'Splunk',
  'ISO 27001', 'SOC 2', 'GDPR', 'PCI DSS', 'NIST', 'CIS Benchmarks',
  // ITSM / ITIL
  'ITIL', 'ITSM', 'ServiceNow', 'CMDB', 'Change Management',
  'Incident Management', 'Problem Management', 'SLA', 'COBIT',
]

const STATUS_STYLE: Record<JobStatus, { bg: string; color: string }> = {
  draft:     { bg: 'rgba(100,100,100,0.1)',  color: '#888'     },
  published: { bg: 'rgba(0,168,122,0.12)',   color: '#00a87a'  },
  closed:    { bg: 'rgba(224,69,122,0.12)',  color: '#e0457a'  },
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(0,168,122,0.25)', background: 'rgba(255,255,255,0.9)',
  fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600,
  letterSpacing: '0.05em', display: 'block', marginBottom: 5,
}

// ── Tag Input ─────────────────────────────────────────────────────────────────

function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input,    setInput]    = useState('')
  const [open,     setOpen]     = useState(false)
  const containerRef            = useRef<HTMLDivElement>(null)

  const filtered = input.trim().length === 0
    ? TECH_SUGGESTIONS.filter(s => !value.includes(s))
    : TECH_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
      )

  function addTag(tag: string) {
    const t = tag.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setInput('')
    setOpen(false)
  }

  function removeTag(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input.replace(/,$/, ''))
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
        padding: '7px 10px', borderRadius: 8,
        border: `1px solid ${open ? 'rgba(0,168,122,0.55)' : 'rgba(0,168,122,0.25)'}`,
        background: 'rgba(255,255,255,0.9)', cursor: 'text', minHeight: 40,
        transition: 'border-color 0.15s',
      }}
        onClick={() => { setOpen(true); (containerRef.current?.querySelector('input') as HTMLInputElement | null)?.focus() }}
      >
        {value.map(tag => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: '0.72rem', padding: '3px 8px', borderRadius: 20,
            background: 'rgba(0,168,122,0.12)', color: '#00a87a',
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
            border: '1px solid rgba(0,168,122,0.2)',
          }}>
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00a87a', padding: 0, lineHeight: 1, fontSize: '0.75rem' }}
            >×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'Search or type a tag...' : ''}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text)', minWidth: 120, flexGrow: 1,
          }}
        />
      </div>

      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1px solid rgba(0,168,122,0.2)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          zIndex: 100, maxHeight: 200, overflowY: 'auto',
        }}>
          {filtered.slice(0, 12).map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); addTag(s) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.8rem',
                fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,168,122,0.07)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Markdown Toolbar ──────────────────────────────────────────────────────────

type FormatAction = { label: string; title: string; wrap?: [string, string]; prefix?: string }

const FORMAT_ACTIONS: FormatAction[] = [
  { label: 'B',  title: 'Bold',          wrap: ['**', '**'] },
  { label: 'I',  title: 'Italic',        wrap: ['*', '*'] },
  { label: 'H2', title: 'Heading',       prefix: '## ' },
  { label: '•',  title: 'Bullet list',   prefix: '- ' },
  { label: '1.', title: 'Numbered list', prefix: '1. ' },
]

function MarkdownToolbar({ textareaRef, value, onChange }: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (v: string) => void
}) {
  function applyFormat(action: FormatAction) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const selected = value.slice(start, end)

    let newValue: string
    let newStart: number
    let newEnd: number

    if (action.wrap) {
      const [open, close] = action.wrap
      newValue = value.slice(0, start) + open + selected + close + value.slice(end)
      newStart = start + open.length
      newEnd   = end   + open.length
    } else if (action.prefix) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      newValue = value.slice(0, lineStart) + action.prefix + value.slice(lineStart)
      newStart = start + action.prefix.length
      newEnd   = end   + action.prefix.length
    } else {
      return
    }

    onChange(newValue)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newStart, newEnd)
    })
  }

  const btnStyle: React.CSSProperties = {
    padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(0,168,122,0.2)',
    background: 'rgba(0,168,122,0.06)', cursor: 'pointer',
    fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 700, color: 'var(--text)', lineHeight: 1.4,
    transition: 'background 0.12s',
  }

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
      {FORMAT_ACTIONS.map(a => (
        <button
          key={a.label}
          type="button"
          title={a.title}
          onMouseDown={e => { e.preventDefault(); applyFormat(a) }}
          style={btnStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,168,122,0.15)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,168,122,0.06)' }}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

// ── Job Modal ─────────────────────────────────────────────────────────────────

function JobModal({ job, onClose, onSaved }: {
  job?: Job
  onClose: () => void
  onSaved: () => void
}) {
  const [title,        setTitle]        = useState(job?.title        ?? '')
  const [location,     setLocation]     = useState(job?.location     ?? '')
  const [workMode,     setWorkMode]     = useState<WorkMode>(job?.workMode     ?? 'hybrid')
  const [type,         setType]         = useState<JobType>(job?.type          ?? 'full-time')
  const [salaryMin,    setSalaryMin]    = useState(String(job?.salaryMin       ?? ''))
  const [salaryMax,    setSalaryMax]    = useState(String(job?.salaryMax       ?? ''))
  const [currency,     setCurrency]     = useState<'CZK'|'EUR'>(job?.currency ?? 'CZK')
  const [description,  setDescription]  = useState(job?.description  ?? '')
  const [requirements, setRequirements] = useState(job?.requirements ?? '')
  const [tags,         setTags]         = useState<string[]>(job?.tags ?? [])
  const [responsible,  setResponsible]  = useState(job?.responsible  ?? '')
  const [saving,       setSaving]       = useState(false)
  const [fullscreen,   setFullscreen]   = useState(false)

  const descRef = useRef<HTMLTextAreaElement>(null)
  const reqRef  = useRef<HTMLTextAreaElement>(null)

  async function handleSave() {
    if (!title.trim() || !description.trim() || !location.trim()) return
    setSaving(true)
    const data: Omit<Job, 'id' | 'createdAt'> = {
      title:       title.trim(),
      slug:        job?.slug ?? generateSlug(title.trim()),
      location:    location.trim(),
      workMode,
      type,
      currency,
      description: description.trim(),
      tags,
      status:      job?.status ?? 'draft',
      ...(salaryMin.trim()      ? { salaryMin: Number(salaryMin) }           : {}),
      ...(salaryMax.trim()      ? { salaryMax: Number(salaryMax) }           : {}),
      ...(requirements.trim()   ? { requirements: requirements.trim() }      : {}),
      ...(responsible.trim()    ? { responsible: responsible.trim() }        : {}),
      ...(job?.publishedAt      ? { publishedAt: job.publishedAt }           : {}),
    }
    if (job) {
      await updateJob(job.id, data)
    } else {
      await createJob(data)
    }
    setSaving(false)
    onSaved()
  }

  const modalStyle: React.CSSProperties = fullscreen
    ? { background: 'var(--bg0)', borderRadius: 0, padding: 40, width: '100vw', height: '100vh', overflowY: 'auto', boxShadow: 'none', display: 'flex', flexDirection: 'column' }
    : { background: 'var(--bg0)', borderRadius: 16, padding: 40, width: 820, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: fullscreen ? 'transparent' : 'rgba(0,0,0,0.4)', display: 'flex', alignItems: fullscreen ? 'stretch' : 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>
            {job ? 'Edit Job' : 'New Job'}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setFullscreen(f => !f)}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              style={{ background: 'none', border: '1px solid rgba(0,168,122,0.25)', borderRadius: 7, cursor: 'pointer', padding: '4px 8px', color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1 }}
            >
              {fullscreen ? '⊡' : '⛶'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-dim)' }}>✕</button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, flex: fullscreen ? 1 : undefined }}>
          <div>
            <label style={lbl}>POSITION TITLE *</label>
            <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior React Developer" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>LOCATION *</label>
              <input style={inp} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Prague" />
            </div>
            <div>
              <label style={lbl}>WORK MODE</label>
              <select style={inp} value={workMode} onChange={e => setWorkMode(e.target.value as WorkMode)}>
                {WORK_MODES.map(m => <option key={m} value={m}>{WORK_MODE_LABELS[m]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>JOB TYPE</label>
              <select style={inp} value={type} onChange={e => setType(e.target.value as JobType)}>
                {JOB_TYPES.map(t => <option key={t} value={t}>{JOB_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>CURRENCY</label>
              <select style={inp} value={currency} onChange={e => setCurrency(e.target.value as 'CZK'|'EUR')}>
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>SALARY MIN (monthly)</label>
              <input style={inp} type="number" min={0} value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="e.g. 80000" />
            </div>
            <div>
              <label style={lbl}>SALARY MAX (monthly)</label>
              <input style={inp} type="number" min={0} value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="e.g. 120000" />
            </div>
          </div>

          <div>
            <label style={lbl}>JOB DESCRIPTION *</label>
            <MarkdownToolbar textareaRef={descRef} value={description} onChange={setDescription} />
            <textarea
              ref={descRef}
              style={{ ...inp, resize: 'vertical', minHeight: fullscreen ? 260 : 180 }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the role, team, responsibilities..."
            />
          </div>

          <div>
            <label style={lbl}>REQUIREMENTS</label>
            <MarkdownToolbar textareaRef={reqRef} value={requirements} onChange={setRequirements} />
            <textarea
              ref={reqRef}
              style={{ ...inp, resize: 'vertical', minHeight: fullscreen ? 180 : 110 }}
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              placeholder="Key skills and experience required..."
            />
          </div>

          <div>
            <label style={lbl}>TAGS</label>
            <TagInput value={tags} onChange={setTags} />
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Search from suggestions or type a custom tag and press Enter
            </div>
          </div>

          <div>
            <label style={lbl}>RESPONSIBLE RECRUITER</label>
            <input style={inp} value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Name..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !description.trim() || !location.trim()}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : (job ? 'Save Changes' : 'Create Job')}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '11px 20px', borderRadius: 9,
              border: '1px solid var(--card-border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Application Toast ─────────────────────────────────────────────────────────

function ApplicationToast({ app, onClose }: { app: JobApplication; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
      background: 'white', borderRadius: 14, padding: '20px 24px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxWidth: 360,
      borderLeft: '4px solid #00a87a', animation: 'slideIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#0f2e2a' }}>
          New Application
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1rem', lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ fontSize: '0.82rem', color: '#333', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.7 }}>
        <div><strong>{app.firstName} {app.lastName}</strong></div>
        <div style={{ color: '#00a87a' }}>{app.email}</div>
        {app.phone    && <div>📞 {app.phone}</div>}
        {app.linkedIn && <div>🔗 {app.linkedIn}</div>}
        <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#888' }}>Applied for: {app.jobTitle}</div>
        {app.message  && <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#555', borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>{app.message}</div>}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs,        setJobs]        = useState<Job[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [editing,     setEditing]     = useState<Job | undefined>()
  const [newApp,      setNewApp]      = useState<JobApplication | null>(null)
  const initializedRef = useRef(false)

  // Real-time listener for new applications
  useEffect(() => {
    const q = query(collection(db, 'job_applications'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snapshot => {
      if (!initializedRef.current) {
        initializedRef.current = true
        return
      }
      const added = snapshot.docChanges().filter(c => c.type === 'added')
      if (added.length > 0) {
        const d = added[0].doc
        setNewApp({ id: d.id, ...d.data() } as JobApplication)
      }
    })
    return () => unsub()
  }, [])

  async function load() {
    const data = await getJobs()
    setJobs(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleTogglePublish(job: Job) {
    if (job.status === 'published') {
      await unpublishJob(job.id)
    } else {
      await publishJob(job.id)
    }
    load()
  }

  async function handleDelete(job: Job) {
    if (!confirm(`Delete job "${job.title}"?`)) return
    await deleteJob(job.id)
    setJobs(prev => prev.filter(j => j.id !== job.id))
  }

  const published = jobs.filter(j => j.status === 'published').length
  const draft     = jobs.filter(j => j.status === 'draft').length
  const closed    = jobs.filter(j => j.status === 'closed').length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            💼 Jobs
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Manage open positions published to{' '}
            <a href="https://jobs.splendit.cz" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              jobs.splendit.cz
            </a>
          </p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setShowModal(true) }}
          style={{
            padding: '10px 20px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          + New Job
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total',     value: jobs.length, color: 'var(--text)'  },
          { label: 'Published', value: published,   color: '#00a87a'      },
          { label: 'Draft',     value: draft,       color: '#888'         },
          { label: 'Closed',    value: closed,      color: '#e0457a'      },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 60, fontSize: '0.82rem' }}>Loading...</div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,168,122,0.04)' }}>
                {['Position', 'Location', 'Type', 'Salary', 'Status', 'Published', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '0.65rem',
                    color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--card-border)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    No jobs yet. Click &ldquo;+ New Job&rdquo; to get started.
                  </td>
                </tr>
              ) : jobs.map((job, i) => {
                const sc     = STATUS_STYLE[job.status]
                const salary = formatSalary(job)
                return (
                  <tr key={job.id} style={{ borderBottom: i < jobs.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)' }}>{job.title}</div>
                      {job.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {job.tags.slice(0, 4).map(tag => (
                            <span key={tag} style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 20, background: 'rgba(0,168,122,0.08)', color: 'var(--primary)' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {job.location}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>{WORK_MODE_LABELS[job.workMode]}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {JOB_TYPE_LABELS[job.type]}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace', color: salary ? '#00a87a' : 'var(--text-dim)', fontWeight: salary ? 600 : 400 }}>
                      {salary || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {job.publishedAt ? new Date(job.publishedAt).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleTogglePublish(job)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: job.status === 'published' ? 'rgba(224,69,122,0.1)' : 'rgba(0,168,122,0.1)',
                            color: job.status === 'published' ? '#e0457a' : '#00a87a',
                            fontSize: '0.72rem', fontWeight: 600,
                          }}
                        >
                          {job.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        {job.status === 'published' && (
                          <a href={`/careers/${job.slug}`} target="_blank" rel="noreferrer"
                            style={{ fontSize: '0.72rem', color: 'var(--secondary)', textDecoration: 'none', fontWeight: 600 }}>
                            Preview ↗
                          </a>
                        )}
                        <button onClick={() => { setEditing(job); setShowModal(true) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(job)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#e0457a', fontWeight: 600 }}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <JobModal
          job={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}

      {newApp && (
        <ApplicationToast app={newApp} onClose={() => setNewApp(null)} />
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
