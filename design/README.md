# design/ — non-shipping design material

Nothing in this folder is part of the extension. Chrome ignores it when the repo
root is loaded unpacked, and no product code references it.

## previews/

The PNG design targets (formerly the root `UI Design Preview/` folder). When several
versions of a screen exist, the **newest file date wins**. Implementation status per
preview: `.claude/docs/STATUS.md`.

## fixtures/

Static HTML mockups with hardcoded demo data — safe to open, never linked from the
product.

- `home-preview.html` — the home-surface mockup. It reuses the real `themes.css` /
  `newtab.css` from the repo root via relative paths, so **open it from this repo**
  (double-click works, or serve the repo root — see `.claude/launch.json`
  `folio-static` → `http://localhost:8777/design/fixtures/home-preview.html`).
  If you move it again, fix its `../../` asset paths.

## icon-explorations/

Icon/logo history, unused alternates, and retired tooling:

- `logo-options/` — early logo candidates (open `index.html` to browse).
- `locus_icons_one_folder_glyph_nobg/` — unused alternate of the category icon set
  (the shipped set is `media/locus_icons_one_folder_badge_nobg/`, which the
  extension loads at runtime — do NOT move that one).
- `icon-legacy.png`, `favicon.ico` — superseded marks.
- `generate.html` — retired icon generator; its source image
  (`icon-source-clean.png`) was deleted during the Locus rebrand, so it no longer
  runs. Kept for reference.
