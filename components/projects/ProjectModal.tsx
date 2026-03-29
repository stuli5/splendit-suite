'use client'

import { useEffect, useRef, useState } from 'react'
import { getCompanies } from '@/lib/companies'
import { createProject, updateProject } from '@/lib/projects'
import { getPeople } from '@/lib/meet-visu'
import type { Company, Person } from '@/lib/types'
import type { Project, ProjectPhase, ProjectType, ProjectStatus, CooperationType } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'

const ALL_PHASES: { value: ProjectPhase; label: string }[] = [
  { value: 'contacted',    label: 'Contacted'    },
  { value: 'presentation', label: 'Presentation' },
  { value: 'interview',    label: 'Interview'    },
  { value: 'rejected',     label: 'Rejected'     },
  { value: 'onboarding',   label: 'Onboarding'   },
  { value: 'closed',       label: 'Closed'       },
]

const PHASE_COLORS: Record<ProjectPhase, string> = {
  contacted:    '#0091c7',
  presentation: '#6b46a8',
  interview:    '#00a87a',
  rejected:     '#e0457a',
  onboarding:   '#f59e0b',
  closed:       '#7ab8ae',
}

const COOPERATION_OPTIONS: { value: CooperationType; label: string }[] = [
  { value: 'HPP',  label: 'HPP — Employment'  },
  { value: 'BS',   label: 'BS — Body Shop'     },
  { value: 'both', label: 'HPP + BS'           },
]

const TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'recruitment',  label: 'Recruitment'  },
  { value: 'contracting',  label: 'Contracting'  },
  { value: 'other',        label: 'Other'        },
]

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active',   label: 'Active'   },
  { value: 'on-hold',  label: 'On Hold'  },
  { value: 'closed',   label: 'Closed'   },
]

const DEFAULT_PHASES: ProjectPhase[] = ['contacted', 'presentation', 'interview', 'rejected', 'onboarding', 'closed']


interface Props {
  project?: Project
  onClose: () => void
  onSaved: () => void
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(0,168,122,0.25)', background: 'rgba(255,255,255,0.9)',
  fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 600,
  color: 'var(--text-dim)', marginBottom: 5, letterSpacing: '0.04em',
}

export default function ProjectModal({ project, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const [companies,       setCompanies]       = useState<Company[]>([])
  const [tmobilePeople,   setTmobilePeople]   = useState<Person[]>([])
  const [companySearch,   setCompanySearch]   = useState(project?.companyName ?? '')
  const [companyDropdown, setCompanyDropdown] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [genJD,           setGenJD]           = useState(false)

  const [positionName,   setPositionName]   = useState(project?.positionName   ?? '')
  const [companyId,      setCompanyId]      = useState(project?.companyId      ?? '')
  const [companyName,    setCompanyName]    = useState(project?.companyName    ?? '')
  const [phases,         setPhases]         = useState<ProjectPhase[]>(project?.phases ?? DEFAULT_PHASES)
  const [type,            setType]            = useState<ProjectType>(project?.type            ?? 'recruitment')
  const [status,          setStatus]          = useState<ProjectStatus>(project?.status          ?? 'active')
  const [cooperationType, setCooperationType] = useState<CooperationType>(project?.cooperationType ?? 'HPP')
  const [salary,          setSalary]          = useState(project?.salary ?? '')
  const [requiredCount,  setRequiredCount]  = useState(project?.requiredCount  ?? 1)
  const [responsible,    setResponsible]    = useState(project?.responsible    ?? '')
  const [managerDropdown, setManagerDropdown] = useState(false)
  const [description,    setDescription]    = useState(project?.description    ?? '')
  const [jobDescription, setJobDescription] = useState(project?.jobDescription ?? '')

  useEffect(() => { getCompanies().then(setCompanies) }, [])
  useEffect(() => {
    getPeople().then(people => {
      setTmobilePeople(people.filter(p => p.company.toLowerCase().includes('t-mobile')))
    })
  }, [])

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  )

  function selectCompany(c: Company) {
    setCompanyId(c.id)
    setCompanyName(c.name)
    setCompanySearch(c.name)
    setCompanyDropdown(false)
  }

  const dragPhaseIdx = useRef<number | null>(null)

  function addPhase(phase: ProjectPhase) {
    setPhases(prev => prev.includes(phase) ? prev : [...prev, phase])
  }

  function removePhase(phase: ProjectPhase) {
    setPhases(prev => prev.filter(p => p !== phase))
  }

  function onPhaseDragStart(idx: number) {
    dragPhaseIdx.current = idx
  }

  function onPhaseDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    const fromIdx = dragPhaseIdx.current
    if (fromIdx === null || fromIdx === idx) return
    dragPhaseIdx.current = idx
    setPhases(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
  }

  function onPhaseDragEnd() {
    dragPhaseIdx.current = null
  }

  async function handleSave() {
    if (!positionName.trim()) return alert('Position name is required.')
    if (!companyId)           return alert('Company is required.')
    if (phases.length === 0)  return alert('Select at least one phase.')

    setSaving(true)
    const data: Omit<Project, 'id' | 'createdAt'> = {
      positionName: positionName.trim(),
      companyId,
      companyName,
      phases,
      type,
      status,
      cooperationType,
      requiredCount: Number(requiredCount),
    }
    if (salary.trim())         data.salary         = salary.trim()
    if (responsible.trim())    data.responsible    = responsible.trim()
    if (description.trim())    data.description    = description.trim()
    if (jobDescription.trim()) data.jobDescription = jobDescription.trim()

    const actor = user
      ? { uid: user.uid, displayName: user.displayName ?? user.email ?? 'Unknown', email: user.email ?? '' }
      : undefined

    if (project) {
      await updateProject(project.id, data, actor ? { actor, entityName: data.positionName } : undefined)
    } else {
      await createProject(data, actor)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.97)', borderRadius: 16,
        width: '100%', maxWidth: 620, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(0,168,122,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>
            {project ? 'Edit Project' : 'New Project'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-dim)' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Position Name */}
          <div>
            <label style={LABEL_STYLE}>POSITION NAME *</label>
            <input
              value={positionName}
              onChange={e => setPositionName(e.target.value)}
              placeholder="e.g. Senior Java Developer"
              style={INPUT_STYLE}
            />
          </div>

          {/* Company autocomplete */}
          <div style={{ position: 'relative' }}>
            <label style={LABEL_STYLE}>COMPANY *</label>
            <input
              value={companySearch}
              onChange={e => {
                setCompanySearch(e.target.value)
                setCompanyId('')
                setCompanyName('')
                setCompanyDropdown(true)
              }}
              onFocus={() => setCompanyDropdown(true)}
              onBlur={() => setTimeout(() => setCompanyDropdown(false), 150)}
              placeholder="Search company..."
              style={INPUT_STYLE}
            />
            {companyDropdown && filteredCompanies.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'white', border: '1px solid rgba(0,168,122,0.2)',
                borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                maxHeight: 180, overflowY: 'auto', marginTop: 2,
              }}>
                {filteredCompanies.map(c => (
                  <div
                    key={c.id}
                    onMouseDown={() => selectCompany(c)}
                    style={{
                      padding: '9px 14px', cursor: 'pointer', fontSize: '0.82rem',
                      fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0faf8')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    {c.city && <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontSize: '0.75rem' }}>{c.city}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Phases */}
          <div>
            <label style={LABEL_STYLE}>PROJECT PHASES *</label>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 8 }}>
              Drag to reorder · click ✕ to remove
            </div>

            {/* Selected phases — draggable */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 36, marginBottom: 10 }}>
              {phases.map((ph, idx) => {
                const c = PHASE_COLORS[ph]
                const label = ALL_PHASES.find(p => p.value === ph)?.label ?? ph
                return (
                  <div
                    key={ph}
                    draggable
                    onDragStart={() => onPhaseDragStart(idx)}
                    onDragOver={e => onPhaseDragOver(e, idx)}
                    onDragEnd={onPhaseDragEnd}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px 5px 8px', borderRadius: 20, cursor: 'grab',
                      border: `1.5px solid ${c}`,
                      background: `${c}14`,
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', color: `${c}99`, letterSpacing: '0.05em' }}>⠿</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: c }}>{label}</span>
                    <button
                      type="button"
                      onClick={() => removePhase(ph)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: c, fontSize: '0.7rem', padding: 0, lineHeight: 1, opacity: 0.6,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
              {phases.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '5px 0' }}>
                  No phases selected
                </span>
              )}
            </div>

            {/* Unselected phases — add buttons */}
            {ALL_PHASES.filter(p => !phases.includes(p.value)).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ALL_PHASES.filter(p => !phases.includes(p.value)).map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => addPhase(p.value)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                      border: `1px dashed ${PHASE_COLORS[p.value]}60`,
                      background: 'transparent',
                      color: `${PHASE_COLORS[p.value]}80`,
                      fontSize: '0.75rem', fontWeight: 600,
                    }}
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type + Status row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={LABEL_STYLE}>PROJECT TYPE</label>
              <select value={type} onChange={e => setType(e.target.value as ProjectType)} style={INPUT_STYLE}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>PROJECT STATUS *</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} style={INPUT_STYLE}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Cooperation Type + Salary row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={LABEL_STYLE}>COOPERATION TYPE</label>
              <select value={cooperationType} onChange={e => setCooperationType(e.target.value as CooperationType)} style={INPUT_STYLE}>
                {COOPERATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>SALARY</label>
              <input
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="e.g. 80 000 – 100 000 CZK"
                style={INPUT_STYLE}
              />
            </div>
          </div>

          {/* Required Count + Responsible row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={LABEL_STYLE}>REQUIRED COUNT</label>
              <input
                type="number" min={1} value={requiredCount}
                onChange={e => setRequiredCount(Number(e.target.value))}
                style={INPUT_STYLE}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <label style={LABEL_STYLE}>RESPONSIBLE MANAGER</label>
              <input
                value={responsible}
                onChange={e => {
                  setResponsible(e.target.value)
                  setManagerDropdown(true)
                }}
                onFocus={() => setManagerDropdown(true)}
                onBlur={() => setTimeout(() => setManagerDropdown(false), 150)}
                placeholder="Name..."
                style={INPUT_STYLE}
              />
              {managerDropdown && companyName.toLowerCase().includes('t-mobile') && (() => {
                const filtered = tmobilePeople.filter(p =>
                  p.name.toLowerCase().includes(responsible.toLowerCase())
                )
                return filtered.length > 0 ? (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: 'white', border: '1px solid rgba(0,168,122,0.2)',
                    borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    maxHeight: 180, overflowY: 'auto', marginTop: 2,
                  }}>
                    {filtered.map(p => (
                      <div
                        key={p.id}
                        onMouseDown={() => { setResponsible(p.name); setManagerDropdown(false) }}
                        style={{
                          padding: '9px 14px', cursor: 'pointer', fontSize: '0.82rem',
                          fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0faf8')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        {p.role && <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontSize: '0.75rem' }}>{p.role}</span>}
                      </div>
                    ))}
                  </div>
                ) : null
              })()}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={LABEL_STYLE}>PROJECT DESCRIPTION</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description of the project..."
              rows={3}
              style={{ ...INPUT_STYLE, resize: 'vertical' }}
            />
          </div>

          {/* Job Description */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>JOB DESCRIPTION</label>
              <button
                type="button"
                disabled={!positionName.trim() || genJD}
                onClick={async () => {
                  setGenJD(true)
                  const res  = await fetch('/api/ai/job-description', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ positionName, companyName, type, cooperationType, description }),
                  })
                  const json = await res.json()
                  if (json.text) setJobDescription(json.text)
                  setGenJD(false)
                }}
                style={{
                  padding: '3px 12px', borderRadius: 6, border: 'none', cursor: (!positionName.trim() || genJD) ? 'not-allowed' : 'pointer',
                  background: (!positionName.trim() || genJD) ? 'rgba(107,70,168,0.2)' : 'rgba(107,70,168,0.15)',
                  color: '#6b46a8', fontSize: '0.7rem', fontWeight: 700,
                }}
              >
                {genJD ? '✨ Generating...' : '✨ Generate with AI'}
              </button>
            </div>
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Role responsibilities, requirements... or click Generate with AI"
              rows={4}
              style={{ ...INPUT_STYLE, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(0,168,122,0.12)',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px', borderRadius: 9, border: '1px solid rgba(0,168,122,0.25)',
              background: 'transparent', color: 'var(--text-dim)',
              fontSize: '0.82rem', fontFamily: 'Syne, sans-serif', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 24px', borderRadius: 9, border: 'none',
              background: saving ? 'rgba(0,168,122,0.4)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', fontSize: '0.82rem', fontFamily: 'Syne, sans-serif',
              fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : (project ? 'Save Changes' : 'Create Project')}
          </button>
        </div>
      </div>
    </div>
  )
}
