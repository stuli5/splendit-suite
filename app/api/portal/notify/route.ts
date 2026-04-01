import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAuth } from '@/lib/api-auth'

const resend = new Resend(process.env.RESEND_API_KEY)

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

const ACCOUNTING_EMAILS = (process.env.PORTAL_ACCOUNTING_EMAIL ?? 'accounting@splendidjob.cz')
  .split(',').map(e => e.trim()).filter(Boolean)
const FROM_EMAIL       = process.env.PORTAL_FROM_EMAIL       ?? 'portal@splendidjob.cz'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { candidateName, candidateEmail, type, month, amount, fileName, fileUrl } = body

  if (!candidateName || !type || !month || !fileName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const typeLabel   = type === 'invoice' ? 'Invoice' : 'Timesheet'
  const amountLabel = amount ? `${Number(amount).toLocaleString('cs-CZ')} CZK` : 'not specified'

  const safeName   = esc(candidateName)
  const safeEmail  = esc(candidateEmail)
  const safeType   = esc(typeLabel)
  const safeMonth  = esc(month)
  const safeAmount = esc(amountLabel)
  const safeFile   = esc(fileName)
  const safeUrl    = fileUrl ? esc(fileUrl).replace(/^(?!https?:\/\/)/i, '') : ''

  try {
    // 1. Notify accounting team
    const r1 = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      ACCOUNTING_EMAILS,
      subject: `[SplenditPortal] New ${typeLabel} — ${candidateName} (${month})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; color: #0f2e2a;">
          <h2 style="color: #00a87a; margin-bottom: 4px;">New ${safeType} uploaded</h2>
          <p style="color: #7ab8ae; margin-top: 0; font-size: 13px;">${new Date().toLocaleString('cs-CZ')}</p>

          <table style="width:100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="background: #f0faf8;"><td style="padding: 8px 12px; font-weight: bold;">Contractor</td><td style="padding: 8px 12px;">${safeName}</td></tr>
            <tr>                             <td style="padding: 8px 12px; font-weight: bold;">Email</td>      <td style="padding: 8px 12px;">${safeEmail}</td></tr>
            <tr style="background: #f0faf8;"><td style="padding: 8px 12px; font-weight: bold;">Type</td>      <td style="padding: 8px 12px;">${safeType}</td></tr>
            <tr>                             <td style="padding: 8px 12px; font-weight: bold;">Month</td>     <td style="padding: 8px 12px;">${safeMonth}</td></tr>
            <tr style="background: #f0faf8;"><td style="padding: 8px 12px; font-weight: bold;">Amount</td>   <td style="padding: 8px 12px;">${safeAmount}</td></tr>
            <tr>                             <td style="padding: 8px 12px; font-weight: bold;">File</td>      <td style="padding: 8px 12px;">${safeFile}</td></tr>
          </table>

          ${safeUrl ? `<a href="${safeUrl}" style="display:inline-block; padding: 10px 20px; background: #00a87a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Download file</a>` : ''}

          <p style="margin-top: 24px; font-size: 12px; color: #7ab8ae;">
            SplenditPortal — contractor self-service
          </p>
        </div>
      `,
    })
    if (r1.error) {
      console.error('[portal/notify] accounting email error:', r1.error)
      return NextResponse.json({ error: r1.error.message }, { status: 500 })
    }

    // 2. Confirm to candidate
    const r2 = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      candidateEmail,
      subject: `[SplenditPortal] ${typeLabel} received — ${month}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; color: #0f2e2a;">
          <h2 style="color: #00a87a;">Your ${safeType.toLowerCase()} was received</h2>
          <p>Hi ${safeName},</p>
          <p>We received your <strong>${safeType.toLowerCase()}</strong> for <strong>${safeMonth}</strong>${amount ? ` (${safeAmount})` : ''}.</p>
          <p>Our accounting team has been notified and will process it shortly. You&apos;ll be able to track the status in your portal.</p>
          <p style="margin-top: 24px; font-size: 12px; color: #7ab8ae;">
            If you have any questions, reply to this email or contact us at
            <a href="mailto:accounting@splendidjob.cz" style="color: #0091c7;">accounting@splendidjob.cz</a>.
          </p>
          <p style="font-size: 12px; color: #7ab8ae;">Splendit IT Recruitment</p>
        </div>
      `,
    })
    if (r2.error) {
      console.error('[portal/notify] candidate email error:', r2.error)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[portal/notify]', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
