'use client'

import { useRef, useState, KeyboardEvent } from 'react'
import { createCRMCandidate, updateCRMCandidate, uploadCandidateCV, deleteCandidateCV } from '@/lib/crm-candidates'
import type { CRMCandidate, CRMStage } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { authFetch } from '@/lib/auth-fetch'

interface Props {
  candidate?: CRMCandidate
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

export default function CandidateModal({ candidate, onClose, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  function getActor() {
    if (!user) return undefined
    return { uid: user.uid, displayName: user.displayName ?? user.email ?? 'Unknown', email: user.email ?? '' }
  }

  const [firstName, setFirstName] = useState(candidate?.firstName ?? '')
  const [lastName,  setLastName]  = useState(candidate?.lastName  ?? '')
  const [position,  setPosition]  = useState(candidate?.position  ?? '')
  const [stage,     setStage]     = useState<CRMStage>(candidate?.stage ?? 'new')
  const [linkedIn,  setLinkedIn]  = useState(candidate?.linkedIn  ?? '')
  const [gitHub,    setGitHub]    = useState(candidate?.gitHub    ?? '')
  const [email,     setEmail]     = useState(candidate?.email     ?? '')
  const [phone,     setPhone]     = useState(candidate?.phone     ?? '')
  const [note,      setNote]      = useState(candidate?.note      ?? '')
  const [skills,    setSkills]    = useState<string[]>(candidate?.skills ?? [])
  const [skillInput, setSkillInput] = useState('')
  const [cvFile,    setCvFile]    = useState<File | null>(null)
  const [cvName,    setCvName]    = useState(candidate?.cvName ?? '')
  const [cvUrl,     setCvUrl]     = useState(candidate?.cvUrl ?? '')
  const [removeCv,  setRemoveCv]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [parsing,   setParsing]   = useState(false)
  const [parseMsg,  setParseMsg]  = useState('')

  async function handleCvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCvFile(file)
    setRemoveCv(false)
    setParsing(true)
    setParseMsg('Parsing CV...')

    const form = new FormData()
    form.append('file', file)

    try {
      const res  = await authFetch('/api/parse-cv', { method: 'POST', body: form })
      const json = await res.json()

      if (!res.ok || !json.data) {
        setParseMsg(json.error ?? 'Failed to parse CV.')
        return
      }

      const d = json.data
      if (d.firstName) setFirstName(d.firstName)
      if (d.lastName)  setLastName(d.lastName)
      if (d.position)  setPosition(d.position)
      if (d.email)     setEmail(d.email)
      if (d.phone)     setPhone(d.phone)
      if (d.linkedIn)  setLinkedIn(d.linkedIn)
      if (d.gitHub)    setGitHub(d.gitHub)
      if (Array.isArray(d.skills) && d.skills.length > 0) setSkills(d.skills)

      setParseMsg('CV imported successfully.')
    } catch {
      setParseMsg('Error parsing CV.')
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!firstName.trim()) return alert('First name is required.')
    if (!lastName.trim())  return alert('Last name is required.')
    if (!position.trim())  return alert('Position is required.')

    setSaving(true)
    const data: Omit<CRMCandidate, 'id' | 'createdAt'> = {
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      position:  position.trim(),
      stage,
    }
    if (linkedIn.trim()) data.linkedIn = linkedIn.trim()
    if (gitHub.trim())   data.gitHub   = gitHub.trim()
    if (email.trim())    data.email    = email.trim()
    if (phone.trim())    data.phone    = phone.trim()
    if (note.trim())     data.note     = note.trim()
    if (skills.length)   data.skills   = skills

    let savedId = candidate?.id ?? ''

    const actor      = getActor()
    const entityName = `${data.firstName} ${data.lastName}`

    if (candidate) {
      await updateCRMCandidate(candidate.id, data, actor ? { actor, entityName } : undefined)
    } else {
      data.source = 'manual'
      savedId = await createCRMCandidate(data, actor)
    }

    // Handle CV: upload new file or remove existing
    if (cvFile) {
      const { cvUrl: url, cvName: name } = await uploadCandidateCV(savedId, cvFile)
      await updateCRMCandidate(savedId, { cvUrl: url, cvName: name })
    } else if (removeCv && candidate?.cvName) {
      await deleteCandidateCV(savedId, candidate.cvName).catch(() => {})
      await updateCRMCandidate(savedId, { cvUrl: undefined, cvName: undefined })
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
        width: '100%', maxWidth: 520, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(0,168,122,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>
            {candidate ? 'Edit Candidate' : 'New Candidate'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-dim)' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* CV Import */}
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            border: '1.5px dashed rgba(0,168,122,0.35)',
            background: 'rgba(0,168,122,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                Import from CV
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                PDF or Word document — fields will be auto-filled by AI
              </div>
              {parseMsg && (
                <div style={{
                  fontSize: '0.7rem', marginTop: 4,
                  color: parseMsg.includes('success') ? '#00a87a' : parseMsg.includes('Parsing') ? '#0091c7' : '#e0457a',
                  fontWeight: 600,
                }}>
                  {parseMsg}
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleCvImport}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: parsing ? 'not-allowed' : 'pointer',
                  background: parsing ? 'rgba(0,168,122,0.3)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: 'white', fontSize: '0.78rem', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {parsing ? 'Parsing...' : '📄 Upload CV'}
              </button>
            </div>
          </div>

          {/* CV attachment status */}
          {(cvFile || (cvUrl && !removeCv)) && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(0,168,122,0.06)',
              border: '1px solid rgba(0,168,122,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: '1rem' }}>📎</span>
                {cvFile ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cvFile.name}
                  </span>
                ) : (
                  <a href={cvUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cvName || 'CV'}
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setCvFile(null); setRemoveCv(true) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-dim)', flexShrink: 0, padding: 0 }}
                title="Remove CV"
              >✕</button>
            </div>
          )}

          {/* First + Last name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>FIRST NAME *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jan" style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>LAST NAME *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Novák" style={INPUT_STYLE} />
            </div>
          </div>

          {/* Position */}
          <div>
            <label style={LABEL_STYLE}>POSITION *</label>
            <input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Senior Java Developer" style={INPUT_STYLE} />
          </div>

          {/* Stage */}
          <div>
            <label style={LABEL_STYLE}>PIPELINE STAGE</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['new', 'screening', 'interview', 'offer'] as CRMStage[]).map(s => {
                const colors: Record<CRMStage, string> = {
                  new: '#6b7280', screening: '#0091c7', interview: '#6b46a8', offer: '#00a87a',
                }
                const active = stage === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${colors[s]}`,
                      background: active ? colors[s] : 'transparent',
                      color: active ? 'white' : colors[s],
                      fontSize: '0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                      cursor: 'pointer', textTransform: 'capitalize', letterSpacing: '0.03em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* LinkedIn + GitHub */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>LINKEDIN</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🔗</span>
                <input value={linkedIn} onChange={e => setLinkedIn(e.target.value)} placeholder="linkedin.com/in/..." style={{ ...INPUT_STYLE, paddingLeft: 30 }} />
              </div>
            </div>
            <div>
              <label style={LABEL_STYLE}>GITHUB</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🐙</span>
                <input value={gitHub} onChange={e => setGitHub(e.target.value)} placeholder="github.com/..." style={{ ...INPUT_STYLE, paddingLeft: 30 }} />
              </div>
            </div>
          </div>

          {/* Email + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>EMAIL</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="jan@example.com" style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>PHONE</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+420 ..." style={INPUT_STYLE} />
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={LABEL_STYLE}>NOTE</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              style={{ ...INPUT_STYLE, resize: 'vertical' }}
            />
          </div>

          {/* Skills */}
          <div>
            <label style={LABEL_STYLE}>SKILLS</label>
            {/* Tag list */}
            {skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {[...new Set(skills)].map(s => (
                  <span
                    key={s}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 20,
                      background: 'rgba(0,168,122,0.08)',
                      border: '1px solid rgba(0,168,122,0.25)',
                      fontSize: '0.75rem', color: 'var(--primary)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1,
                        padding: 0,
                      }}
                      aria-label={`Remove ${s}`}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
            {/* Input */}
            <input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  const val = skillInput.trim().replace(/,$/, '')
                  if (val && !skills.includes(val)) setSkills(prev => [...prev, val])
                  setSkillInput('')
                } else if (e.key === 'Backspace' && skillInput === '' && skills.length > 0) {
                  setSkills(prev => prev.slice(0, -1))
                }
              }}
              placeholder="Type skill, press Enter or comma to add..."
              style={INPUT_STYLE}
            />
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Press Enter or comma to add · Backspace to remove last
            </div>
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
            {saving ? 'Saving...' : (candidate ? 'Save Changes' : 'Add Candidate')}
          </button>
        </div>
      </div>
    </div>
  )
}
