type NotificationItem = {
  title: string
  body: string
  link: string
}

type DigestSummary = {
  entryCount: number
  specialtyTags: string[]
  currentStreak: number
  activeWeeksYtd: number
}

// NEXT_PUBLIC_APP_URL is the canonical absolute-URL source everywhere else
// (CSRF allowlist, Stripe redirects, signup callback). The templates used to
// read an undocumented NEXT_PUBLIC_SITE_URL, so staging emails silently
// deep-linked to production via the fallback.
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clerkfolio.co.uk'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Defends against unsafe schemes (javascript:, data:, etc.) sneaking into href.
// Only same-origin paths starting with `/` are allowed; everything else falls back to dashboard.
function safeRelativePath(value: string) {
  if (typeof value !== 'string') return '/dashboard'
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

// Generic single-message transactional email (referral rewards, "password
// changed", and other one-off account events). Reuses the brand card so every
// transactional mail looks consistent. `ctaPath` is a same-origin path; it is
// run through safeRelativePath like the notification digest links.
export function transactionalEmail({
  firstName,
  heading,
  lines,
  ctaLabel,
  ctaPath,
}: {
  firstName: string | null
  heading: string
  lines: string[]
  ctaLabel: string
  ctaPath: string
}): { html: string; text: string } {
  const safePath = safeRelativePath(ctaPath)
  const text = [
    `Hi ${firstName || 'there'},`,
    '',
    ...lines,
    '',
    `${ctaLabel}: ${baseUrl}${safePath}`,
    '',
    `Manage notification preferences: ${baseUrl}/settings/notifications`,
  ].join('\n')

  const paragraphs = lines
    .map(line => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#555;">${escapeHtml(line)}</p>`)
    .join('')

  const html = `<!doctype html>
  <html>
    <body style="margin:0;background:#f6f6f3;font-family:Inter,Arial,sans-serif;color:#111113;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f3;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e7e3;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:22px 24px;border-bottom:1px solid #e7e7e3;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#155BB0;">Clerkfolio</p>
                  <h1 style="margin:0;font-size:20px;line-height:1.25;color:#111113;">${escapeHtml(heading)}</h1>
                  <p style="margin:8px 0 0;font-size:14px;color:#555;">Hi ${escapeHtml(firstName || 'there')},</p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 24px;">${paragraphs}</td>
              </tr>
              <tr>
                <td style="padding:18px 24px;background:#fafafa;">
                  <a href="${baseUrl}${safePath}" style="display:inline-block;background:#1B6FD9;color:#0B0B0C;font-weight:700;font-size:14px;text-decoration:none;padding:10px 14px;border-radius:10px;">${escapeHtml(ctaLabel)}</a>
                  <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#777;">You can manage these emails from Clerkfolio settings.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`

  return { html, text }
}

export function notificationEmailText(firstName: string | null, items: NotificationItem[]) {
  const lines = items.map(item => `- ${item.title}: ${item.body}`).join('\n')
  return `Hi ${firstName || 'there'},\n\n${lines}\n\nOpen Clerkfolio: ${baseUrl}/timeline\n\nManage notification preferences: ${baseUrl}/settings/notifications`
}

export function notificationEmailHtml(firstName: string | null, items: NotificationItem[]) {
  const rows = items.map(item => `
    <tr>
      <td style="padding:16px;border-bottom:1px solid #e7e7e3;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111113;">${escapeHtml(item.title)}</p>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#555;">${escapeHtml(item.body)}</p>
        <a href="${baseUrl}${safeRelativePath(item.link)}" style="font-size:13px;color:#155BB0;text-decoration:none;">Open in Clerkfolio</a>
      </td>
    </tr>
  `).join('')

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#f6f6f3;font-family:Inter,Arial,sans-serif;color:#111113;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f3;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e7e3;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:22px 24px;border-bottom:1px solid #e7e7e3;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#155BB0;">Clerkfolio</p>
                  <h1 style="margin:0;font-size:20px;line-height:1.25;color:#111113;">Portfolio reminders</h1>
                  <p style="margin:8px 0 0;font-size:14px;color:#555;">Hi ${escapeHtml(firstName || 'there')}, these items need attention.</p>
                </td>
              </tr>
              ${rows}
              <tr>
                <td style="padding:18px 24px;background:#fafafa;">
                  <a href="${baseUrl}/timeline" style="display:inline-block;background:#1B6FD9;color:#0B0B0C;font-weight:700;font-size:14px;text-decoration:none;padding:10px 14px;border-radius:10px;">Open timeline</a>
                  <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#777;">You can manage these emails from Clerkfolio settings.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`
}

export function weeklyDigestEmail(firstName: string | null, summary: DigestSummary) {
  return digestEmail({
    firstName,
    title: 'Your weekly Clerkfolio digest',
    intro: 'Here is what you logged this week.',
    summary,
  })
}

export function monthlyDigestEmail(firstName: string | null, monthLabel: string, summary: DigestSummary) {
  return digestEmail({
    firstName,
    title: `${monthLabel} in Clerkfolio`,
    intro: `Here is your end-of-month portfolio snapshot for ${monthLabel}.`,
    summary,
  })
}

function digestEmail({
  firstName,
  title,
  intro,
  summary,
}: {
  firstName: string | null
  title: string
  intro: string
  summary: DigestSummary
}) {
  const tags = summary.specialtyTags.length > 0 ? summary.specialtyTags.join(', ') : 'No specialty tags used'
  const text = [
    `Hi ${firstName || 'there'},`,
    '',
    intro,
    '',
    `Entries logged: ${summary.entryCount}`,
    `Specialty tags: ${tags}`,
    `Your streak: ${summary.currentStreak} week${summary.currentStreak === 1 ? '' : 's'} current, ${summary.activeWeeksYtd} active week${summary.activeWeeksYtd === 1 ? '' : 's'} this year`,
    '',
    `Open Clerkfolio: ${baseUrl}/dashboard`,
    `Manage notification preferences: ${baseUrl}/settings/notifications`,
  ].join('\n')

  const html = `<!doctype html>
  <html>
    <body style="margin:0;background:#f6f6f3;font-family:Inter,Arial,sans-serif;color:#111113;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f3;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e7e3;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:22px 24px;border-bottom:1px solid #e7e7e3;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#155BB0;">Clerkfolio</p>
                  <h1 style="margin:0;font-size:20px;line-height:1.25;color:#111113;">${escapeHtml(title)}</h1>
                  <p style="margin:8px 0 0;font-size:14px;color:#555;">Hi ${escapeHtml(firstName || 'there')}, ${escapeHtml(intro)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 24px;">
                  <p style="margin:0 0 10px;font-size:14px;color:#555;">Entries logged: <strong style="color:#111113;">${summary.entryCount}</strong></p>
                  <p style="margin:0 0 10px;font-size:14px;color:#555;">Specialty tags: ${escapeHtml(tags)}</p>
                  <p style="margin:0;font-size:14px;color:#555;">Your streak: ${summary.currentStreak} current week${summary.currentStreak === 1 ? '' : 's'}; ${summary.activeWeeksYtd} active week${summary.activeWeeksYtd === 1 ? '' : 's'} this year.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 24px;background:#fafafa;">
                  <a href="${baseUrl}/dashboard" style="display:inline-block;background:#1B6FD9;color:#0B0B0C;font-weight:700;font-size:14px;text-decoration:none;padding:10px 14px;border-radius:10px;">Open dashboard</a>
                  <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#777;">You can manage digest emails from Clerkfolio settings.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`

  return { text, html }
}

export function buildAutoRevokeEmail({
  userName,
  linkScope,
  viewCount,
}: {
  userName: string
  linkScope: string
  viewCount: number
}) {
  return `<!doctype html>
  <html>
    <body style="margin:0;background:#f6f6f3;font-family:Inter,Arial,sans-serif;color:#111113;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f3;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e7e3;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:22px 24px;border-bottom:1px solid #e7e7e3;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#155BB0;">Clerkfolio</p>
                  <h1 style="margin:0;font-size:20px;line-height:1.25;color:#111113;">Shared link paused</h1>
                  <p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:#555;">Hi ${escapeHtml(userName || 'there')}, your ${escapeHtml(linkScope)} share link was automatically revoked after ${viewCount} views in one hour.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 24px;background:#fafafa;">
                  <a href="${baseUrl}/export?tab=share" style="display:inline-block;background:#1B6FD9;color:#0B0B0C;font-weight:700;font-size:14px;text-decoration:none;padding:10px 14px;border-radius:10px;">Review shared links</a>
                  <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#777;">This protects read-only portfolio links from unusual traffic.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`
}
