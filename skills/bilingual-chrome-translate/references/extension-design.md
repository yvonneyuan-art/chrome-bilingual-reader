# Extension Design Notes

The extension cooperates with Chrome Translate instead of replacing it.

## Why capture first

Chrome Translate can replace DOM text nodes with translated text. After that point, a normal content script may not be able to recover the original English. The reliable design is to preserve original text before translation begins.

## Data model

Each captured entry stores:

- `id`: a `data-bct-id` marker written onto the source element before translation.
- `path`: a DOM path to the text node.
- `parentPath`: a DOM path to the text node's parent element.
- `tagName`: the source element tag.
- `text`: the normalized English original.

The prototype stores entries in `chrome.storage.local` using the current origin and path. This lets a page refresh or same-page revisit restore bilingual display after Chrome translation runs again.

## Rendering model

After Chrome translates the page, the extension first looks up the saved `data-bct-id` marker and inserts a `.bct-original.notranslate` span. It sets `translate="no"` so Chrome should not translate inserted English. It falls back to DOM paths only when the marker is unavailable. It does not replace translated Chinese.

Render according to structure:

- `after-block`: headings, paragraphs, captions, summaries, and definition-list items render after the source block.
- `heading-subtitle`: headings render as small secondary subtitles below the translated heading.
- `inside-list-item`: list items render inside the same `li` to preserve bullets and indentation.
- `inside-cell`: table headers and cells render inside the same `th`/`td` to preserve table layout.

Preserve multi-line source text with line normalization and `white-space: pre-line`.
Skip standalone code blocks and pure code-like elements. Keep explanatory sentences that contain inline code, because the sentence still needs an English counterpart.
For list items that contain nested lists, tables, or code blocks, insert the English marker before the nested flow content so it stays aligned with the current list sentence.
Detect nested flow by checking each direct child and whether that child contains `ul`, `ol`, `pre`, or `table`; this handles GitHub's code-block wrapper elements.
Some article sites put hero titles or standfirst paragraphs directly inside `div`, `section`, or `header` elements. Capture these only when they are leaf-like text blocks without structured descendants.
Prefer `main`/`[role=main]` roots before `article` roots when a page splits the hero header from the article body. Avoid blanket `header` exclusion because content headers can contain real article text.
When a parent uses grid or flex layout, inserting a marker as a sibling can place it in the next column. Prefer appending the marker inside the source text element for headings and paragraph-like blocks.
When appending inside the source element, ignore stored margin and width hints and force the marker to fill the current text block.
For layout alignment, capture small style hints from the source element, such as margin-left and width, and apply them to the English marker.

## Capture scope

Prefer real reading content over browser or app chrome. The prototype prioritizes `.markdown-body`, `article`, and `main`, then excludes common navigation, header, sidebar, form, and toolbar regions. Capture concrete content elements (`p`, `li`, headings, `td`, `th`) rather than aggregate containers (`ul`, `ol`, `table`, `blockquote`, `.markdown-body`) to avoid duplicated combined paragraphs.

## Known limits

- DOM structure can change between capture and render.
- Some pages do not expose a clean article container; capture scope may need page-specific selectors.
- Auto-restore is conservative: it only runs when the URL has a stored capture and the content root appears to contain Chinese characters.
- Text inside images, videos, canvas, SVG, and cross-origin iframes is unavailable.
- Browser-internal pages such as `chrome://` do not allow regular content scripts.
- Pages with virtualized content may require capturing only after the desired content is visible.
