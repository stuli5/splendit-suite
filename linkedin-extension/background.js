// SplenditSuite LinkedIn Importer — background service worker
// Handles API calls on behalf of the content script,
// bypassing LinkedIn's window.fetch interceptor.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const base = (msg.apiUrl || '').replace(/\/$/, '')

  if (msg.type === 'IMPORT_CANDIDATE') {
    fetch(`${base}/api/crm/linkedin-import`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${msg.apiKey}`,
      },
      body: JSON.stringify(msg.payload),
    })
      .then(async res => {
        const json = await res.json().catch(() => ({}))
        sendResponse(res.ok ? { ok: true, id: json.id } : { ok: false, error: json.error || `HTTP ${res.status}` })
      })
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (msg.type === 'UPDATE_CANDIDATE') {
    fetch(`${base}/api/crm/linkedin-update`, {
      method:  'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${msg.apiKey}`,
      },
      body: JSON.stringify(msg.payload),
    })
      .then(async res => {
        const json = await res.json().catch(() => ({}))
        sendResponse(res.ok ? { ok: true } : { ok: false, error: json.error || `HTTP ${res.status}` })
      })
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (msg.type === 'LOOKUP_CANDIDATE') {
    const url = encodeURIComponent(msg.linkedInUrl)
    fetch(`${base}/api/crm/linkedin-lookup?url=${url}`, {
      method:  'GET',
      headers: { 'Authorization': `Bearer ${msg.apiKey}` },
    })
      .then(async res => {
        const json = await res.json().catch(() => ({}))
        sendResponse(res.ok ? json : { ok: false, error: json.error || `HTTP ${res.status}` })
      })
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true
  }

  return false
})
