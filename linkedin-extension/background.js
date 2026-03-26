// SplenditSuite LinkedIn Importer — background service worker
// Handles API calls on behalf of the content script,
// bypassing LinkedIn's window.fetch interceptor.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'IMPORT_CANDIDATE') return false

  const { apiUrl, apiKey, payload } = msg

  fetch(`${apiUrl.replace(/\/$/, '')}/api/crm/linkedin-import`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })
    .then(async res => {
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        sendResponse({ ok: false, error: json.error || `HTTP ${res.status}` })
      } else {
        sendResponse({ ok: true, id: json.id })
      }
    })
    .catch(err => {
      sendResponse({ ok: false, error: err.message })
    })

  return true // keep message channel open for async response
})
