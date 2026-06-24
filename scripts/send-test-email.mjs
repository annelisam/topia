// Resend smoke test. Two modes:
//
//   Raw HTML (verifies key + domain + From):
//     node scripts/send-test-email.mjs [recipient]
//
//   Template (verifies a published Resend template end to end — same payload
//   the app's sendTemplateEmail() sends):
//     node scripts/send-test-email.mjs --template event-invite [recipient]
//
// Defaults: recipient contact@topia.vision, From noreply@send.topia.vision.
// Override From with TEST_FROM. Reads RESEND_API_KEY from .env.local (never printed).

import { readFileSync } from 'node:fs';

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch { /* fall back to ambient env */ }
}

loadEnvLocal();

// Parse args: optional "--template <id>" then optional recipient.
const argv = process.argv.slice(2);
let templateId = null;
const rest = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--template') { templateId = argv[++i]; }
  else rest.push(argv[i]);
}

const key = process.env.RESEND_API_KEY;
const from = process.env.TEST_FROM || 'Topia <noreply@send.topia.vision>';
const to = rest[0] || 'contact@topia.vision';

if (!key) {
  console.error('✗ RESEND_API_KEY not found in .env.local or environment.');
  process.exit(1);
}

// Sample variables for the event-invite template.
const SAMPLE_VARS = {
  EVENT_NAME: 'Like Minds: A Summer Series',
  EVENT_URL: 'https://topia.vision/events/like-minds-a-summer-series?invite=test-token',
  INVITER_NAME: 'Latasha',
  EVENT_WHEN: 'Saturday, June 27 · 1:00 PM – 5:00 PM PT',
  EVENT_WHERE: 'The Love Song Bar · Los Angeles',
};

let payload;
if (templateId) {
  // Mirror lib/notify/email.ts exactly: template send owns its own subject.
  payload = { from, to, template: { id: templateId, variables: SAMPLE_VARS } };
  console.log(`→ Sending TEMPLATE "${templateId}"\n  from: ${from}\n  to:   ${to}`);
} else {
  const html = `
    <div style="font-family:Arial,sans-serif;border:1px solid #ccc;padding:32px;border-radius:12px;max-width:480px">
      <div style="font-weight:900;letter-spacing:4px;text-transform:uppercase;font-size:14px">TOPIA.</div>
      <h1 style="font-size:20px;margin:16px 0 8px">Resend is working ✅</h1>
      <p style="color:#888;line-height:1.6;font-size:14px">
        API key, verified domain (send.topia.vision), and From address are configured correctly.
      </p>
      <p style="color:#aaa;font-size:12px;margin-top:24px">Sent from ${from}</p>
    </div>`;
  payload = { from, to, subject: 'Topia × Resend — test email', html };
  console.log(`→ Sending raw HTML test\n  from: ${from}\n  to:   ${to}`);
}

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const body = await res.json().catch(() => ({}));

if (res.ok) {
  console.log(`✓ Accepted by Resend. id: ${body.id ?? '(none returned)'}`);
} else {
  console.error(`✗ Resend returned ${res.status}`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}
