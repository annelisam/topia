// Tiny, dependency-free Markdown → email-safe HTML renderer for admin
// broadcasts. We DON'T use react-markdown here: that renders to React elements
// (for the browser) and emits class-based HTML that arrives unstyled in email
// clients. Email needs *inline* styles, so we emit a controlled subset with the
// styling baked in. Supported: # ## ### headings, **bold**, *italic*/_italic_,
// `code`, [links](url), - / * and 1. lists, > blockquote, --- rule, paragraphs,
// and single-newline soft breaks. Anything else is treated as plain text.

const LIME = '#e4fe52';
const INK = '#1a1a1a';
const MUTED = '#888888';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Only allow safe link protocols — block javascript:/data: etc.
function safeUrl(url: string): string {
  const u = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u.replace(/"/g, '%22');
  if (u.startsWith('/') || u.startsWith('#')) return u.replace(/"/g, '%22');
  return '#';
}

// Inline formatting. Runs on already-escaped text so user-entered HTML stays inert.
function renderInline(escaped: string): string {
  let t = escaped;
  // Links [label](url) — do first so URLs aren't mangled by emphasis rules.
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) =>
    `<a href="${safeUrl(url)}" target="_blank" style="color:${INK};text-decoration:underline;">${label}</a>`);
  // Inline code `x`
  t = t.replace(/`([^`]+)`/g, '<code style="font-family:monospace;background:rgba(136,136,136,0.15);padding:1px 4px;border-radius:3px;font-size:13px;">$1</code>');
  // Bold **x**
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *x* (not part of **) and _x_
  t = t.replace(/(^|[^*])\*(?!\s)([^*]+?)\*/g, '$1<em>$2</em>');
  t = t.replace(/(^|[^\w])_([^_]+)_/g, '$1<em>$2</em>');
  return t;
}

const P = 'margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:' + INK + ';';
const H1 = 'margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:26px;line-height:1.15;text-transform:uppercase;color:' + INK + ';';
const H2 = 'margin:22px 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:20px;line-height:1.2;color:' + INK + ';';
const H3 = 'margin:18px 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:16px;line-height:1.3;color:' + INK + ';';
const LI = 'margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:' + INK + ';';
const QUOTE = 'margin:0 0 16px 0;padding:8px 0 8px 16px;border-left:3px solid ' + LIME + ';font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:' + MUTED + ';';

/** Render a markdown string to email-safe, inline-styled HTML. */
export function markdownToEmailHtml(md: string): string {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p style="${P}">${renderInline(escapeHtml(para.join('\n'))).replace(/\n/g, '<br>')}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') { flushPara(); i++; continue; }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara();
      out.push(`<div style="height:1px;background:rgba(136,136,136,0.25);line-height:1px;font-size:1px;margin:8px 0 24px 0;">&nbsp;</div>`);
      i++; continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushPara();
      const level = h[1].length;
      const style = level === 1 ? H1 : level === 2 ? H2 : H3;
      const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      out.push(`<${tag} style="${style}">${renderInline(escapeHtml(h[2].trim()))}</${tag}>`);
      i++; continue;
    }

    // Blockquote (consecutive > lines)
    if (/^>\s?/.test(trimmed)) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote style="${QUOTE}">${renderInline(escapeHtml(buf.join('\n'))).replace(/\n/g, '<br>')}</blockquote>`);
      continue;
    }

    // Lists (unordered - / * , or ordered 1. ) — consecutive item lines.
    const isUl = /^[-*]\s+/.test(trimmed);
    const isOl = /^\d+\.\s+/.test(trimmed);
    if (isUl || isOl) {
      flushPara();
      const items: string[] = [];
      const re = isUl ? /^[-*]\s+/ : /^\d+\.\s+/;
      while (i < lines.length && (isUl ? /^[-*]\s+/ : /^\d+\.\s+/).test(lines[i].trim())) {
        items.push(`<li style="${LI}">${renderInline(escapeHtml(lines[i].trim().replace(re, '')))}</li>`);
        i++;
      }
      const tag = isUl ? 'ul' : 'ol';
      out.push(`<${tag} style="margin:0 0 16px 0;padding-left:22px;">${items.join('')}</${tag}>`);
      continue;
    }

    // Otherwise accumulate into the current paragraph.
    para.push(trimmed);
    i++;
  }
  flushPara();
  return out.join('\n');
}

/**
 * Wrap rendered body HTML in the TOPIA branded email shell (mirrors
 * emails/event-invite.html — 480px card, logo, lime chip, footer). Optionally
 * shows an event chip + a "View event" button.
 */
export function renderBroadcastEmail(opts: {
  bodyHtml: string;
  preheader?: string;
  eventName?: string | null;
  eventUrl?: string | null;
}): string {
  const { bodyHtml, preheader, eventName, eventUrl } = opts;
  const chip = eventName
    ? `<tr><td style="padding:22px 32px 0 32px;"><span style="display:inline-block;background:${LIME};color:#000000;padding:4px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">${escapeHtml(eventName)}</span></td></tr>`
    : '';
  const button = eventUrl
    ? `<tr><td style="padding:8px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${LIME}" style="border-radius:8px;"><a href="${safeUrl(eventUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#000000;text-decoration:none;border-radius:8px;">View event &rarr;</a></td></tr></table></td></tr>`
    : '';
  const hidden = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(eventName || 'TOPIA')}</title>
</head>
<body style="margin:0;padding:0;">
  ${hidden}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;border:1px solid rgba(136,136,136,0.25);border-radius:16px;">
          <tr><td style="padding:28px 32px 0 32px;"><img src="https://topia.vision/brand/email-logo.png" width="48" height="48" alt="Topia" style="display:block;width:48px;height:48px;border:0;border-radius:12px;"></td></tr>
          ${chip}
          <tr><td style="padding:20px 32px 0 32px;">${bodyHtml}</td></tr>
          ${button}
          <tr><td style="padding:28px 32px 0 32px;"><div style="height:1px;background:rgba(136,136,136,0.25);line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
          <tr><td style="padding:16px 32px 28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">Culture first. Systems second. Ownership always.<br>&copy; TOPIA VISION HOLDINGS LLC</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Replace {{name}} / {{firstName}} / {{eventName}} / {{eventUrl}} placeholders. */
export function fillPlaceholders(md: string, vars: Record<string, string>): string {
  return (md ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => vars[key] ?? '');
}
