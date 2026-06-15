---
name: bilingual-chrome-translate
description: Build, install, use, or troubleshoot a Codex-assisted Chrome extension that preserves English originals before Chrome Translate runs and displays those originals beside the Chinese translated page. Use when the user wants bilingual English/Chinese reading in Chrome after using built-in translation, needs help loading the unpacked extension, wants to improve the extension behavior, or asks why original text cannot be recovered after translation.
---

# Bilingual Chrome Translate

## Overview

Use this skill to help users keep English source text visible on pages translated to Chinese by Chrome. The supported implementation is a Chrome extension that captures visible English DOM text before translation, then inserts the saved English text beside the translated Chinese text.

## Core Constraint

Do not promise that Chrome's built-in translator can reveal the original text after translation. Treat the reliable workflow as:

1. Capture English before Chrome Translate replaces page text.
2. Let Chrome translate the page to Chinese.
3. Reinsert the captured English beside the translated Chinese.

If the user already translated the page before capture, ask them to refresh or open the original page again, then capture before translating.

## Extension Location

The reference extension for this workspace lives at:

`chrome-extension/`

Key files:

- `manifest.json`: Manifest V3 configuration.
- `content.js`: Marks source elements, captures original text, stores it in `chrome.storage.local`, and renders English markers according to block, list, and table structure.
- `content.css`: Styles inserted English text.
- `popup.html`, `popup.css`, `popup.js`: Browser action UI.

## User Workflow

Give users these concise steps:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked" and select the workspace `chrome-extension` folder.
4. Open an English page.
5. Click the extension and choose "捕获英文原文".
6. Use Chrome's built-in translation to translate the page to Chinese.
7. Click the extension again and choose "显示中英对照".

## Troubleshooting

- If no English appears, confirm the user captured before translating and refresh if needed.
- If the extension code changed, tell the user to click the extension refresh icon in `chrome://extensions`, then refresh the webpage and repeat capture -> translate -> show.
- If navigation, sidebars, or GitHub repository chrome appears in the bilingual output, narrow capture to content roots such as `.markdown-body`, `article`, and `main`, and exclude headers, nav, sidebars, forms, and toolbars.
- If inserted English flickers between English and Chinese, make inserted markers `translate="no"` and `notranslate`, and avoid MutationObserver-driven rerender loops unless the user explicitly asks for live dynamic-page support.
- If English duplicates as a large combined paragraph, avoid capturing aggregate containers such as `ul`, `ol`, `table`, `blockquote`, or `.markdown-body`; capture concrete elements such as `p`, `li`, headings, `td`, and `th`.
- If tables break layout, render English inside each `td`/`th` rather than after the cell. If lists lose formatting, render English inside the same `li` rather than after it.
- If multi-line English collapses into one line, preserve line breaks with a line-normalization helper and render marker text with `white-space: pre-line`.
- If the user wants refresh or revisit persistence, store captures in `chrome.storage.local` by origin and pathname, then auto-restore only when the content root appears translated.
- If headings or outer section titles look like large cards, render headings with a dedicated subtitle mode instead of the standard paragraph marker.
- If code blocks appear in the English marker, skip standalone `pre` blocks and pure code-like elements. Do not skip whole explanatory sentences merely because they contain inline `code`, `kbd`, or `samp` nodes.
- If a list item has nested lists or code blocks, insert the English marker before the nested flow content so it stays attached to the current translated list sentence.
- When finding nested flow content, inspect direct child containers too; GitHub often wraps `pre` in a highlight `div`, so the insertion point should be that wrapper instead of the descendant `pre`.
- If a site such as Anthropic uses `div`, `section`, or `header` leaf blocks instead of normal `h1`/`p` elements, capture those generic leaf text blocks conservatively. Reject generic containers that contain structured descendants to avoid capturing whole sections.
- Prefer broad content roots such as `main` or `[role=main]` before narrower `article` roots when hero titles or standfirst paragraphs live outside the article body. Do not blanket-exclude `header`; exclude site chrome through `nav`, `[role=banner]`, and known app-header selectors instead.
- In grid or flex layouts, render markers inside the source text element so English appears below the Chinese text rather than as a sibling placed in another column.
- Do not apply stored margin or width hints to markers appended inside the source element; only use layout hints for markers inserted as external siblings.
- If English appears unaligned on pages with custom layouts, store a small style hint from the source element, such as margin-left and width, and apply it to the marker.
- If Chrome says the extension cannot access the page, test on a normal `https://` page; Chrome blocks content scripts on browser-internal pages such as `chrome://`.
- If alignment is wrong on a dynamic page, refresh, wait for the page to finish loading, capture again, translate, then show bilingual text.
- If text is inside images, video, canvas, or cross-origin iframes, explain that the extension cannot read it as normal DOM text.
- If the page changes after rendering bilingual text, use "隐藏英文" and then "显示中英对照" again.

## Iteration Guidance

When improving the extension:

- Keep the extension offline-first; do not add translation APIs unless the user explicitly asks.
- Prefer marking source elements with `data-bct-id` before translation. Keep DOM path fallback for older captures or pages that strip attributes.
- Preserve semantic structure when rendering: blocks use `after-block`, list items use `inside-list-item`, and table cells use `inside-cell`.
- Prefer plain secondary text over badges or heavy cards. Avoid persistent `EN` pills unless the user explicitly asks for labels.
- Avoid modifying form fields, code blocks, scripts, styles, SVG, canvas, and hidden content.
- Preserve a clear manual order: capture first, translate second, render bilingual third.

For deeper implementation notes, read `references/extension-design.md`.
