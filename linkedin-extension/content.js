// SplenditSuite LinkedIn Importer — content script
// Runs on linkedin.com/in/* pages

;(function () {
  'use strict'

  const BUTTON_ID  = 'splendit-fab'
  const OVERLAY_ID = 'splendit-overlay'

  // Cached profile data — extracted when page settles, refreshed on modal open
  let cachedProfile = null

  // ── Helpers ────────────────────────────────────────────────────────────────

  function elText(el) {
    return ((el && (el.innerText || el.textContent)) || '').trim()
  }

  /**
   * Wait for a DOM element matching `selector` to appear.
   * Resolves with the element, or null after `timeout` ms.
   */
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const existing = document.querySelector(selector)
      if (existing) { resolve(existing); return }

      const timer = setTimeout(() => { obs.disconnect(); resolve(null) }, timeout)
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector)
        if (el) { clearTimeout(timer); obs.disconnect(); resolve(el) }
      })
      obs.observe(document.body, { childList: true, subtree: true })
    })
  }

  function queryText(sel) {
    try {
      const el = document.querySelector(sel)
      return elText(el)
    } catch (_) { return '' }
  }

  function queryAllTexts(sel) {
    try {
      const els = document.querySelectorAll(sel)
      const out = []
      els.forEach(el => { const t = elText(el); if (t) out.push(t) })
      return out
    } catch (_) { return [] }
  }

  // ── Extraction ─────────────────────────────────────────────────────────────

  /**
   * Parse document.title — most reliable source on LinkedIn.
   * Formats: "(1) John Doe - Headline | LinkedIn"      (ASCII hyphen)
   *          "(1) John Doe – Headline | LinkedIn"      (en dash, common in EU locales)
   *          "John Doe | LinkedIn"
   */
  function parseTitle() {
    let t = (document.title || '').trim()
    // Strip leading notification count "(N) "
    t = t.replace(/^\(\d+\)\s*/, '')
    // Strip trailing " | LinkedIn"
    const pipeIdx = t.lastIndexOf(' | ')
    if (pipeIdx > 0) t = t.slice(0, pipeIdx).trim()

    // Match both ASCII hyphen ( - ) and en/em dash ( – / — )
    const dashMatch = t.match(/\s[-\u2013\u2014]\s/)
    if (dashMatch) {
      const dashIdx      = t.indexOf(dashMatch[0])
      const namePart     = t.slice(0, dashIdx).trim()
      const headlinePart = t.slice(dashIdx + dashMatch[0].length).trim()
      const parts = namePart.split(/\s+/).filter(Boolean)
      return {
        firstName: parts[0] ?? '',
        lastName:  parts.slice(1).join(' '),
        headline:  headlinePart,
      }
    }
    // No dash — whole thing is probably just the name
    const parts = t.split(/\s+/).filter(Boolean)
    return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' '), headline: '' }
  }

  function extractName() {
    // 1. document.title — always present and reliable
    const fromTitle = parseTitle()
    if (fromTitle.firstName) return { firstName: fromTitle.firstName, lastName: fromTitle.lastName }

    // 2. The single h1 on a LinkedIn profile page
    const h1 = document.querySelector('h1')
    if (h1) {
      const raw   = elText(h1).replace(/\n/g, ' ')
      const parts = raw.split(/\s+/).filter(Boolean)
      if (parts.length >= 1) return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
    }

    return { firstName: '', lastName: '' }
  }

  function extractHeadline() {
    // 1. document.title headline part (works for OTHER people's profiles)
    const { headline: titleHeadline } = parseTitle()
    if (titleHeadline && titleHeadline.length > 2) return titleHeadline

    // 2. Known DOM selectors — ordered by specificity, covering LinkedIn 2023-2025 DOM
    //    including own-profile variants where title has no headline
    const selectors = [
      // 2025 own profile top card
      '.ph5 .text-body-medium.break-words',
      '.pb2.text-body-medium.break-words',
      // 2024-2025 pv-text-details panel
      '.pv-text-details__left-panel .text-body-medium.break-words',
      '.pv-text-details__left-panel div.text-body-medium',
      // Generic
      '.text-body-medium.break-words',
      'div.text-body-medium.break-words',
      'div.text-body-medium',
      // Older versions
      '[data-field="headline"]',
      '.pv-top-card--experience-list-item',
      'h2.text-body-medium',
    ]
    for (const sel of selectors) {
      const t = queryText(sel)
      // Skip values that are clearly not a headline (e.g. connection count)
      if (t && t.length > 3 && t.length < 300 && !/^\d+/.test(t)) return t
    }

    // 3. DOM proximity: first meaningful sibling/cousin after h1
    const h1 = document.querySelector('h1')
    if (h1) {
      let node = h1.parentElement
      for (let depth = 0; depth < 5; depth++) {
        if (!node) break
        const kids  = Array.from(node.children)
        const start = depth === 0 ? kids.indexOf(h1) + 1 : 0
        for (let i = start; i < kids.length; i++) {
          const t = elText(kids[i])
          if (t && t.length > 5 && t.length < 300 && !t.includes('\n\n') && !/^\d+/.test(t)) return t
        }
        node = node.parentElement
      }
    }

    return ''
  }

  function extractLocation() {
    const selectors = [
      '.text-body-small.inline.t-black--light.break-words',
      'span.text-body-small.t-black--light',
      '.pv-top-card--list-bullet li',
      '[data-field="location"]',
    ]
    for (const sel of selectors) {
      const t = queryText(sel)
      if (t) return t
    }
    return ''
  }

  function extractCompany() {
    // Top card experience blurb
    const topCard = [
      '.pv-top-card--experience-list .t-bold span[aria-hidden="true"]',
      'button[aria-label] .hoverable-link-text span[aria-hidden="true"]',
    ]
    for (const sel of topCard) {
      const t = queryText(sel)
      if (t) return t
    }
    // First entry in #experience section
    const exp = document.querySelector('#experience')
    if (exp) {
      const spans = exp.querySelectorAll('span[aria-hidden="true"]')
      for (const s of spans) {
        const t = elText(s)
        if (t && t.length > 1 && t.length < 80) return t
      }
    }
    return ''
  }

  function extractAbout() {
    const section = document.querySelector('#about')
    if (!section) return ''
    const spans = section.querySelectorAll('span[aria-hidden="true"]')
    for (const s of spans) {
      const t = elText(s)
      if (t.length > 30) return t
    }
    const t = elText(section)
    const lines = t.split('\n').map(l => l.trim()).filter(l => l.length > 30)
    return lines[0] || ''
  }

  function extractSkills() {
    const section = document.querySelector('#skills')
    if (!section) return []
    const skills = []
    const selectors = [
      '#skills .mr1.hoverable-link-text span[aria-hidden="true"]',
      '#skills .t-bold span[aria-hidden="true"]',
      '#skills li span[aria-hidden="true"]',
      '#skills span[aria-hidden="true"]',
    ]
    for (const sel of selectors) {
      const texts = queryAllTexts(sel)
      texts.forEach(t => {
        if (t && t.length < 60 && !skills.includes(t)) skills.push(t)
      })
      if (skills.length >= 5) break
    }
    return skills.slice(0, 20)
  }

  function extractLinkedInUrl() {
    return window.location.href.split('?')[0].replace(/\/$/, '')
  }

  function parsePosition(headline) {
    const atIdx = headline.lastIndexOf(' at ')
    if (atIdx > 0) {
      return { title: headline.slice(0, atIdx).trim(), company: headline.slice(atIdx + 4).trim() }
    }
    const pipeIdx = headline.indexOf(' | ')
    if (pipeIdx > 0) {
      return { title: headline.slice(0, pipeIdx).trim(), company: headline.slice(pipeIdx + 3).trim() }
    }
    return { title: headline, company: '' }
  }

  function extractProfileData() {
    const { firstName, lastName } = extractName()
    const headline  = extractHeadline()
    const location  = extractLocation()
    const about     = extractAbout()
    const skills    = extractSkills()
    const linkedIn  = extractLinkedInUrl()

    const { title, company: companyFromHeadline } = parsePosition(headline)
    const company = companyFromHeadline || extractCompany()

    const noteParts = []
    if (company)  noteParts.push(`Company: ${company}`)
    if (location) noteParts.push(`Location: ${location}`)
    if (about)    noteParts.push(`\nAbout:\n${about}`)

    return {
      firstName,
      lastName,
      position: title || headline,
      email:    '',
      phone:    '',
      linkedIn,
      skills,
      note:     noteParts.join('\n'),
      stage:    'new',
    }
  }

  // ── CRM lookup ─────────────────────────────────────────────────────────────

  function lookupCandidate(linkedInUrl) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['apiUrl', 'apiKey'], ({ apiUrl, apiKey }) => {
        if (!apiUrl || !apiKey) { resolve(null); return }
        chrome.runtime.sendMessage(
          { type: 'LOOKUP_CANDIDATE', apiUrl, apiKey, linkedInUrl },
          (response) => {
            if (chrome.runtime.lastError || !response) { resolve(null); return }
            resolve(response)
          }
        )
      })
    })
  }

  // ── Modal HTML ─────────────────────────────────────────────────────────────

  function buildModal(data, mode) {
    const isUpdate  = mode === 'update'
    const skillsStr = (data.skills || []).join(', ')
    const title     = isUpdate ? 'Update in SplenditSuite' : 'Add to SplenditSuite'
    const saveLbl   = isUpdate ? 'Update CRM →' : 'Save to CRM →'
    const badge     = isUpdate
      ? '<span class="spl-badge-update">Already in CRM</span>'
      : ''

    const stageOptions = ['new', 'screening', 'interview', 'offer'].map(s =>
      `<option value="${s}"${data.stage === s ? ' selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join('')

    return `
<div id="${OVERLAY_ID}" class="spl-overlay">
  <div class="spl-backdrop"></div>
  <div class="spl-modal">
    <div class="spl-header">
      <div class="spl-logo">S</div>
      <span class="spl-title">${title}</span>
      ${badge}
      <button class="spl-close" id="spl-close-btn">✕</button>
    </div>

    <div class="spl-body">
      <div class="spl-row">
        <div class="spl-field">
          <label>First Name</label>
          <input id="spl-firstName" type="text" value="${esc(data.firstName)}" />
        </div>
        <div class="spl-field">
          <label>Last Name</label>
          <input id="spl-lastName" type="text" value="${esc(data.lastName)}" />
        </div>
      </div>

      <div class="spl-field">
        <label>Position / Title</label>
        <input id="spl-position" type="text" value="${esc(data.position)}" />
      </div>

      <div class="spl-row">
        <div class="spl-field">
          <label>Email</label>
          <input id="spl-email" type="email" value="${esc(data.email)}" placeholder="email@example.com" />
        </div>
        <div class="spl-field">
          <label>Phone</label>
          <input id="spl-phone" type="text" value="${esc(data.phone)}" placeholder="+421..." />
        </div>
      </div>

      <div class="spl-field">
        <label>LinkedIn URL</label>
        <input id="spl-linkedin" type="text" value="${esc(data.linkedIn)}" />
      </div>

      <div class="spl-field">
        <label>Skills <span class="spl-hint">(comma separated)</span></label>
        <input id="spl-skills" type="text" value="${esc(skillsStr)}" placeholder="Java, Spring, Docker..." />
      </div>

      <div class="spl-field">
        <label>Stage</label>
        <select id="spl-stage">${stageOptions}</select>
      </div>

      <div class="spl-field">
        <label>Notes</label>
        <textarea id="spl-note" rows="3" placeholder="Additional notes...">${esc(data.note)}</textarea>
      </div>

      <div id="spl-error" class="spl-error" style="display:none"></div>
    </div>

    <div class="spl-footer">
      <button class="spl-btn-cancel" id="spl-cancel-btn">Cancel</button>
      <button class="spl-btn-save" id="spl-save-btn">
        <span id="spl-save-label">${saveLbl}</span>
        <span id="spl-save-spinner" style="display:none">Saving...</span>
      </button>
    </div>
  </div>
</div>`
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  // ── Skills lazy-load trigger ───────────────────────────────────────────────

  /**
   * LinkedIn lazy-loads the #skills section — it's not in the DOM until the
   * user scrolls to it. This function scrolls to the section, waits for the
   * content to appear, then scrolls back to the top so the user doesn't notice.
   */
  async function ensureSkillsLoaded() {
    // Already loaded — nothing to do
    if (document.querySelector('#skills span[aria-hidden="true"]')) return

    const section = document.querySelector('#skills')
    if (!section) return

    const prevScrollY = window.scrollY
    section.scrollIntoView({ behavior: 'instant', block: 'center' })

    // Wait up to 2 s for skill items to appear
    await new Promise((resolve) => {
      const deadline = Date.now() + 2000
      const check = setInterval(() => {
        if (document.querySelector('#skills span[aria-hidden="true"]') || Date.now() >= deadline) {
          clearInterval(check)
          resolve()
        }
      }, 150)
    })

    // Scroll back so the user sees the top of the profile
    window.scrollTo({ top: prevScrollY, behavior: 'instant' })
    // Small settle pause before we read the DOM
    await new Promise(resolve => setTimeout(resolve, 150))
  }

  // ── FAB button ─────────────────────────────────────────────────────────────

  function injectFab() {
    if (document.getElementById(BUTTON_ID)) return
    const btn = document.createElement('button')
    btn.id = BUTTON_ID
    btn.className = 'spl-fab'
    btn.title = 'Add to SplenditSuite CRM'
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`
    btn.addEventListener('click', openModal)
    document.body.appendChild(btn)

    // Wait for h1 (LinkedIn React renders it asynchronously), then cache profile
    waitForElement('h1', 6000).then(async () => {
      // Extra tick to let sibling elements (headline, location) also render
      await new Promise(resolve => setTimeout(resolve, 400))
      // Trigger skills lazy-load before caching
      await ensureSkillsLoaded()
      cachedProfile = extractProfileData()
    })
  }

  // ── Modal logic ────────────────────────────────────────────────────────────

  async function openModal() {
    if (document.getElementById(OVERLAY_ID)) return

    // Disable FAB while checking
    const fab = document.getElementById(BUTTON_ID)
    if (fab) { fab.disabled = true; fab.title = 'Checking CRM...' }

    // If skills haven't been loaded yet, trigger lazy-load now
    if (!document.querySelector('#skills span[aria-hidden="true"]')) {
      await ensureSkillsLoaded()
    }

    // Extract fresh profile data (or use cache)
    const fresh = extractProfileData()
    let data    = (fresh.firstName || fresh.lastName) ? fresh : (cachedProfile || fresh)
    // Prefer cached skills if fresh extraction missed them (lazy-load race)
    if ((!fresh.skills || !fresh.skills.length) && cachedProfile && cachedProfile.skills && cachedProfile.skills.length) {
      fresh.skills = cachedProfile.skills.slice()
    }

    // Make a mutable copy
    data = Object.assign({}, data, { skills: (data.skills || []).slice() })

    // Lookup whether this LinkedIn URL is already in CRM
    let mode       = 'add'
    let existingId = null

    if (data.linkedIn) {
      try {
        const result = await lookupCandidate(data.linkedIn)
        if (result && result.found && result.id) {
          mode       = 'update'
          existingId = result.id
          const existing = result.candidate || {}

          // Merge: keep manually-set CRM fields, refresh position/skills from LinkedIn
          data = {
            firstName: existing.firstName || data.firstName,
            lastName:  existing.lastName  || data.lastName,
            email:     existing.email     || data.email     || '',
            phone:     existing.phone     || data.phone     || '',
            stage:     existing.stage     || data.stage,
            note:      existing.note      || data.note      || '',
            linkedIn:  data.linkedIn,
            // Prefer fresh LinkedIn data for these (the point of updating)
            position:  data.position || existing.position   || '',
            skills:    data.skills.length ? data.skills : (existing.skills || []),
          }
        }
      } catch (_) {
        // Lookup failed — proceed with add mode silently
      }
    }

    if (fab) { fab.disabled = false; fab.title = 'Add to SplenditSuite CRM' }

    const div = document.createElement('div')
    div.innerHTML = buildModal(data, mode)
    const overlay = div.firstElementChild
    document.body.appendChild(overlay)

    overlay.querySelector('#spl-close-btn').addEventListener('click', closeModal)
    overlay.querySelector('#spl-cancel-btn').addEventListener('click', closeModal)
    overlay.querySelector('.spl-backdrop').addEventListener('click', closeModal)
    overlay.querySelector('#spl-save-btn').addEventListener('click', () => handleSave(mode, existingId))

    // Focus first empty required field
    const firstNameEl = overlay.querySelector('#spl-firstName')
    const lastNameEl  = overlay.querySelector('#spl-lastName')
    if (firstNameEl && !firstNameEl.value) firstNameEl.focus()
    else if (lastNameEl && !lastNameEl.value) lastNameEl.focus()
    else if (firstNameEl) firstNameEl.focus()

    document.addEventListener('keydown', onKeyDown)
  }

  function closeModal() {
    const overlay = document.getElementById(OVERLAY_ID)
    if (overlay) overlay.remove()
    document.removeEventListener('keydown', onKeyDown)
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') closeModal()
  }

  async function handleSave(mode, existingId) {
    const firstName = document.getElementById('spl-firstName').value.trim()
    const lastName  = document.getElementById('spl-lastName').value.trim()
    const position  = document.getElementById('spl-position').value.trim()
    const email     = document.getElementById('spl-email').value.trim()
    const phone     = document.getElementById('spl-phone').value.trim()
    const linkedIn  = document.getElementById('spl-linkedin').value.trim()
    const skillsRaw = document.getElementById('spl-skills').value.trim()
    const stage     = document.getElementById('spl-stage').value
    const note      = document.getElementById('spl-note').value.trim()

    document.getElementById('spl-error').style.display = 'none'

    if (!firstName || !lastName) {
      showError('First name and last name are required.')
      return
    }

    const skills = skillsRaw
      ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const payload = {
      firstName, lastName, position, stage,
      ...(email    && { email }),
      ...(phone    && { phone }),
      ...(linkedIn && { linkedIn }),
      ...(skills.length && { skills }),
      ...(note     && { note }),
    }

    if (mode === 'update' && existingId) {
      payload.id = existingId
    }

    setLoading(true)

    chrome.storage.sync.get(['apiUrl', 'apiKey'], ({ apiUrl, apiKey }) => {
      if (!apiUrl || !apiKey) {
        setLoading(false)
        showError('Extension not configured. Click the S icon in your toolbar to set API URL and key.')
        return
      }

      const msgType = mode === 'update' ? 'UPDATE_CANDIDATE' : 'IMPORT_CANDIDATE'

      chrome.runtime.sendMessage(
        { type: msgType, apiUrl, apiKey, payload },
        (response) => {
          setLoading(false)
          if (chrome.runtime.lastError) {
            showError(`Extension error: ${chrome.runtime.lastError.message}`)
            return
          }
          if (!response || !response.ok) {
            showError(`Error: ${(response && response.error) || 'Unknown error'}`)
            return
          }
          if (mode === 'update') {
            showSuccessUpdate(firstName, lastName)
          } else {
            showSuccess(firstName, lastName)
          }
        }
      )
    })
  }

  function setLoading(on) {
    document.getElementById('spl-save-btn').disabled = on
    document.getElementById('spl-save-label').style.display   = on ? 'none'   : 'inline'
    document.getElementById('spl-save-spinner').style.display = on ? 'inline' : 'none'
  }

  function showError(msg) {
    const el = document.getElementById('spl-error')
    el.textContent = msg
    el.style.display = 'block'
  }

  function showSuccess(firstName, lastName) {
    closeModal()
    const toast = document.createElement('div')
    toast.className = 'spl-toast'
    toast.innerHTML = `<span>✓</span> ${firstName} ${lastName} added to SplenditSuite`
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3500)
  }

  function showSuccessUpdate(firstName, lastName) {
    closeModal()
    const toast = document.createElement('div')
    toast.className = 'spl-toast spl-toast-update'
    toast.innerHTML = `<span>✓</span> ${firstName} ${lastName} updated in SplenditSuite`
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3500)
  }

  // ── SPA navigation: re-inject FAB when URL changes ────────────────────────

  let lastUrl = location.href
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      cachedProfile = null
      if (/linkedin\.com\/in\//.test(location.href)) {
        const existing = document.getElementById(BUTTON_ID)
        if (existing) existing.remove()
        setTimeout(injectFab, 1500) // wait for LinkedIn SPA render
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  // ── Init ──────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectFab, 1000))
  } else {
    setTimeout(injectFab, 1000)
  }
})()
