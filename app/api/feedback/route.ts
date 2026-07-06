import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { validateOrigin } from '@/lib/csrf'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { requestIp } from '@/lib/request-ip'
import { validateFeedbackInput, buildFeedbackSubject, FEEDBACK_CATEGORY_LABELS } from '@/lib/feedback/validation'

// Simple HTML escaper - prevents injection into email body
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

const FEEDBACK_RATE_LIMIT = 10
const FEEDBACK_RATE_WINDOW_SECONDS = 60

export async function POST(req: NextRequest) {
  try {
    const originError = validateOrigin(req)
    if (originError) return originError
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Rate limit by IP
    const ip = requestIp(req)

    const rateLimit = await checkRateLimit({
      key: ip,
      max: FEEDBACK_RATE_LIMIT,
      windowSeconds: FEEDBACK_RATE_WINDOW_SECONDS,
      prefix: 'feedback',
    })

    if (!rateLimit.success) {
      if (rateLimit.unavailable) {
        return NextResponse.json(
          { error: 'Feedback is temporarily unavailable.' },
          { status: 503, headers: rateLimitHeaders(rateLimit, FEEDBACK_RATE_WINDOW_SECONDS) },
        )
      }

      return NextResponse.json(
        { error: 'Too many requests. Please wait before submitting again.' },
        { status: 429, headers: rateLimitHeaders(rateLimit, FEEDBACK_RATE_WINDOW_SECONDS) }
      )
    }

    const body = await req.json()

    // ── Validate inputs ──────────────────────────────────────────────────────
    const validated = validateFeedbackInput(body)
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }
    const { name: trimmedName, email: trimmedEmail, comment: trimmedComment, category, specialty } = validated.value
    const categoryLabel = FEEDBACK_CATEGORY_LABELS[category]

    // ── Send email with escaped content ──────────────────────────────────────
    await resend.emails.send({
      from: 'Clerkfolio Feedback <noreply@clerkfolio.co.uk>',
      to: 'admin@clerkfolio.co.uk',
      // replyTo validated above - safe to use
      replyTo: trimmedEmail,
      subject: buildFeedbackSubject(validated.value),
      // Plain text version has no injection risk
      text: `Category: ${categoryLabel}${specialty ? ` (${specialty})` : ''}\nName: ${trimmedName}\nEmail: ${trimmedEmail}\n\n${trimmedComment}`,
      // HTML version uses escaped values throughout
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1B6FD9;">New feedback from Clerkfolio</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 80px;"><strong>Category</strong></td>
              <td style="padding: 8px 0;">${esc(categoryLabel)}${specialty ? ` &mdash; ${esc(specialty)}` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Name</strong></td>
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
    // Message only - the raw error object can embed the request payload
    // (submitter email + comment), which must never reach platform logs.
    console.error('Feedback send error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
