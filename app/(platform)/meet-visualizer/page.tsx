'use client'

import { useEffect, useState } from 'react'
import { subscribeMeets, subscribePeople, subscribeTribes } from '@/lib/meet-visu'
import type { Meet, Person, Tribe } from '@/lib/types'
import MeetsTab from '@/components/meet-visu/MeetsTab'
import DashboardTab from '@/components/meet-visu/DashboardTab'
import OrgChartTab from '@/components/meet-visu/OrgChartTab'
import PeopleTab from '@/components/meet-visu/PeopleTab'

type Tab = 'meets' | 'dashboard' | 'orgchart' | 'people'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'meets',     label: 'Meets',     icon: '📅' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'orgchart',  label: 'Org Chart', icon: '🕸'  },
  { id: 'people',    label: 'People',    icon: '👥' },
]

export default function MeetVisualizerPage() {
  const [tab,     setTab]     = useState<Tab>('meets')
  const [meets,   setMeets]   = useState<Meet[]>([])
  const [people,  setPeople]  = useState<Person[]>([])
  const [tribes,  setTribes]  = useState<Tribe[]>([])
  const [loading, setLoading] = useState(true)

  // For opening a specific meet from Dashboard
  const [pendingMeet, setPendingMeet] = useState<Meet | null>(null)

  useEffect(() => {
    const loaded = { meets: false, people: false, tribes: false }
    const check  = () => { if (loaded.meets && loaded.people && loaded.tribes) setLoading(false) }

    const unsub1 = subscribeMeets(data  => { setMeets(data);  if (!loaded.meets)  { loaded.meets  = true; check() } })
    const unsub2 = subscribePeople(data => { setPeople(data); if (!loaded.people) { loaded.people = true; check() } })
    const unsub3 = subscribeTribes(data => { setTribes(data); if (!loaded.tribes) { loaded.tribes = true; check() } })

    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  function handleOpenMeet(meet: Meet) {
    setPendingMeet(meet)
    setTab('meets')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            🕸 Meet Visualizer
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Meeting records, org chart & people network
          </p>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'right' }}>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{meets.length} meets · {people.length} people</div>
          <div>{tribes.length} tribes</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--card-border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', borderRadius: '9px 9px 0 0',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem',
              background: tab === t.id ? 'white' : 'transparent',
              color: tab === t.id ? 'var(--primary)' : 'var(--text-dim)',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          Loading...
        </div>
      ) : (
        <>
          {tab === 'meets' && (
            <MeetsTab
              meets={meets}
              people={people}
              tribes={tribes}
              pendingMeet={pendingMeet}
              onClearPending={() => setPendingMeet(null)}
              onReload={() => {/* real-time via onSnapshot */}}
            />
          )}
          {tab === 'dashboard' && (
            <DashboardTab
              meets={meets}
              people={people}
              onReload={() => {/* real-time */}}
              onOpenMeet={handleOpenMeet}
            />
          )}
          {tab === 'orgchart' && (
            <OrgChartTab meets={meets} people={people} tribes={tribes} />
          )}
          {tab === 'people' && (
            <PeopleTab
              people={people}
              tribes={tribes}
              onReload={() => {/* real-time */}}
            />
          )}
        </>
      )}
    </div>
  )
}
