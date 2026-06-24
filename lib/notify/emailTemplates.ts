// Canonical source for the transactional email HTML — used by the admin email
// sender (preview + WYSIWYG send) and kept in sync with emails/*.html (which are
// pasted into Resend for the automatic transactional sends).
//
// Each template's body uses {{{VARIABLE}}} placeholders; renderTemplate fills them.

const LOGO = 'https://topia.vision/brand/email-logo.png';

const hl = (t: string, big = false) =>
  `<span style="display:inline-block;background:#e4fe52;color:#000000;padding:${big ? '4px 8px' : '3px 7px'};font-family:Arial,Helvetica,sans-serif;font-size:${big ? '11px' : '10px'};font-weight:bold;letter-spacing:${big ? '3px' : '2px'};text-transform:uppercase;">${t}</span>`;

function whenWhereBlock(): string {
  return `
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;">
                <tr><td style="padding:0 0 6px 0;">${hl('When')}</td></tr>
                <tr><td style="padding:0 0 16px 0;font-size:15px;line-height:1.4;">{{{EVENT_WHEN}}}</td></tr>
                <tr><td style="padding:0 0 6px 0;">${hl('Where')}</td></tr>
                <tr><td style="padding:0;font-size:15px;line-height:1.4;">{{{EVENT_WHERE}}}</td></tr>
              </table>
            </td>
          </tr>`;
}

function primaryButton(label: string, urlVar: string): string {
  return `
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#e4fe52" style="border-radius:8px;">
                    <a href="{{{${urlVar}}}}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#000000;text-decoration:none;border-radius:8px;">${label}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function secondaryNudge(): string {
  return `
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(136,136,136,0.25);border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;">
                    <div style="padding-bottom:8px;">${hl('Finish setup')}</div>
                    <div style="font-size:14px;line-height:1.5;color:#888888;padding-bottom:14px;">You're in. Claim your TOPIA passport — just pick a username and add a profile photo. It's how you show up across the network, and you can change it anytime.</div>
                    <a href="{{{PROFILE_URL}}}" target="_blank" style="display:inline-block;padding:11px 22px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:inherit;text-decoration:none;border:1px solid rgba(136,136,136,0.45);border-radius:8px;">Claim your passport &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

// A light explainer card placed after the CTA (e.g. what the passport is).
function infoBlock(label: string, body: string): string {
  return `
          <tr>
            <td style="padding:22px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(136,136,136,0.25);border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;">
                    <div style="padding-bottom:8px;">${hl(label)}</div>
                    <div style="font-size:14px;line-height:1.5;color:#888888;">${body}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function fallbackLink(urlVar: string): string {
  return `
          <tr>
            <td style="padding:18px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#888888;">
              Or paste this link into your browser:<br>
              <a href="{{{${urlVar}}}}" target="_blank" style="color:inherit;word-break:break-all;text-decoration:underline;">{{{${urlVar}}}}</a>
            </td>
          </tr>`;
}

interface ShellConfig {
  title: string;
  preheader: string;
  lede: string;
  intro: string;
  headline: string;
  note?: string;
  whenWhere?: boolean;
  primary: { label: string; url: string };
  secondary?: boolean;
  info?: { label: string; body: string };
  fallbackUrl?: string;
}

function shell(c: ShellConfig): string {
  const pad = '&#8204;'.repeat(20);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${c.title}</title>
</head>
<body style="margin:0;padding:0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">
    ${c.preheader}
    ${pad}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;border:1px solid rgba(136,136,136,0.25);border-radius:16px;">
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <img src="${LOGO}" width="48" height="48" alt="Topia" style="display:block;width:48px;height:48px;border:0;border-radius:12px;">
            </td>
          </tr>
          <tr><td style="padding:22px 32px 0 32px;">${hl(c.lede, true)}</td></tr>
          <tr>
            <td style="padding:14px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#888888;">
              ${c.intro}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:28px;line-height:1.1;text-transform:uppercase;">
              ${c.headline}
            </td>
          </tr>${c.note ? `
          <tr>
            <td style="padding:10px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#888888;">
              ${c.note}
            </td>
          </tr>` : ''}${c.whenWhere ? whenWhereBlock() : ''}${primaryButton(c.primary.label, c.primary.url)}${c.secondary ? secondaryNudge() : ''}${c.info ? infoBlock(c.info.label, c.info.body) : ''}${c.fallbackUrl ? fallbackLink(c.fallbackUrl) : ''}
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <div style="height:1px;background:rgba(136,136,136,0.25);line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888888;">
              Culture first. Systems second. Ownership always.<br>
              &copy; TOPIA VISION HOLDINGS LLC
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type TemplateScope = 'event' | 'profile';

export interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  scope: TemplateScope;
  variables: string[];
  html: string;
}

interface TemplateDef extends Omit<EmailTemplate, 'html'> {
  shell?: ShellConfig;
  // Hand-authored HTML that bypasses the shell builder (kept in sync with the
  // matching emails/<id>.html pasted into Resend).
  html?: string;
}

// complete-your-profile is hand-authored (built in the email editor), so it
// overrides the shell. Keep this byte-identical to emails/complete-your-profile.html.
const COMPLETE_PROFILE_HTML = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="width=device-width" name="viewport" />
    <link
      rel="preload"
      as="image"
      href="https://topia.vision/brand/email-logo.png" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta
      content="telephone=no,address=no,email=no,date=no,url=no"
      name="format-detection" />
  </head>
  <body style="background-color:#ffffff">
    <!--$--><!--html--><!--head--><!--body-->
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      align="center">
      <tbody>
        <tr>
          <td style="background-color:#ffffff">
            <table
              align="left"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="max-width:600px;align:left;width:100%;color:#000000;background-color:#ffffff;border-radius:0px;border-color:#000000">
              <tbody>
                <tr style="width:100%">
                  <td
                    style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px">
                    <div
                      style="margin:0;padding:0;display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px">
                      <p style="margin:0;padding:0">
                        Claim your TOPIA passport → ‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌
                      </p>
                    </div>
                    <table
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">
                      <tbody>
                        <tr style="margin:0;padding:0">
                          <td
                            align="center"
                            data-id="__react-email-column"
                            style="margin:0;padding:32px 16px">
                            <table
                              width="480"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;max-width:480px;width:100%;border-style:solid;border-width:1px;border-color:rgba(136,136,136,0.25);border-radius:16px">
                              <tbody>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:28px 32px 0 32px">
                                    <img
                                      alt="Topia"
                                      height="48"
                                      src="https://topia.vision/brand/email-logo.png"
                                      style="display:block;outline:none;border:0;text-decoration:none;max-width:100%;width:48px;height:auto;border-radius:12px"
                                      width="48" />
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:22px 32px 0 32px">
                                    <p style="margin:0;padding:0">
                                      <span style="color:#000000"
                                        ><strong
                                          ><span
                                            style="text-transform:uppercase"
                                            >Welcome TO TOPIA</span
                                          ></strong
                                        ></span
                                      >
                                    </p>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:14px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#888888">
                                    <p style="margin:0;padding:0">
                                      Hey <strong>{{{USER_NAME}}}</strong>
                                      <!-- -->👋
                                    </p>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:6px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:28px;line-height:1.1;text-transform:uppercase">
                                    <p style="margin:0;padding:0">
                                      Claim your passport
                                    </p>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:10px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#888888">
                                    <p style="margin:0;padding:0">
                                      Add your details to complete your TOPIA
                                      passport. It only takes a minute, and you
                                      can update it anytime.
                                    </p>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:28px 32px 0 32px">
                                    <table
                                      border="0"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                      style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">
                                      <tbody>
                                        <tr style="margin:0;padding:0">
                                          <td
                                            align="center"
                                            data-id="__react-email-column"
                                            style="margin:0;padding:0;border-radius:8px">
                                            <p style="margin:0;padding:0">
                                              <a
                                                href="{{{PROFILE_URL}}}"
                                                rel="noopener noreferrer nofollow"
                                                style="color:#000000;text-decoration-line:none;text-decoration:none;display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;text-transform:uppercase;border-radius:8px"
                                                target="_blank"
                                                >Claim your passport →</a
                                              >
                                            </p>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:22px 32px 0 32px">
                                    <table
                                      width="100%"
                                      border="0"
                                      cellpadding="0"
                                      cellspacing="0"
                                      role="presentation"
                                      style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;border-style:solid;border-width:1px;border-color:rgba(136,136,136,0.25);border-radius:12px">
                                      <tbody>
                                        <tr style="margin:0;padding:0">
                                          <td
                                            data-id="__react-email-column"
                                            style="margin:0;padding:18px 20px;font-family:Arial,Helvetica,sans-serif">
                                            <div
                                              style="margin:0;padding:0;padding-bottom:8px">
                                              <p style="margin:0;padding:0">
                                                <span style="color:#888888"
                                                  ><strong
                                                    ><span
                                                      style="text-transform:uppercase"
                                                      >What is a
                                                      &#x27;passport&#x27; on
                                                      topia?</span
                                                    ></strong
                                                  ></span
                                                >
                                              </p>
                                            </div>
                                            <div
                                              style="margin:0;padding:0;font-size:14px;line-height:1.5;color:#888888">
                                              <p style="margin:0;padding:0">
                                                Your TOPIA passport is your
                                                identity across the network.
                                                It’s where people discover who
                                                you are, what you create, and
                                                the stamps you’ve collected
                                                along the way.
                                              </p>
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:18px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#888888">
                                    <p style="margin:0;padding:0">
                                      Or paste this link into your browser:<br /><a
                                        href="{{{PROFILE_URL}}}"
                                        rel="noopener noreferrer nofollow"
                                        style="color:inherit;text-decoration-line:none;text-decoration:underline;word-break:break-all"
                                        target="_blank"
                                        ><u>{{{PROFILE_URL}}}</u></a
                                      >
                                    </p>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:28px 32px 0 32px">
                                    <div
                                      style="margin:0;padding:0;height:1px;background:rgba(136,136,136,0.25);line-height:1px;font-size:1px">
                                      <p style="margin:0;padding:0"> </p>
                                    </div>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td
                                    data-id="__react-email-column"
                                    style="margin:0;padding:16px 32px 28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888888">
                                    <p style="margin:0;padding:0">
                                      Culture first. Systems second. Ownership
                                      always.<br />©<!-- -->
                                      TOPIA VISION HOLDINGS LLC
                                    </p>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p style="margin:0;padding:0"><br /></p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!--/$-->
  </body>
</html>`;

const DEFS: TemplateDef[] = [
  {
    id: 'event-invite', label: 'Event invite', scope: 'event',
    subject: '{{{INVITER_NAME}}} invited you to {{{EVENT_NAME}}}',
    variables: ['INVITER_NAME', 'EVENT_NAME', 'EVENT_URL', 'EVENT_WHEN', 'EVENT_WHERE'],
    shell: { title: "You're invited", preheader: 'See the details and RSVP &rarr;', lede: "You're invited", intro: '<strong style="color:inherit;">{{{INVITER_NAME}}}</strong> invited you to', headline: '{{{EVENT_NAME}}}', whenWhere: true, primary: { label: 'View invitation &rarr;', url: 'EVENT_URL' }, fallbackUrl: 'EVENT_URL' },
  },
  {
    id: 'event-rsvp-confirmed', label: 'RSVP confirmed', scope: 'event',
    subject: "You're confirmed for {{{EVENT_NAME}}}",
    variables: ['GUEST_NAME', 'EVENT_NAME', 'EVENT_URL', 'EVENT_WHEN', 'EVENT_WHERE'],
    shell: { title: "You're going", preheader: "You're on the list. See you there &rarr;", lede: "You're going", intro: "<strong style=\"color:inherit;\">{{{GUEST_NAME}}}</strong>, you're confirmed for", headline: '{{{EVENT_NAME}}}', whenWhere: true, primary: { label: 'View event &rarr;', url: 'EVENT_URL' }, fallbackUrl: 'EVENT_URL' },
  },
  {
    id: 'event-rsvp-confirmed-setup', label: 'RSVP confirmed + profile setup', scope: 'event',
    subject: "You're confirmed for {{{EVENT_NAME}}}",
    variables: ['GUEST_NAME', 'EVENT_NAME', 'EVENT_URL', 'EVENT_WHEN', 'EVENT_WHERE', 'PROFILE_URL'],
    shell: { title: "You're going", preheader: "You're in — now claim your Topia profile &rarr;", lede: "You're going", intro: "<strong style=\"color:inherit;\">{{{GUEST_NAME}}}</strong>, you're confirmed for", headline: '{{{EVENT_NAME}}}', whenWhere: true, primary: { label: 'View event &rarr;', url: 'EVENT_URL' }, secondary: true, fallbackUrl: 'EVENT_URL' },
  },
  {
    id: 'event-rsvp-requested', label: 'RSVP request received', scope: 'event',
    subject: 'Request received for {{{EVENT_NAME}}}',
    variables: ['GUEST_NAME', 'EVENT_NAME', 'EVENT_URL', 'EVENT_WHEN', 'EVENT_WHERE'],
    shell: { title: 'Request received', preheader: "Request received — we'll let you know &rarr;", lede: 'Request received', intro: 'Thanks <strong style="color:inherit;">{{{GUEST_NAME}}}</strong> — your request to join', headline: '{{{EVENT_NAME}}}', note: "is pending the host's approval. We'll email you the moment it's confirmed.", whenWhere: true, primary: { label: 'View event &rarr;', url: 'EVENT_URL' }, fallbackUrl: 'EVENT_URL' },
  },
  {
    id: 'event-rsvp-approved', label: 'RSVP approved', scope: 'event',
    subject: "You're approved for {{{EVENT_NAME}}}",
    variables: ['GUEST_NAME', 'EVENT_NAME', 'EVENT_URL', 'EVENT_WHEN', 'EVENT_WHERE'],
    shell: { title: "You're approved", preheader: "You're approved — you're going &rarr;", lede: "You're approved", intro: '<strong style="color:inherit;">{{{GUEST_NAME}}}</strong>, the host confirmed your spot for', headline: '{{{EVENT_NAME}}}', whenWhere: true, primary: { label: 'View event &rarr;', url: 'EVENT_URL' }, fallbackUrl: 'EVENT_URL' },
  },
  {
    id: 'event-rsvp-declined', label: 'RSVP declined', scope: 'event',
    subject: 'An update on your {{{EVENT_NAME}}} request',
    variables: ['GUEST_NAME', 'EVENT_NAME', 'EVENT_URL'],
    shell: { title: 'An update on your request', preheader: 'An update on your request', lede: 'Update', intro: 'Thanks for your interest, <strong style="color:inherit;">{{{GUEST_NAME}}}</strong>. The host wasn’t able to confirm your spot for', headline: '{{{EVENT_NAME}}}', note: "this time — keep an eye out, there's always more happening on Topia.", whenWhere: false, primary: { label: 'View event &rarr;', url: 'EVENT_URL' }, fallbackUrl: 'EVENT_URL' },
  },
  {
    id: 'event-host-rsvp-alert', label: 'Host RSVP alert', scope: 'event',
    subject: 'New {{{STATUS}}} for {{{EVENT_NAME}}}',
    variables: ['GUEST_NAME', 'EVENT_NAME', 'STATUS', 'MANAGE_URL', 'EVENT_WHEN', 'EVENT_WHERE'],
    shell: { title: 'New activity on your event', preheader: '{{{GUEST_NAME}}} · {{{EVENT_NAME}}}', lede: 'New {{{STATUS}}}', intro: '<strong style="color:inherit;">{{{GUEST_NAME}}}</strong> sent a {{{STATUS}}} for', headline: '{{{EVENT_NAME}}}', whenWhere: true, primary: { label: 'Manage event &rarr;', url: 'MANAGE_URL' }, fallbackUrl: 'MANAGE_URL' },
  },
  {
    id: 'complete-your-profile', label: 'Complete your profile', scope: 'profile',
    subject: 'Claim your TOPIA passport',
    variables: ['USER_NAME', 'PROFILE_URL'],
    html: COMPLETE_PROFILE_HTML,
  },
];

export const EMAIL_TEMPLATES: EmailTemplate[] = DEFS.map(({ shell: s, html: h, ...rest }) => ({ ...rest, html: h ?? (s ? shell(s) : '') }));

export function getTemplate(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}

// Replace every {{{KEY}}} with vars[KEY] (missing keys → empty string).
export function renderTemplate(source: string, vars: Record<string, string>): string {
  return source.replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => vars[key] ?? '');
}
