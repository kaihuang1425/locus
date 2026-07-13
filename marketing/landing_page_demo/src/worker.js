const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const ALLOWED_TYPES = new Set(['feature', 'bug', 'general']);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/feedback') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
      }
      return handleFeedback(request, env, ctx);
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found.' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleFeedback(request, env, ctx) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return json({ error: 'Expected JSON.' }, 415);

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12_000) return json({ error: 'Submission is too large.' }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const type = clean(body.type, 30);
  const name = clean(body.name, 80);
  const email = clean(body.email, 160).toLowerCase();
  const message = clean(body.message, 4000);
  const pageUrl = clean(body.pageUrl, 500);
  const turnstileToken = clean(body.turnstileToken, 2048);

  if (!ALLOWED_TYPES.has(type)) return json({ error: 'Choose a valid feedback type.' }, 400);
  if (message.length < 10) return json({ error: 'Please provide a little more detail.' }, 400);
  if (email && !isEmail(email)) return json({ error: 'Enter a valid email address.' }, 400);

  if (env.TURNSTILE_SECRET) {
    if (!turnstileToken) return json({ error: 'Please complete the verification.' }, 400);
    const valid = await verifyTurnstile(turnstileToken, request, env.TURNSTILE_SECRET);
    if (!valid) return json({ error: 'Verification failed. Refresh and try again.' }, 400);
  }

  if (!env.DB) return json({ error: 'Feedback storage is not configured.' }, 503);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const fingerprint = await sha256(`${env.RATE_LIMIT_SALT || 'locus-feedback'}:${ip}`);
  const recent = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM feedback
     WHERE network_hash = ? AND created_at >= datetime('now', '-15 minutes')`
  ).bind(fingerprint).first();

  if (Number(recent?.count || 0) >= 5) {
    return json({ error: 'Too many submissions. Please try again later.' }, 429, { 'Retry-After': '900' });
  }

  const id = crypto.randomUUID();
  const userAgent = clean(request.headers.get('user-agent') || '', 300);
  await env.DB.prepare(
    `INSERT INTO feedback
      (id, type, name, email, message, page_url, user_agent, network_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`
  ).bind(id, type, name || null, email || null, message, pageUrl || null, userAgent || null, fingerprint).run();

  if (env.RESEND_API_KEY && env.FEEDBACK_NOTIFY_EMAIL && env.RESEND_FROM) {
    ctx.waitUntil(sendNotification(env, { id, type, name, email, message, pageUrl }));
  }

  return json({ ok: true, id }, 201);
}

async function verifyTurnstile(token, request, secret) {
  const formData = new FormData();
  formData.set('secret', secret);
  formData.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) formData.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

async function sendNotification(env, submission) {
  const safeMessage = escapeHtml(submission.message).replace(/\n/g, '<br>');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [env.FEEDBACK_NOTIFY_EMAIL],
      subject: `[Locus feedback] ${submission.type}: ${submission.message.slice(0, 60)}`,
      html: `<h2>New Locus feedback</h2>
        <p><strong>ID:</strong> ${escapeHtml(submission.id)}</p>
        <p><strong>Type:</strong> ${escapeHtml(submission.type)}</p>
        <p><strong>Name:</strong> ${escapeHtml(submission.name || 'Not provided')}</p>
        <p><strong>Email:</strong> ${escapeHtml(submission.email || 'Not provided')}</p>
        <p><strong>Page:</strong> ${escapeHtml(submission.pageUrl || 'Not provided')}</p>
        <hr><p>${safeMessage}</p>`,
    }),
  });
  if (!response.ok) console.error('Resend notification failed', response.status, await response.text());
}

function clean(value, max) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}
async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}
