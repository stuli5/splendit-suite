/**
 * Backfill `linkedinId` for existing crmCandidates
 *
 * Usage:
 *   node scripts/backfill-linkedin-id.js          # live run
 *   node scripts/backfill-linkedin-id.js --dry     # dry-run (report only, no writes)
 *
 * Required env vars (from .env.local):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */

'use strict'

const path = require('path')
const fs   = require('fs')
const { initializeApp }                                         = require('firebase/app')
const { getFirestore, collection, getDocs, writeBatch, doc }   = require('firebase/firestore')

// ── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN     = process.argv.includes('--dry')
const BATCH_SIZE  = 500

// ── Load .env.local ───────────────────────────────────────────────────────────

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

// ── Firebase init ─────────────────────────────────────────────────────────────

const app = initializeApp({
  apiKey:            env['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain:        env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId:         env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  storageBucket:     env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId:             env['NEXT_PUBLIC_FIREBASE_APP_ID'],
})
const db = getFirestore(app)

// ── normalizeLinkedin ─────────────────────────────────────────────────────────

function normalizeLinkedin(input) {
  const m = input.match(/\/in\/([^/?#]+)/i)
  return (m ? m[1] : input).toLowerCase().replace(/\/+$/, '')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '[DRY RUN] No writes will be performed.' : '[LIVE] Writing to Firestore.')

  const snap = await getDocs(collection(db, 'crmCandidates'))
  const docs = snap.docs

  let scanned   = 0
  let updated   = 0
  let skipped   = 0  // no linkedIn field
  const collisions = []  // same linkedinId on multiple docs

  // Track linkedinId → first docId seen, to detect collisions
  const seenIds = new Map()

  // Collect docs that need writing
  const toWrite = []
  for (const d of docs) {
    scanned++
    const data = d.data()

    if (!data.linkedIn) {
      skipped++
      continue
    }
    if (data.linkedinId) {
      // Already backfilled — check for collisions
      const lid = data.linkedinId
      if (seenIds.has(lid)) {
        collisions.push({ linkedinId: lid, docs: [seenIds.get(lid), d.id] })
      } else {
        seenIds.set(lid, d.id)
      }
      skipped++
      continue
    }

    const linkedinId = normalizeLinkedin(data.linkedIn)

    // Collision detection
    if (seenIds.has(linkedinId)) {
      collisions.push({ linkedinId, docs: [seenIds.get(linkedinId), d.id] })
    } else {
      seenIds.set(linkedinId, d.id)
    }

    toWrite.push({ ref: doc(db, 'crmCandidates', d.id), linkedinId })
  }

  // Write in batches of BATCH_SIZE
  if (!DRY_RUN) {
    for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
      const chunk = toWrite.slice(i, i + BATCH_SIZE)
      const batch = writeBatch(db)
      for (const { ref, linkedinId } of chunk) {
        batch.update(ref, { linkedinId })
      }
      await batch.commit()
      console.log(`  wrote batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} docs`)
    }
  }
  updated = toWrite.length

  // ── Summary ──
  console.log('\n── Backfill summary ──────────────────────────────')
  console.log(`  scanned : ${scanned}`)
  console.log(`  updated : ${DRY_RUN ? `${updated} (dry-run, no writes)` : updated}`)
  console.log(`  skipped : ${skipped}  (no linkedIn or already backfilled)`)
  console.log(`  collisions: ${collisions.length}`)
  if (collisions.length > 0) {
    console.log('\n  Duplicate candidates (same linkedinId on multiple docs) — review for manual merge:')
    for (const c of collisions) {
      console.log(`    linkedinId="${c.linkedinId}"  docs=[${c.docs.join(', ')}]`)
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
