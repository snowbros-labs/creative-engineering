/**
 * POST /api/contact — sends a project brief from the site through Resend, then a themed
 * confirmation to the sender. Vercel function (Web-standard handler). Configure in Vercel:
 *   RESEND_API_KEY      Resend API key
 *   CONTACT_TO_EMAIL    where briefs are delivered
 *   CONTACT_FROM_EMAIL  verified sender, e.g. "SNOWBROS <hello@snowbros.me>"
 *   CONTACT_CONFIRM     "false" to stop the confirmation to the sender (default on)
 *   SITE_URL            absolute origin for email images and links (default https://snowbros.me)
 * Without email configuration it fails explicitly, so a brief is never silently discarded.
 */
import { renderBrief, renderConfirmation, validateBrief } from '../src/studio/brief.js';

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false, error: 'Use the project brief form.' }, 405);
  // Bound the body before parsing; legitimate briefs fit comfortably within this limit.
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 24_000)
    return json({ ok: false, error: 'That brief is too large.' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'That did not arrive as a form. Please try again.' }, 400);
  }
  const result = validateBrief(body);
  if (!result.ok) return json({ ok: false, error: result.error, field: result.field }, 422);
  // Honeypot filled: a bot. Pretend success, send nothing.
  if (result.brief.website) return json({ ok: true });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return json({ ok: false, error: 'The brief service is unavailable. Please email hello@snowbros.me.' }, 503);
  }
  const site = process.env.SITE_URL || 'https://snowbros.me';
  const from = process.env.CONTACT_FROM_EMAIL || 'SNOWBROS <hello@snowbros.me>';
  const send = (payload: Record<string, unknown>) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, ...payload }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);

  const res = await send({ to, reply_to: result.brief.email, ...renderBrief(result.brief, site) });
  if (!res?.ok) {
    return json({ ok: false, error: 'We could not send that just now.' }, 502);
  }
  // Best effort: Resend accepted the brief; confirmation failure must not prompt a duplicate brief.
  if (process.env.CONTACT_CONFIRM !== 'false') {
    await send({ to: result.brief.email, reply_to: 'hello@snowbros.me', ...renderConfirmation(result.brief, site) });
  }
  return json({ ok: true });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
