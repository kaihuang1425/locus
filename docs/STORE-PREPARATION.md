# Chrome Web Store preparation — 3.1.1

Prepared on 12 November 2026. This is a package candidate, not a submitted or
approved Store release.

The manifest description is now within Chrome's 132-character limit. Version
3.1.1 contains that metadata fix and matching displayed-version fallbacks; it
does not change permissions or the data schema. The current noncommercial
research license remains in force.

## Build

```sh
python scripts/package-extension.py --output dist/chrome-web-store
```

The standard-library script includes runtime HTML, CSS, JavaScript, icons,
fonts and license files through an explicit allowlist. It checks local HTML/CSS
asset references, Manifest V3 and permission/CSP boundaries, then produces a
reproducible upload ZIP, an unpacked copy and per-file SHA-256 hashes. It excludes
design studies, marketing pages, docs, tests, development history and the optional
desktop companion. Do not upload a ZIP of the entire repository.

## Evidence

All 63 JavaScript syntax checks and all 50 existing test suites passed. The
companion suite needed normal Windows named-pipe permissions; its isolated rerun
passed 66 checks. Two Settings suites had obsolete expectations for retired
disclosure wrappers and appearance controls. They now match the current UI while
preserving persistence, undo, privacy, focus, locale and contrast assertions.

These results cover the contracts the suites model. They do not prove that the
packaged extension installs, receives Chrome events, sends notifications or
connects to a native host in a real browser.

## Still required before submission

1. Load this exact unpacked build in a disposable browser profile and exercise
   save, find, reopen, task completion, reload, backup/restore and reminders.
2. Capture at least one current-interface screenshot at 1280 × 800 or 640 × 400.
   Use synthetic content and no personal browsing data. The prepared icon is
   128 × 128 PNG. Optional promotional images are 440 × 280 and 1400 × 560.
3. Enter the listing, permission explanations, public privacy URL, data
   disclosures, distribution and developer-account fields in the dashboard.
   Review the final preview before submitting.

An attempted localhost interface preview was not reachable by the browser.
No screenshots or installed-browser pass are claimed from that attempt. The
public [privacy policy](./PRIVACY.md) describes local handling, optional tools,
user-directed exports and the optional companion/assistant path. Local-only data
still needs disclosure; do not use a blanket “no data” declaration.

Sources: [package requirements](https://developer.chrome.com/docs/webstore/prepare),
[image requirements](https://developer.chrome.com/docs/webstore/images),
[privacy disclosure](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
