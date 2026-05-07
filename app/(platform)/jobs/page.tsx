'use client'

import { useEffect, useState } from 'react'
import {
  getJobs, createJob, updateJob, deleteJob, publishJob, unpublishJob,
  generateSlug, formatSalary, JOB_TYPE_LABELS, WORK_MODE_LABELS,
} from '@/lib/jobs'
import type { Job, JobStatus, JobType, WorkMode } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const JOB_TYPES:  JobType[]  = ['full-time', 'part-time', 'contract', 'freelance']
const WORK_MODES: WorkMode[] = ['remote', 'hybrid', 'onsite']

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
  const [tagsRaw,      setTagsRaw]      = useState((job?.tags ?? []).join(', '))
  const [responsible,  setResponsible]  = useState(job?.responsible  ?? '')
  const [saving,       setSaving]       = useState(false)

  async function handleSave() {
    if (!title.trim() || !description.trim() || !location.trim()) return
    setSaving(true)
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg0)', borderRadius: 16, padding: 32, width: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>
            {job ? 'Edit Job' : 'New Job'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-dim)' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
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
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 130 }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the role, team, responsibilities..."
            />
          </div>

          <div>
            <label style={lbl}>REQUIREMENTS</label>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 80 }}
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              placeholder="Key skills and experience required..."
            />
          </div>

          <div>
            <label style={lbl}>TAGS (comma separated)</label>
            <input style={inp} value={tagsRaw} onChange={e => setTagsRaw(e.target.value)} placeholder="e.g. React, TypeScript, Node.js" />
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs,      setJobs]      = useState<Job[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<Job | undefined>()

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
    </div>
  )
}
