const apiUrlInput  = document.getElementById('apiUrl')
const apiKeyInput  = document.getElementById('apiKey')
const saveBtn      = document.getElementById('saveBtn')
const statusEl     = document.getElementById('status')
const settingsLink = document.getElementById('settingsLink')

// Load saved settings
chrome.storage.sync.get(['apiUrl', 'apiKey'], ({ apiUrl, apiKey }) => {
  if (apiUrl) {
    apiUrlInput.value = apiUrl
    settingsLink.href = `${apiUrl}/settings/extension`
  }
  if (apiKey) apiKeyInput.value = apiKey
})

saveBtn.addEventListener('click', () => {
  const apiUrl = apiUrlInput.value.trim().replace(/\/$/, '')
  const apiKey = apiKeyInput.value.trim()

  if (!apiUrl) {
    showStatus('SplenditSuite URL is required.', false)
    return
  }
  if (!apiKey) {
    showStatus('API key is required.', false)
    return
  }

  chrome.storage.sync.set({ apiUrl, apiKey }, () => {
    settingsLink.href = `${apiUrl}/settings/extension`
    showStatus('Settings saved!', true)
  })
})

function showStatus(msg, ok) {
  statusEl.textContent = msg
  statusEl.className   = `status ${ok ? 'ok' : 'err'}`
  statusEl.style.display = 'block'
  setTimeout(() => { statusEl.style.display = 'none' }, 3000)
}
