/**
 * The project brief: one validator shared by the form (instant feedback) and the API (trust
 * nothing from the client), and the email it becomes. No dependencies, so the Vercel function
 * stays tiny.
 */
export interface Brief {
  name: string;
  company: string;
  need: string;
  timeline: string;
  email: string;
  message: string;
  /** Honeypot: humans never see it. */
  website: string;
}

export const NEEDS = [
  'a product',
  'a developer tool',
  'a website',
  'a dashboard',
  'an app',
  'something else',
] as const;
export const TIMELINES = [
  'within a month',
  'in one to three months',
  'later this year',
  'no fixed date',
] as const;

const LIMITS: Record<keyof Brief, number> = {
  name: 80,
  company: 120,
  need: 40,
  timeline: 40,
  email: 160,
  message: 4000,
  website: 200,
};

type Check = { ok: true; brief: Brief } | { ok: false; error: string; field: keyof Brief };

export function validateBrief(input: unknown): Check {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const read = (k: keyof Brief) => (typeof o[k] === 'string' ? (o[k] as string).trim() : '');
  const brief: Brief = {
    name: read('name'),
    company: read('company'),
    need: read('need'),
    timeline: read('timeline'),
    email: read('email'),
    message: read('message'),
    website: read('website'),
  };
  for (const k of Object.keys(LIMITS) as (keyof Brief)[]) {
    if (brief[k].length > LIMITS[k])
      return { ok: false, field: k, error: `That ${k} is too long.` };
  }
  if (!brief.name) return { ok: false, field: 'name', error: 'Tell us your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brief.email)) {
    return { ok: false, field: 'email', error: 'That email address does not look complete.' };
  }
  if (brief.message.length < 12) {
    return { ok: false, field: 'message', error: 'Say a little more about what it has to do.' };
  }
  if (brief.need && !(NEEDS as readonly string[]).includes(brief.need))
    brief.need = 'something else';
  if (brief.timeline && !(TIMELINES as readonly string[]).includes(brief.timeline))
    brief.timeline = 'no fixed date';
  return { ok: true, brief };
}

const esc = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const SITE = 'https://snowbros.me';
// Archivo loads where the mail app allows web fonts (Apple Mail, iOS); elsewhere Arial Black stands in.
const HEAVY = "Archivo, 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
const TEXT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800&display=swap" rel="stylesheet">';

/** The outer frame both emails share: paper ground, a 600px card, the brand header. */
function frame(preheader: string, inner: string, site: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>SNOWBROS</title>${FONTS}</head>
<body style="margin:0;padding:0;background:#f2f0eb;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0eb;"><tr><td align="center" style="padding:28px 12px 40px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
<tr><td style="padding:0 0 8px;"><a href="${site}" style="text-decoration:none;"><img src="${site}/email/header.png" width="600" height="150" alt="SNOWBROS" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>
${inner}
<tr><td style="padding:28px 4px 0;font:400 12px/1.6 ${TEXT};color:#6b6760;">SNOWBROS · independent engineering studio · <a href="${site}" style="color:#6b6760;">snowbros.me</a></td></tr>
</table></td></tr></table></body></html>`;
}

/** One labelled row of the brief's details table. */
function fact(label: string, value: string): string {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #e6e2d9;font:700 12px/1.4 ${TEXT};color:#6b6760;width:96px;vertical-align:top;">${label}</td><td style="padding:10px 0;border-bottom:1px solid #e6e2d9;font:400 15px/1.4 ${TEXT};color:#111110;">${esc(value)}</td></tr>`;
}

/** Internal: the brief, as the studio receives it. */
export function renderBrief(
  b: Brief,
  site = SITE,
): { subject: string; html: string; text: string } {
  const sentence = `Hi, I'm ${b.name}${b.company ? ` from ${b.company}` : ''}. We need ${b.need || 'something built'}, ${b.timeline || 'no fixed date'}.`;
  const subjectLine = `Re: your brief${b.company ? ` for ${b.company}` : ''}`;
  const inner = `
<tr><td style="background:#ff4f1f;padding:16px 28px;font:700 13px/1.2 ${TEXT};color:#111110;">A new brief arrived through snowbros.me</td></tr>
<tr><td style="background:#ffffff;padding:32px 28px 8px;font:800 26px/1.2 ${HEAVY};font-stretch:125%;color:#111110;letter-spacing:-0.3px;">${esc(sentence)}</td></tr>
<tr><td style="background:#ffffff;padding:20px 28px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111110;">
  ${fact('Needs', b.need || 'something else')}
  ${fact('Timeline', b.timeline || 'no fixed date')}
  ${b.company ? fact('Company', b.company) : ''}
  ${fact('Email', b.email)}
  </table>
</td></tr>
<tr><td style="background:#ffffff;padding:20px 28px 6px;font:700 13px/1.4 ${TEXT};color:#3b3935;">It has to</td></tr>
<tr><td style="background:#ffffff;padding:0 28px 28px;font:400 16px/1.65 ${TEXT};color:#111110;white-space:pre-wrap;">${esc(b.message)}</td></tr>
<tr><td style="background:#ffffff;padding:0 28px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#111110;border-radius:999px;">
  <a href="mailto:${esc(b.email)}?subject=${encodeURIComponent(subjectLine)}" style="display:inline-block;padding:14px 26px;font:700 15px/1 ${TEXT};color:#f2f0eb;text-decoration:none;">Reply to ${esc(b.name.split(' ')[0] || b.name)}</a>
  </td></tr></table>
</td></tr>`;
  const text = `${sentence}\n\nIt has to:\n${b.message}\n\nReply: ${b.email}\n`;
  return {
    subject: `New brief from ${b.name}${b.company ? `, ${b.company}` : ''}`,
    html: frame(`New brief from ${b.name}`, inner, site),
    text,
  };
}

/**
 * External: the confirmation the sender receives. Anyone can type any address into a form, so
 * this never echoes what they wrote — only a cleaned first name and our own words. That keeps
 * the form from being used to send other people arbitrary text.
 */
export function renderConfirmation(
  b: Brief,
  site = SITE,
): { subject: string; html: string; text: string } {
  const first =
    (b.name.split(/\s+/)[0] ?? '').replace(/[^\p{L}\p{M}'-]/gu, '').slice(0, 24) || 'there';
  const link = (href: string, label: string, sub: string) =>
    `<tr><td style="padding:14px 0;border-top:2px solid #2a2926;"><a href="${href}" style="text-decoration:none;"><span style="display:block;font:900 20px/1.2 ${HEAVY};color:#f2f0eb;letter-spacing:-0.3px;">${label}</span><span style="display:block;margin-top:4px;font:400 14px/1.5 ${TEXT};color:#c4bfb5;">${sub}</span></a></td></tr>`;
  const inner = `
<tr><td style="background:#ffffff;padding:40px 32px 8px;font:800 40px/1.04 ${HEAVY};font-stretch:125%;color:#111110;letter-spacing:-1px;">Got it, ${esc(first)}.<br><span style="color:#ff4f1f;">Your brief is in.</span></td></tr>
<tr><td style="background:#ffffff;padding:20px 32px 36px;font:400 17px/1.6 ${TEXT};color:#111110;">We read every brief ourselves, and we will write back from <a href="mailto:hello@snowbros.me" style="color:#111110;font-weight:700;">hello@snowbros.me</a> with questions or a first plan.<br><br>Nothing else to do for now. If something changes, reply to that email when it arrives.</td></tr>
<tr><td style="background:#111110;padding:30px 32px 18px;">
  <p style="margin:0 0 12px;font:700 13px/1.4 ${TEXT};color:#ff4f1f;">While you wait</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${link(`${site}/#work`, 'Selected work', 'AMR Screening, NOVA, Accounic, SwiftDrop, STC Academy, Atlas')}
  ${link(`${site}/lab.html`, 'The lab', 'Working benches from our open-source toolkit')}
  ${link(`${site}/founder.html`, 'The founder', 'Ved Chauhan, and why the work is built the way it is')}
  </table>
</td></tr>
<tr><td style="padding:22px 4px 0;font:400 12px/1.6 ${TEXT};color:#6b6760;">You are receiving this because this address was entered in the form on snowbros.me. If that was not you, you can ignore it; nothing else will be sent.</td></tr>`;
  const text = `Got it, ${first}. Your brief is in.\n\nWe read every brief ourselves, and we will write back from hello@snowbros.me with questions or a first plan.\n\nWhile you wait:\nSelected work  ${site}/#work\nThe lab        ${site}/lab.html\nThe founder    ${site}/founder.html\n\nYou are receiving this because this address was entered in the form on snowbros.me. If that was not you, ignore it.\n`;
  return {
    subject: 'We have your brief — SNOWBROS',
    html: frame('Your brief reached the studio.', inner, site),
    text,
  };
}
