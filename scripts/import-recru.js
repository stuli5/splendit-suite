/**
 * Recru → SplenditSuite CRM Migration Script
 *
 * Usage:
 *   node scripts/import-recru.js <path-to-recru-export.xlsx>
 *
 * Reads candidates from a Recru XLSX export and imports them into
 * the Firestore `crmCandidates` collection.
 *
 * Required env vars (from .env.local):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */

'use strict'

const path   = require('path')
const fs     = require('fs')
const ExcelJS = require('exceljs')
const { initializeApp } = require('firebase/app')
const { getFirestore, collection, addDoc } = require('firebase/firestore')

// ── Load .env.local ──────────────────────────────────────────────────────────

const envPath = path.resolve(__dirname, '../.env.local')
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env.local not found at', envPath)
  process.exit(1)
}
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const [k, ...rest] = l.split('=')
      return [k.trim(), rest.join('=').trim()]
    })
)

// ── Firebase init ────────────────────────────────────────────────────────────

const app = initializeApp({
  apiKey:            env['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain:        env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId:         env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  storageBucket:     env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId:             env['NEXT_PUBLIC_FIREBASE_APP_ID'],
})
const db = getFirestore(app)

// ── Tag parsing ──────────────────────────────────────────────────────────────
// Recru exports tags space-separated but tags can be multi-word.
// Known multi-word tags from Recru are listed here for exact matching.
// Add more as needed.

const KNOWN_MULTIWORD_TAGS = [
  'Anglický jazyk', 'Chorvatský jazyk', 'Ruský jazyk', 'Ukrajinský jazyk',
  'Německý jazyk', 'Francouzský jazyk', 'Španělský jazyk', 'Italský jazyk',
  'Polský jazyk', 'Slovenský jazyk', 'Český jazyk', 'Anglický Jazyk',
  '.NET Framework', 'Full Stack vývojář', 'Full Stack Developer',
  'Administrace MySQL', 'Internet Information Services',
  'Microsoft Access', 'Microsoft SQL Server', 'Microsoft Azure',
  'Windows Presentation Foundation', 'Windows Forms',
  'Umělá inteligence', 'Strojové učení',
  'Node.js', 'Vue.js', 'Next.js', 'Nuxt.js',
  'React Native', 'React.js',
  'Spring Boot', 'Spring Framework',
  'Entity Framework', 'ASP.NET', 'ASP.NET Core',
  'AWS Lambda', 'Amazon Web Services', 'Google Cloud',
  'Azure DevOps', 'CI/CD', 'Machine Learning', 'Deep Learning',
  'Scrum Master', 'Product Owner', 'Project Manager',
]

function parseTags(raw) {
  if (!raw || !raw.toString().trim()) return []

  const str = raw.toString().trim()

  // If comma-separated, use that directly
  if (str.includes(',')) {
    return str.split(',').map(t => t.trim()).filter(Boolean)
  }

  // Greedy match known multi-word tags first, then treat rest as single words
  const result = []
  let remaining = str

  // Sort by length desc so longer matches win
  const sorted = [...KNOWN_MULTIWORD_TAGS].sort((a, b) => b.length - a.length)

  for (const tag of sorted) {
    if (remaining.includes(tag)) {
      result.push(tag)
      remaining = remaining.split(tag).join(' ').replace(/\s+/g, ' ').trim()
    }
  }

  // Remaining single-word tokens
  for (const word of remaining.split(' ').map(w => w.trim()).filter(Boolean)) {
    result.push(word)
  }

  return result
}

// ── Row → CRMCandidate mapping ───────────────────────────────────────────────

function mapRow(row) {
  const firstName = (row['Jméno'] || '').toString().trim()
  const lastName  = (row['Příjmení'] || '').toString().trim()

  if (!firstName && !lastName) return null  // skip empty rows

  const city    = (row['Město'] || '').toString().trim()
  const country = (row['Země'] || '').toString().trim()
  const notes   = (row['Poznámky'] || '').toString().trim()

  // Build note: original note + location info
  const locationParts = [city, country].filter(Boolean)
  const locationNote  = locationParts.length ? `Lokalita: ${locationParts.join(', ')}` : ''
  const note = [notes, locationNote].filter(Boolean).join('\n') || undefined

  const skills = parseTags(row['Tagy'])

  return {
    firstName,
    lastName,
    position:  '',                                      // fill manually after import
    email:     (row['Email'] || '').toString().trim() || undefined,
    phone:     (row['Telefon'] || '').toString().trim() || undefined,
    note,
    skills:    skills.length ? skills : undefined,
    recruId:   row['ID'] ? row['ID'].toString().trim() : undefined,
    createdAt: Date.now(),
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const xlsxPath = process.argv[2]
  if (!xlsxPath) {
    console.error('Usage: node scripts/import-recru.js <path-to-export.xlsx>')
    process.exit(1)
  }

  const absPath = path.resolve(xlsxPath)
  if (!fs.existsSync(absPath)) {
    console.error('File not found:', absPath)
    process.exit(1)
  }

  console.log('Reading:', absPath)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(absPath)
  const worksheet = workbook.getWorksheet(1)
  if (!worksheet) { console.error('No worksheet found'); process.exit(1) }

  const headers = []
  const rows = []
  worksheet.eachRow((row, rowNum) => {
    if (rowNum === 1) {
      for (let i = 1; i <= row.cellCount; i++) {
        headers[i - 1] = String(row.getCell(i).value ?? '')
      }
    } else {
      const obj = {}
      for (let i = 0; i < headers.length; i++) {
        if (headers[i]) obj[headers[i]] = row.getCell(i + 1).value
      }
      rows.push(obj)
    }
  })

  const sheetName = worksheet.name
  console.log(`Found ${rows.length} rows in sheet "${sheetName}"`)

  const candidates = rows.map(mapRow).filter(Boolean)
  console.log(`Valid candidates to import: ${candidates.length}`)

  if (candidates.length === 0) {
    console.log('Nothing to import.')
    process.exit(0)
  }

  // Preview first 3
  console.log('\nPreview (first 3):')
  candidates.slice(0, 3).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} | ${c.email || '-'} | skills: ${(c.skills || []).slice(0, 3).join(', ')}...`)
  })

  console.log('\nImporting to Firestore...')

  let ok = 0
  let fail = 0

  for (const candidate of candidates) {
    try {
      await addDoc(collection(db, 'crmCandidates'), candidate)
      ok++
      if (ok % 10 === 0) process.stdout.write(`  ${ok}/${candidates.length}...\r`)
    } catch (err) {
      fail++
      console.error(`  FAIL: ${candidate.firstName} ${candidate.lastName} — ${err.message}`)
    }
  }

  console.log(`\nDone: ${ok} imported, ${fail} failed.`)
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
