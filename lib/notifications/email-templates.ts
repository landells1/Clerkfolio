type NotificationItem = {
  title: string
  body: string
  link: string
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://clerkfolio.co.uk'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
        <a href="${baseUrl}${item.link}" style="font-size:13px;color:#155BB0;text-decoration:none;">Open in Clerkfolio</a>
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
                  <a href="${baseUrl}/settings/shared-links" style="display:inline-block;background:#1B6FD9;color:#0B0B0C;font-weight:700;font-size:14px;text-decoration:none;padding:10px 14px;border-radius:10px;">Review shared links</a>
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
