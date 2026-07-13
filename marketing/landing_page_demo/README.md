# Locus landing page

A dependency-light, responsive marketing site for the Locus browser extension. It includes a redesigned Locus logo, coded product mockup, feature and use-case sections, changelog, FAQ, legal-page starters, and a production-oriented feedback pipeline.

## Stack

- Static HTML, CSS, and small vanilla JavaScript
- Cloudflare Workers Static Assets
- Cloudflare Worker API for `/api/feedback`
- Cloudflare D1 for feedback storage
- Optional Cloudflare Turnstile verification
- Optional Resend email notification

The static pages do not invoke Worker code. Only `/api/*` runs through the Worker.

## Local setup

```bash
npm install
npm run db:migrate:local
npm run dev
```

Wrangler will show the local URL. The D1 database runs locally during development.

## Create the production D1 database

```bash
npx wrangler login
npm run db:create
```

Copy the database ID returned by Wrangler into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`, then apply the migration:

```bash
npm run db:migrate:remote
```

## Enable Turnstile

1. Create a Turnstile widget for the production hostname.
2. Put the public site key in `public/app.js`:

```js
turnstileSiteKey: 'YOUR_SITE_KEY'
```

3. Add the secret to the Worker:

```bash
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put RATE_LIMIT_SALT
```

Server-side verification is already implemented. During local development, leaving the secret unset makes Turnstile optional.

## Enable email notifications

The submission is always stored in D1 first. Email is optional and is sent through Resend when all three values exist:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put FEEDBACK_NOTIFY_EMAIL
npx wrangler secret put RESEND_FROM
```

The sending domain must be verified with Resend.

## Configure the extension link

In `public/app.js`, replace:

```js
extensionUrl: '#'
```

with the final Chrome Web Store URL. Until then, the CTA scrolls to the feedback section rather than sending visitors to a broken page.

## Deploy

```bash
npm run deploy
```

Then attach the custom domain in the Cloudflare dashboard.

## Before public launch

- Replace the canonical hostname and `locus.example` email addresses.
- Replace the demo modal with real product footage.
- Review all product claims and update the sample changelog dates.
- Replace the privacy and terms starter text with policies matching the final extension behavior.
- Add the actual Chrome Web Store URL.
- Test the form with Turnstile enabled on the production hostname.

## Feedback data

The database stores the chosen type, optional name and email, message, page URL, user agent, status, timestamp, and a SHA-256 network fingerprint for rate limiting. It does not store the raw IP address.
