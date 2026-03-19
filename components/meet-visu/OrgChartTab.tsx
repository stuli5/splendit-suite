'use client'

import { useEffect, useRef, useState } from 'react'
import type { Person, Meet, Tribe } from '@/lib/types'
import { initials, shortName } from '@/lib/meet-visu'

type ViewMode = 'force' | 'tree' | 'tribe'

interface Props {
  people: Person[]
  meets:  Meet[]
  tribes: Tribe[]
}

export default function OrgChartTab({ people, meets, tribes }: Props) {
  const [mode, setMode]               = useState<ViewMode>('force')
  const [tribeFilter, setTribeFilter] = useState('')
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !wrapRef.current) return
    let cancelled = false

    import('d3').then(d3 => {
      if (cancelled || !svgRef.current || !wrapRef.current) return

      const svg = d3.select(svgRef.current)
      const W   = wrapRef.current.clientWidth  || 800
      const H   = wrapRef.current.clientHeight || 560

      svg.selectAll('*').remove()
      svg.attr('viewBox', `0 0 ${W} ${H}`)

      const filtered = tribeFilter ? people.filter(p => p.tribe === tribeFilter) : people

      // Participation counts
      const partCount: Record<string, number> = {}
      meets.forEach(m => {
        ;(m.participants || '').split(',').map(s => s.trim()).filter(Boolean).forEach(name => {
          partCount[name] = (partCount[name] || 0) + 1
        })
      })

      // Tribe color palette
      const TRIBE_COLORS: Record<string, string> = {}
      const palette = ['#00a87a', '#0091c7', '#6b46a8', '#e0457a', '#f59e0b', '#10b981', '#7ab8ae', '#ec4899']
      ;[...new Set(people.map(p => p.tribe).filter(Boolean))].forEach((t, i) => {
        const found = tribes.find(x => x.name === t)
        TRIBE_COLORS[t] = found?.color || palette[i % palette.length]
      })

      if (mode === 'force') {
        renderForce(d3, svg, W, H, filtered, meets, partCount, TRIBE_COLORS)
      } else if (mode === 'tree') {
        renderTree(d3, svg, W, H, filtered, partCount, TRIBE_COLORS)
      } else {
        renderTribe(d3, svg, W, H, filtered, tribes, partCount, TRIBE_COLORS)
      }
    })

    return () => { cancelled = true }
  }, [people, meets, tribes, mode, tribeFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['force', 'tree', 'tribe'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setMode(v)}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem',
              background: mode === v ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(0,168,122,0.08)',
              color: mode === v ? 'white' : 'var(--primary)',
              transition: 'all 0.15s',
            }}
          >
            {v === 'force' ? '⚡ Network' : v === 'tree' ? '🏢 Org Chart' : '🏷 Tribes'}
          </button>
        ))}
        <select
          value={tribeFilter}
          onChange={e => setTribeFilter(e.target.value)}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">All tribes</option>
          {tribes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: 4 }}>
          {people.length} people · {meets.length} meets
        </span>
      </div>

      {/* Legend */}
      {mode === 'force' && (
        <div style={{ display: 'flex', gap: 20, fontSize: '0.7rem', color: 'var(--text-dim)', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#6b46a8" strokeWidth="2.5" /></svg>
            Supervisor
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#bbb" strokeWidth="1.2" strokeDasharray="3,3" /></svg>
            Co-participation
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="white" stroke="#aaa" strokeWidth="2" /></svg>
            Larger = more reports
          </span>
        </div>
      )}

      {/* Canvas */}
      <div ref={wrapRef} className="glass-card" style={{ height: 580, overflow: 'hidden', position: 'relative' }}>
        {people.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
            No people in database. Add people in the People tab.
          </div>
        ) : (
          <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface OrgNode {
  id:       string
  name:     string
  role:     string
  level:    string
  tribe:    string
  photo:    string
  count:    number       // meet participation
  reports:  number       // direct reports count
  children: OrgNode[]
}

function buildOrgTree(people: Person[], partCount: Record<string, number>): OrgNode {
  const byName: Record<string, OrgNode> = {}
  people.forEach(p => {
    byName[p.name] = {
      id: p.id, name: p.name, role: p.role || '', level: p.level || '',
      tribe: p.tribe || '', photo: p.photo || '',
      count: partCount[p.name] || 0, reports: 0, children: [],
    }
  })

  const roots: OrgNode[] = []
  people.forEach(p => {
    if (p.supervisor && byName[p.supervisor]) {
      byName[p.supervisor].children.push(byName[p.name])
      byName[p.supervisor].reports++
    } else {
      roots.push(byName[p.name])
    }
  })

  if (roots.length === 1) return roots[0]
  return {
    id: '__root__', name: 'Splendit', role: '', level: '', tribe: '',
    photo: '', count: 0, reports: roots.length, children: roots,
  }
}

// Level → visual weight
const LEVEL_R: Record<string, number> = {
  'C-Level': 22, 'Director': 20, 'Tribe Lead': 18, 'Manager': 17,
  'Lead': 15, 'Senior': 13, 'Mid': 11, 'Junior': 10,
}
function nodeR(d: OrgNode): number {
  return LEVEL_R[d.level] ?? (10 + Math.min(d.reports, 4) * 2)
}

// ─── Force / Network ──────────────────────────────────────────────────────────

function renderForce(
  d3: typeof import('d3'),
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  W: number, H: number,
  people: Person[], meets: Meet[],
  partCount: Record<string, number>,
  TRIBE_COLORS: Record<string, string>,
) {
  interface FNode extends d3.SimulationNodeDatum {
    id: string; name: string; role: string; level: string
    tribe: string; supervisor: string; count: number; reports: number
  }
  interface FLink extends d3.SimulationLinkDatum<FNode> { type: 'mgmt' | 'meet'; strength: number }

  const reportCount: Record<string, number> = {}
  people.forEach(p => { if (p.supervisor) reportCount[p.supervisor] = (reportCount[p.supervisor] || 0) + 1 })

  const nodes: FNode[] = people.map(p => ({
    id: p.id, name: p.name, role: p.role || '', level: p.level || '',
    tribe: p.tribe || '', supervisor: p.supervisor || '',
    count: partCount[p.name] || 0, reports: reportCount[p.name] || 0,
    x: W / 2 + (Math.random() - 0.5) * 200,
    y: H / 2 + (Math.random() - 0.5) * 200,
  }))

  const links: FLink[] = []

  // Primary: supervisor links
  people.forEach(p => {
    if (!p.supervisor) return
    const src = nodes.find(n => n.name === p.supervisor)
    const tgt = nodes.find(n => n.name === p.name)
    if (src && tgt) links.push({ source: src.id, target: tgt.id, type: 'mgmt', strength: 3 })
  })

  // Secondary: co-participation (skip if mgmt link exists)
  const meetMap: Record<string, number> = {}
  meets.forEach(m => {
    const parts = (m.participants || '').split(',').map(s => s.trim()).filter(Boolean)
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = people.find(p => p.name === parts[i])
        const b = people.find(p => p.name === parts[j])
        if (!a || !b) continue
        const key = [a.id, b.id].sort().join('--')
        meetMap[key] = (meetMap[key] || 0) + 1
      }
    }
  })
  Object.entries(meetMap).forEach(([key, cnt]) => {
    const [src, tgt] = key.split('--')
    const hasMgmt = links.find(l =>
      (l.source === src && l.target === tgt) || (l.source === tgt && l.target === src)
    )
    if (!hasMgmt) links.push({ source: src, target: tgt, type: 'meet', strength: cnt })
  })

  // Node radius by level / reports
  const NODE_BASE = 20
  const R = (d: FNode) => {
    if (d.level === 'C-Level')    return NODE_BASE + 10
    if (d.level === 'Director')   return NODE_BASE + 8
    if (d.level === 'Tribe Lead') return NODE_BASE + 6
    if (d.level === 'Manager')    return NODE_BASE + 5
    if (d.level === 'Lead')       return NODE_BASE + 3
    return NODE_BASE + Math.min(d.reports, 3)
  }

  // Tribe color — fallback grey for no tribe
  const nodeColor = (d: FNode) => d.tribe ? TRIBE_COLORS[d.tribe] : '#bbb'
  const isLeader  = (d: FNode) => ['C-Level', 'Director', 'Tribe Lead', 'Manager'].includes(d.level)

  // Arrow marker (subtle)
  const defs = svg.append('defs')
  defs.append('marker')
    .attr('id', 'arr').attr('viewBox', '0 -3 6 6').attr('refX', 6).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
    .append('path').attr('d', 'M0,-3L6,0L0,3Z').attr('fill', '#6b46a8').attr('opacity', 0.5)

  const g = svg.append('g')
  svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 4]).on('zoom', e => g.attr('transform', e.transform)) as never)

  const mgmtLinks = links.filter(l => l.type === 'mgmt')
  const meetLinks = links.filter(l => l.type === 'meet')

  // 1. Meet links — very thin, light grey dashes
  const meetEl = g.append('g').selectAll('line')
    .data(meetLinks).join('line')
    .attr('stroke', '#ddd')
    .attr('stroke-width', (d: FLink) => Math.min(d.strength * 0.4 + 0.4, 2))
    .attr('stroke-dasharray', '3,4')

  // 2. Mgmt links — solid, tribe-colored, with arrow
  const mgmtEl = g.append('g').selectAll('line')
    .data(mgmtLinks).join('line')
    .attr('stroke', (d: FLink) => {
      const tgt = typeof d.target === 'object' ? (d.target as FNode) : nodes.find(n => n.id === d.target)
      return tgt?.tribe ? TRIBE_COLORS[tgt.tribe] : '#6b46a8'
    })
    .attr('stroke-width', 2.2)
    .attr('stroke-opacity', 0.65)
    .attr('marker-end', 'url(#arr)')

  // 3. Nodes
  const nodeEl = g.append('g').selectAll('g')
    .data(nodes).join('g')
    .attr('cursor', 'pointer')
    .call(d3.drag<SVGGElement, FNode>()
      .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
      .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
      .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }) as never)

  // Outer glow ring for leaders
  nodeEl.append('circle')
    .attr('r', (d: FNode) => isLeader(d) ? R(d) + 6 : 0)
    .attr('fill', (d: FNode) => nodeColor(d) + '18')
    .attr('stroke', 'none')

  // White fill + tribe border (consistent with tree)
  nodeEl.append('circle')
    .attr('r', R)
    .attr('fill', 'white')
    .attr('stroke', nodeColor)
    .attr('stroke-width', (d: FNode) => isLeader(d) ? 3 : 2)
    .attr('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.08))')

  // Initials
  nodeEl.append('text')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('fill', nodeColor)
    .attr('font-size', (d: FNode) => Math.max(8, R(d) * 0.5))
    .attr('font-weight', '700').attr('font-family', 'Syne, sans-serif')
    .attr('pointer-events', 'none')
    .text((d: FNode) => initials(d.name))

  // Short name below node
  nodeEl.append('text')
    .attr('x', 0).attr('y', (d: FNode) => R(d) + 12)
    .attr('text-anchor', 'middle')
    .attr('fill', '#1a2e2a')
    .attr('font-size', 9).attr('font-weight', '600').attr('font-family', 'Syne, sans-serif')
    .attr('pointer-events', 'none')
    .text((d: FNode) => shortName(d.name))

  // Role/level label (subtle)
  nodeEl.append('text')
    .attr('x', 0).attr('y', (d: FNode) => R(d) + 23)
    .attr('text-anchor', 'middle')
    .attr('fill', '#aaa')
    .attr('font-size', 7.5).attr('font-family', 'Syne, sans-serif')
    .attr('pointer-events', 'none')
    .text((d: FNode) => {
      const label = d.level || d.role || ''
      return label.length > 16 ? label.slice(0, 15) + '…' : label
    })

  // Tooltip
  const tip = d3.select('body').append('div')
    .style('position', 'fixed').style('pointer-events', 'none')
    .style('background', 'white').style('border', '1px solid rgba(0,0,0,0.08)')
    .style('border-radius', '10px').style('padding', '10px 14px')
    .style('font-size', '0.75rem').style('color', '#1a2e2a').style('line-height', '1.6')
    .style('box-shadow', '0 4px 20px rgba(0,0,0,0.1)').style('opacity', '0')
    .style('transition', 'opacity 0.12s').style('z-index', '9999')

  nodeEl
    .on('mouseover', (e, d: FNode) => {
      tip.style('opacity', '1').html([
        `<strong style="font-size:.82rem">${d.name}</strong>`,
        d.role    ? `<span style="color:#888">${d.role}</span>` : '',
        d.level   ? `<span style="color:#6b46a8;font-weight:600">${d.level}</span>` : '',
        d.tribe   ? `<span style="color:${nodeColor(d)};font-weight:600">● ${d.tribe}</span>` : '',
        d.supervisor ? `<span style="color:#aaa">↑ ${d.supervisor}</span>` : '',
        d.reports > 0 ? `<span style="color:#00a87a">👥 ${d.reports} direct reports</span>` : '',
        d.count   > 0 ? `<span style="color:#0091c7">📅 ${d.count} meets</span>` : '',
      ].filter(Boolean).join('<br>'))
    })
    .on('mousemove', e => tip.style('left', (e.clientX + 14) + 'px').style('top', (e.clientY - 36) + 'px'))
    .on('mouseleave', () => tip.style('opacity', '0'))

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink<FNode, FLink>(links).id(d => d.id)
      .distance((d: FLink) => d.type === 'mgmt' ? 110 : 160)
      .strength((d: FLink) => d.type === 'mgmt' ? 0.7 : 0.08))
    .force('charge', d3.forceManyBody().strength(-320))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide<FNode>().radius(d => R(d) + 18))
    .on('tick', () => {
      meetEl
        .attr('x1', (d: FLink) => (d.source as FNode).x ?? 0)
        .attr('y1', (d: FLink) => (d.source as FNode).y ?? 0)
        .attr('x2', (d: FLink) => (d.target as FNode).x ?? 0)
        .attr('y2', (d: FLink) => (d.target as FNode).y ?? 0)
      mgmtEl
        .attr('x1', (d: FLink) => (d.source as FNode).x ?? 0)
        .attr('y1', (d: FLink) => (d.source as FNode).y ?? 0)
        .attr('x2', (d: FLink) => {
          const s = d.source as FNode; const t = d.target as FNode
          const dx = (t.x ?? 0) - (s.x ?? 0); const dy = (t.y ?? 0) - (s.y ?? 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          return (t.x ?? 0) - (dx / dist) * (R(t) + 6)
        })
        .attr('y2', (d: FLink) => {
          const s = d.source as FNode; const t = d.target as FNode
          const dx = (t.x ?? 0) - (s.x ?? 0); const dy = (t.y ?? 0) - (s.y ?? 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          return (t.y ?? 0) - (dy / dist) * (R(t) + 6)
        })
      nodeEl.attr('transform', (d: FNode) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

  svg.node()?.addEventListener('DOMNodeRemovedFromDocument', () => tip.remove(), { once: true })
}

// ─── Vertical Org Chart Tree ──────────────────────────────────────────────────

function renderTree(
  d3: typeof import('d3'),
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  W: number, H: number,
  people: Person[],
  partCount: Record<string, number>,
  TRIBE_COLORS: Record<string, string>,
) {
  const NODE_R    = 22   // uniform radius for all visible nodes
  const LEVEL_SEP = 110  // vertical distance between levels
  const NODE_SEP  = 58   // horizontal distance between siblings

  const raw = buildOrgTree(people, partCount)
  // Use a virtual hidden root so multiple roots are shown at same Y level
  const virtualRoot: OrgNode = raw.id === '__root__' ? raw : {
    id: '__root__', name: '', role: '', level: '', tribe: '', photo: '', count: 0, reports: 1,
    children: [raw],
  }

  const layout = d3.tree<OrgNode>()
    .nodeSize([NODE_SEP, LEVEL_SEP])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.4))

  const hier = d3.hierarchy<OrgNode>(virtualRoot)
  layout(hier)

  // Compute bounds to center
  let minX = Infinity, maxX = -Infinity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hier.each((d: any) => { if (d.x < minX) minX = d.x; if (d.x > maxX) maxX = d.x })
  const offsetX = W / 2 - (minX + maxX) / 2

  const g = svg.append('g').attr('transform', `translate(${offsetX}, 50)`)
  svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 4]).on('zoom', e => g.attr('transform', e.transform)) as never)

  // Links — skip any link whose source is the virtual hidden root
  const visibleLinks = hier.links().filter(l => l.source.data.id !== '__root__')

  g.append('g').selectAll('path')
    .data(visibleLinks).join('path')
    .attr('fill', 'none')
    .attr('stroke', (d: d3.HierarchyLink<OrgNode>) => {
      const c = d.target.data.tribe ? TRIBE_COLORS[d.target.data.tribe] : '#ccc'
      return c
    })
    .attr('stroke-width', 1.6)
    .attr('stroke-dasharray', '5,4')
    .attr('opacity', 0.7)
    .attr('d', d3.linkVertical<d3.HierarchyPointLink<OrgNode>, d3.HierarchyPointNode<OrgNode>>()
      .x(d => d.x).y(d => d.y) as never)

  // Nodes — skip virtual root (depth === 0 AND id === '__root__')
  const visibleNodes = hier.descendants().filter(d => d.data.id !== '__root__')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node: any = g.append('g').selectAll('g')
    .data(visibleNodes).join('g')
    .attr('transform', (d: d3.HierarchyNode<OrgNode>) =>
      `translate(${(d as d3.HierarchyPointNode<OrgNode>).x ?? 0},${(d as d3.HierarchyPointNode<OrgNode>).y ?? 0})`)
    .attr('cursor', 'pointer')

  const color = (d: d3.HierarchyPointNode<OrgNode>) =>
    d.data.tribe ? TRIBE_COLORS[d.data.tribe] : '#aaa'

  const isManager = (d: d3.HierarchyPointNode<OrgNode>) =>
    ['C-Level', 'Director', 'Tribe Lead', 'Manager'].includes(d.data.level)

  // Outer glow for managers
  node.append('circle')
    .attr('r', (d: d3.HierarchyPointNode<OrgNode>) => isManager(d) ? NODE_R + 5 : 0)
    .attr('fill', (d: d3.HierarchyPointNode<OrgNode>) => color(d) + '22')
    .attr('stroke', 'none')

  // White fill + thick tribe-colored border (matching original style)
  node.append('circle')
    .attr('r', NODE_R)
    .attr('fill', 'white')
    .attr('stroke', color)
    .attr('stroke-width', (d: d3.HierarchyPointNode<OrgNode>) => isManager(d) ? 3 : 2)

  // Initials
  node.append('text')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('fill', color)
    .attr('font-size', 10).attr('font-weight', '700').attr('font-family', 'Syne, sans-serif')
    .attr('pointer-events', 'none')
    .text((d: d3.HierarchyPointNode<OrgNode>) => initials(d.data.name))

  // Short name below ("Petr D.")
  node.append('text')
    .attr('x', 0).attr('y', NODE_R + 12)
    .attr('text-anchor', 'middle')
    .attr('fill', '#1a2e2a')
    .attr('font-size', 9).attr('font-weight', '600').attr('font-family', 'Syne, sans-serif')
    .attr('pointer-events', 'none')
    .text((d: d3.HierarchyPointNode<OrgNode>) => shortName(d.data.name))

  // Role below name (truncated, dim)
  node.append('text')
    .attr('x', 0).attr('y', NODE_R + 23)
    .attr('text-anchor', 'middle')
    .attr('fill', '#888')
    .attr('font-size', 7.5).attr('font-family', 'Syne, sans-serif')
    .attr('pointer-events', 'none')
    .text((d: d3.HierarchyPointNode<OrgNode>) => {
      const label = d.data.role || d.data.level || ''
      return label.length > 16 ? label.slice(0, 15) + '…' : label
    })

  // Tooltip
  const tip = d3.select('body').append('div')
    .style('position', 'fixed').style('pointer-events', 'none')
    .style('background', 'white').style('border', '1px solid rgba(0,168,122,0.2)')
    .style('border-radius', '8px').style('padding', '9px 13px')
    .style('font-size', '0.75rem').style('color', '#1a2e2a').style('line-height', '1.6')
    .style('box-shadow', '0 4px 16px rgba(0,0,0,0.12)').style('opacity', '0')
    .style('transition', 'opacity 0.15s').style('z-index', '9999')

  node
    .on('mouseover', (e: MouseEvent, d: d3.HierarchyPointNode<OrgNode>) => {
      tip.style('opacity', '1').html([
        `<strong>${d.data.name}</strong>`,
        d.data.role    ? `<span style="color:#888">${d.data.role}</span>` : '',
        d.data.level   ? `<span style="color:#6b46a8;font-weight:600">${d.data.level}</span>` : '',
        d.data.tribe   ? `<span style="color:${color(d)}">${d.data.tribe}</span>` : '',
        d.data.reports > 0 ? `👥 ${d.data.reports} direct reports` : '',
        d.data.count   > 0 ? `📅 ${d.data.count} meets` : '',
      ].filter(Boolean).join('<br>'))
    })
    .on('mousemove', (e: MouseEvent) => tip.style('left', (e.clientX + 14) + 'px').style('top', (e.clientY - 32) + 'px'))
    .on('mouseleave', () => tip.style('opacity', '0'))

  // Tribe legend (bottom-left)
  const usedTribes = [...new Set(people.map(p => p.tribe).filter(Boolean))]
  usedTribes.forEach((tribe, i) => {
    const lg = svg.append('g').attr('transform', `translate(16, ${H - 16 - i * 18})`)
    lg.append('circle').attr('r', 5).attr('fill', TRIBE_COLORS[tribe] || '#aaa')
    lg.append('text').attr('x', 10).attr('dominant-baseline', 'central')
      .attr('font-size', 9).attr('fill', '#888').attr('font-family', 'Syne, sans-serif')
      .text(tribe)
  })

  svg.node()?.addEventListener('DOMNodeRemovedFromDocument', () => tip.remove(), { once: true })
}

// ─── Tribe bubbles ────────────────────────────────────────────────────────────

function renderTribe(
  d3: typeof import('d3'),
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  W: number, H: number,
  people: Person[], tribes: Tribe[],
  partCount: Record<string, number>,
  TRIBE_COLORS: Record<string, string>,
) {
  const tribeMap: Record<string, Person[]> = {}
  people.forEach(p => {
    const t = p.tribe || 'Ungrouped'
    if (!tribeMap[t]) tribeMap[t] = []
    tribeMap[t].push(p)
  })

  const tribeList = Object.entries(tribeMap)
  const cols = Math.ceil(Math.sqrt(tribeList.length))
  const cW   = W / cols
  const cH   = H / Math.ceil(tribeList.length / cols)

  const g = svg.append('g')
  svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)) as never)

  tribeList.forEach(([tribe, members], ti) => {
    const col = ti % cols
    const row = Math.floor(ti / cols)
    const cx  = col * cW + cW / 2
    const cy  = row * cH + cH / 2
    const R   = Math.min(cW, cH) * 0.4
    const c   = TRIBE_COLORS[tribe] || '#7ab8ae'

    const tg = g.append('g').attr('transform', `translate(${cx},${cy})`)

    tg.append('circle').attr('r', R).attr('fill', c + '0c').attr('stroke', c + '55').attr('stroke-width', 1.5)
    tg.append('text').attr('text-anchor', 'middle').attr('y', -R + 16)
      .attr('fill', c).attr('font-size', 11).attr('font-weight', '700').attr('font-family', 'Syne, sans-serif')
      .text(tribe)
    tg.append('text').attr('text-anchor', 'middle').attr('y', -R + 28)
      .attr('fill', 'var(--text-dim)').attr('font-size', 8.5)
      .text(`${members.length} people`)

    // Sort: managers/leads first, then by name
    const sorted = [...members].sort((a, b) => {
      const rA = LEVEL_R[a.level] ?? 0; const rB = LEVEL_R[b.level] ?? 0
      return rB - rA
    })

    sorted.slice(0, 14).forEach((p, pi) => {
      const angle  = (pi / Math.max(sorted.length, 1)) * 2 * Math.PI - Math.PI / 2
      const pr     = R * 0.6
      const px     = sorted.length === 1 ? 0 : Math.cos(angle) * pr
      const py     = sorted.length === 1 ? 0 : Math.sin(angle) * pr
      const nr     = LEVEL_R[p.level] ?? (9 + Math.sqrt(partCount[p.name] || 0) * 1.5)
      const isLead = ['Tribe Lead', 'Manager', 'Director', 'C-Level'].includes(p.level)

      const ng = tg.append('g').attr('transform', `translate(${px},${py})`).attr('cursor', 'pointer')

      if (isLead) ng.append('circle').attr('r', nr + 5).attr('fill', c + '15')
      ng.append('circle').attr('r', nr).attr('fill', c + '28').attr('stroke', c)
        .attr('stroke-width', isLead ? 2.2 : 1.2)

      ng.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', c).attr('font-size', Math.max(6.5, nr * 0.55)).attr('font-weight', '700')
        .attr('font-family', 'Syne, sans-serif').attr('pointer-events', 'none')
        .text(initials(p.name))

      ng.append('title').text([p.name, p.level || p.role, p.supervisor ? `↑ ${p.supervisor}` : ''].filter(Boolean).join('\n'))
    })

    if (members.length > 14) {
      tg.append('text').attr('text-anchor', 'middle').attr('y', R - 10)
        .attr('fill', 'var(--text-dim)').attr('font-size', 8)
        .text(`+${members.length - 14} more`)
    }
  })
}
