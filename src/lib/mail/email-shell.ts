// src/lib/mail/email-shell.ts
import 'server-only';
import { SITE } from '@/config/constants';

export const BRAND = SITE.name;
export const TAGLINE = SITE.tagline;

export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Wraps body HTML in the branded email shell shared by every email the site
 * sends. Table-based layout with a full document head so email clients apply
 * the mobile media query: on phones the gutters shrink so content keeps most
 * of the width, and detail-row label/value pairs stack vertically.
 */
export function shell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BRAND}</title>
  <style>
    /* Tighter gutters on phones so the content gets more of the width. */
    @media only screen and (max-width: 600px) {
      .email-wrap { padding: 12px 0 !important; }
      .email-header { padding: 18px 20px !important; }
      .email-body { padding: 22px 20px !important; }
      .email-footer { padding: 16px 20px !important; }
      /* Stack detail rows: label on top, value below. */
      .detail-label, .detail-value { display: block !important; width: 100% !important; }
      .detail-label { padding: 8px 0 0 !important; }
      .detail-value { padding: 2px 0 6px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FAF6E0;font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#252A1C;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-wrap" style="background-color:#FAF6E0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #E4E5CC;border-radius:14px;overflow:hidden;">
          <tr>
            <td class="email-header" style="background:#252A1C;padding:22px 28px;">
              <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">${BRAND}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#C9CBB0;">${TAGLINE}</p>
            </td>
          </tr>
          <tr>
            <td class="email-body" style="padding:28px;color:#252A1C;font-size:14px;line-height:1.65;">${bodyHtml}</td>
          </tr>
          <tr>
            <td class="email-footer" style="padding:18px 28px;border-top:1px solid #E4E5CC;font-size:12px;color:#8B8E74;text-align:center;">
              <p style="margin:0;word-break:break-all;"><a href="${SITE.url}" style="color:#8B8E74;">${SITE.url}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
