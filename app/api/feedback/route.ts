import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

// Simple HTML escaper — prevents injection into email body
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Minimal email format check
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, comment } = body

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (typeof name !== 'string' || typeof email !== 'string' || typeof comment !== 'string') {
      return NextResponse.json({ error: 'Invalid input types' }, { status: 400 })
    }

    const trimmedName    = name.trim().slice(0, 100)
    const trimmedEmail   = email.trim().toLowerCase().slice(0, 254)
    const trimmedComment = comment.trim().slice(0, 2000)

    if (!trimmedName || !trimmedEmail || !trimmedComment) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // ── Send email with escaped content ──────────────────────────────────────
    await resend.emails.send({
      from: 'Clinidex Feedback <noreply@clinidex.co.uk>',
      to: 'admin@clinidex.co.uk',
      // replyTo validated above — safe to use
      replyTo: trimmedEmail,
      subject: `Feedback from ${esc(trimmedName)}`,
      // Plain text version has no injection risk
      text: `Name: ${trimmedName}\nEmail: ${trimmedEmail}\n\n${trimmedComment}`,
      // HTML version uses escaped values throughout
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1D9E75;">New feedback from Clinidex</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 80px;"><strong>Name</strong></td>
              <td style="padding: 8px 0;">${esc(trimmedName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Email</strong></td>
              <td style="padding: 8px 0;"><a href="mailto:${esc(trimmedEmail)}">${esc(trimmedEmail)}</a></td>
            </tr>
          </table>
          <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />
          <p style="white-space: pre-wrap; line-height: 1.6;">${esc(trimmedComment)}</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Feedback send error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
