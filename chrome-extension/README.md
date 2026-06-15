# Chrome Bilingual Reader

This unpacked Chrome extension keeps English originals visible after Chrome translates a page into Chinese.

## Use

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose "Load unpacked" and select this `chrome-extension` folder.
4. Open an English page.
5. Click the extension and choose "捕获英文原文".
6. Use Chrome's built-in translation to translate the page to Chinese.
7. Click the extension again and choose "显示中英对照".
8. If you updated this extension's files, click the refresh icon for it on `chrome://extensions`, then refresh the webpage before testing again.

## Notes

- Capture must happen before Chrome replaces the English text.
- The extension prioritizes article-style content such as GitHub README `.markdown-body`, `article`, and `main` areas, and skips navigation, headers, sidebars, forms, and toolbars.
- It renders by structure: block text after the source block, list text inside the list item, and table text inside the table cell.
- Multi-line English is preserved with line breaks.
- Heading translations render as subtle subtitles. Standalone code blocks are skipped, while explanatory sentences that contain inline code are still captured.
- English originals are shown as plain secondary text without an `EN` label.
- Captures are stored in extension storage by page URL, so refreshes and same-page revisits can restore bilingual display after Chrome translation runs again.
- For list items that introduce nested code blocks, the English line is inserted before the code-block wrapper, not after the whole list item.
- Non-standard article layouts that place text directly in `div`, `section`, or `header` leaf blocks are captured conservatively.
- Article roots prefer broad `main`/`[role=main]` containers before narrower `article` containers so hero titles and standfirst text outside the article body are included.
- In grid or flex article layouts, markers render inside the source text block so English appears below Chinese instead of in a neighboring column.
- Markers rendered inside the source text block ignore stored margin/width hints to avoid being pushed sideways.
- The extension handles normal DOM text. It does not read text inside images, videos, canvas, or cross-origin iframes.
- Dynamic pages can change structure after capture. If alignment looks wrong or no text appears, refresh, clear the page cache in the extension, capture again, translate, then show bilingual text.
- Auto-restore only works when the page URL matches a previous capture and the page appears translated.
