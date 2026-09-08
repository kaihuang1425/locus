# Locus design correction — September 2026

Follow `UX_SIMPLIFICATION.md`; preserve the local extension, stored items, routes,
and existing preferences. No new schemas, permissions, or network calls.

## Component contracts and implementation plan

1. **Welcome:** one sentence, Save your first tab, Explore on my own. Saving closes
   welcome and opens a live tab picker from Home; dismissal persists welcomeSeen.
   Escape dismisses only welcome; Tab stays inside; no questionnaire, automatic
   layout changes, coach mark, or second landing layer. Existing profile and tool
   choices are untouched. New profiles launch Home with the tabs rail collapsed;
   legacy profiles keep their prior defaults and explicit preferences.
2. **Shell:** Home, Inbox, All Links, Search, More; Spaces retain a stable scroll
   region. More reveals secondary destinations without removing their routes.
   Search remains the existing route/palette. Save opens a picker of real current
   window tabs, with explicit Space → Inbox destination. Empty/error states allow
   retry; successful capture opens Inbox. Existing deduplication, metadata and
   close-after-save preferences apply. A failed storage write must not close tabs.
3. **Home:** compact greeting, active Space's Inbox with real count and review
   action, up to three Spaces ordered by latest stored creation timestamp.
   No invented recency for undated items. View all reveals the rest in place.
   Card buttons remain keyboard accessible and do not contain nested buttons.
4. **Cards:** reserve a separate actions row, readable multiline titles, persistent
   action access for keyboard and touch, no title-obscuring overlay or hover lift.
5. **Secondary controls:** Calendar starts in Agenda when sparse; explicit routes
   retain their views. Layouts remain available with an Advanced views divider.
   Tools uses its existing modal, with opener restoration and a Tab trap.

## Validation

Check syntax, markup IDs, English/zh-TW keys, actual capture/deduplication/failure
logic, welcome dismissal and preservation of existing preferences. Run a local
DOM/VM harness if authenticated browser runtime is unavailable. Report any missing
rendered extension verification honestly; the 4-of-5 usability gate remains a
separate human check and must not be represented as passed.
