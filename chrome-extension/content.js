(() => {
  const MARKER_CLASS = "bct-original";
  const MARKER_TEXT_CLASS = "bct-original-text";
  const NO_TRANSLATE_CLASS = "notranslate";
  const SCHEMA_VERSION = 10;
  const STORAGE_PREFIX = "bct-originals:";
  const ID_ATTRIBUTE = "data-bct-id";
  const CAPTURE_SELECTOR = [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "figcaption",
    "caption",
    "summary",
    "dt",
    "dd",
    "td",
    "th"
  ].join(",");
  const GENERIC_TEXT_SELECTOR = [
    "div",
    "section",
    "header"
  ].join(",");
  const CONTENT_ROOT_SELECTOR = [
    ".markdown-body",
    "main",
    "[role='main']",
    "main article",
    "[role='main'] article",
    "article"
  ].join(",");
  const EXCLUDED_ANCESTOR_SELECTOR = [
    `.${MARKER_CLASS}`,
    "nav",
    "footer",
    "aside",
    "form",
    "button",
    "[role='navigation']",
    "[role='banner']",
    "[role='contentinfo']",
    "[role='search']",
    "[role='tablist']",
    "[role='toolbar']",
    "[aria-hidden='true']",
    "[hidden]",
    ".Header",
    ".AppHeader",
    ".UnderlineNav",
    ".Layout-sidebar",
    ".file-navigation",
    ".Box-header",
    ".react-directory-row",
    ".js-repo-nav"
  ].join(",");
  const CODE_SELECTOR = "pre, code, kbd, samp";
  const BLOCK_CHILD_SELECTOR = ":scope > p, :scope > table";
  const NESTED_FLOW_SELECTOR = "ul, ol, pre, table";
  const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
  const STRUCTURED_DESCENDANT_SELECTOR = [
    CAPTURE_SELECTOR,
    "article",
    "main",
    "section",
    "ul",
    "ol",
    "table",
    "pre"
  ].join(",");

  let originals = null;
  let currentStorageKey = storageKey();

  loadOriginals().then((storedOriginals) => {
    originals = storedOriginals;
    window.setTimeout(tryAutoRestore, 1200);
    window.setTimeout(tryAutoRestore, 3000);
    window.setTimeout(tryAutoRestore, 6000);
  });
  window.setInterval(checkForUrlChange, 1000);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.action) return false;

    const actions = {
      captureOriginals,
      showBilingual,
      hideBilingual,
      clearOriginals
    };

    const handler = actions[message.action];
    if (!handler) return false;

    Promise.resolve()
      .then(handler)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, message: error.message }));
    return true;
  });

  async function captureOriginals() {
    hideBilingual();
    const entries = [];

    for (const target of collectCaptureElements()) {
      const text = getReadableText(target);
      if (!shouldKeepText(text)) continue;

      const id = ensureCaptureId(target);
      entries.push({
        schemaVersion: SCHEMA_VERSION,
        id,
        parentPath: getElementPath(target),
        tagName: target.tagName.toLowerCase(),
        renderMode: getRenderMode(target),
        styleHint: getStyleHint(target),
        text
      });
    }

    originals = {
      schemaVersion: SCHEMA_VERSION,
      url: location.href,
      capturedAt: new Date().toISOString(),
      entries
    };
    await saveOriginals(originals);

    return {
      ok: true,
      message: `已捕获 ${entries.length} 段英文。现在可以使用 Chrome 翻译，再点“显示中英对照”。`
    };
  }

  async function showBilingual() {
    if (!originals?.entries?.length) {
      originals = await loadOriginals();
    }
    if (!originals?.entries?.length) {
      return { ok: false, message: "没有英文缓存。请先在翻译前点“捕获英文原文”。" };
    }
    if (originals.schemaVersion !== SCHEMA_VERSION) {
      return { ok: false, message: "缓存来自旧版本。请刷新页面后重新捕获英文，再翻译并显示中英对照。" };
    }

    hideBilingual();
    let rendered = 0;

    for (const entry of originals.entries) {
      const target = findRenderTarget(entry);
      if (!target || !document.body.contains(target)) {
        continue;
      }

      const marker = document.createElement("span");
      marker.className = `${MARKER_CLASS} ${NO_TRANSLATE_CLASS}`;
      marker.setAttribute("lang", "en");
      marker.setAttribute("translate", "no");
      marker.setAttribute("data-bct", "original");
      marker.appendChild(createText(entry.text));

      renderMarker(target, marker, entry);
      rendered += 1;
    }

    return {
      ok: true,
      message: rendered
        ? `已显示 ${rendered} 段英文原文。`
        : "没有找到可插入的位置。请刷新页面，先捕获英文，再翻译，最后显示中英对照。"
    };
  }

  function hideBilingual() {
    for (const marker of document.querySelectorAll(`.${MARKER_CLASS}`)) {
      marker.remove();
    }
    return { ok: true, message: "已隐藏英文原文。" };
  }

  async function clearOriginals() {
    hideBilingual();
    for (const element of document.querySelectorAll(`[${ID_ATTRIBUTE}]`)) {
      element.removeAttribute(ID_ATTRIBUTE);
    }
    originals = null;
    await removeOriginals();
    return { ok: true, message: "已清除本页英文缓存。" };
  }

  function collectCaptureElements() {
    const root = getContentRoot();
    const candidates = Array.from(root.querySelectorAll(`${CAPTURE_SELECTOR}, ${GENERIC_TEXT_SELECTOR}`));
    if (root.matches?.(`${CAPTURE_SELECTOR}, ${GENERIC_TEXT_SELECTOR}`)) {
      candidates.unshift(root);
    }

    return candidates
      .filter((element) => {
        if (element.closest(EXCLUDED_ANCESTOR_SELECTOR)) return false;
        if (!isInsideReadableArea(element)) return false;
        if (!isVisible(element)) return false;
        if (isCodeLikeElement(element)) return false;
        if (isGenericTextElement(element) && !isSafeGenericTextBlock(element, root)) {
          return false;
        }
        if (element.tagName === "LI" && element.querySelector(BLOCK_CHILD_SELECTOR)) {
          return false;
        }
        return true;
      });
  }

  function getContentRoot() {
    for (const selector of CONTENT_ROOT_SELECTOR.split(",")) {
      const root = document.querySelector(selector.trim());
      if (root && normalize(root.innerText || root.textContent).length > 80) {
        return root;
      }
    }
    return document.body;
  }

  function isInsideReadableArea(element) {
    if (document.querySelector(".markdown-body")) {
      return Boolean(element.closest(".markdown-body"));
    }
    return true;
  }

  function shouldKeepText(text) {
    const compactText = normalize(text);
    if (compactText.length < 2) return false;
    if (!/[A-Za-z]/.test(text)) return false;
    if (/^[\d\s.,:;!?()[\]{}'"“”‘’\-–—/\\|]+$/.test(text)) return false;
    return true;
  }

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeLines(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .filter(Boolean)
      .join("\n");
  }

  function getReadableText(element) {
    const clone = element.cloneNode(true);
    for (const child of clone.querySelectorAll([
      `.${MARKER_CLASS}`,
      "script",
      "style",
      "noscript",
      "svg",
      "canvas",
      "iframe",
      "pre"
    ].join(","))) {
      child.remove();
    }

    if (element.tagName === "LI") {
      for (const child of clone.querySelectorAll(":scope > ul, :scope > ol")) {
        child.remove();
      }
      for (const child of clone.querySelectorAll(":scope > pre, :scope > table")) {
        child.remove();
      }
      for (const child of Array.from(clone.children)) {
        if (child.matches(NESTED_FLOW_SELECTOR) || child.querySelector(NESTED_FLOW_SELECTOR)) {
          child.remove();
        }
      }
    }

    return normalizeLines(clone.innerText || clone.textContent);
  }

  function getRenderMode(element) {
    if (element.matches("td, th")) return "inside-cell";
    if (element.matches("li")) return "inside-list-item";
    if (element.matches(HEADING_SELECTOR) || looksLikeHeroHeading(element)) return "heading-subtitle";
    return "after-block";
  }

  function renderMarker(target, marker, entry) {
    marker.classList.add(`bct-${entry.renderMode}`);

    if (entry.renderMode === "inside-cell" || entry.renderMode === "heading-subtitle") {
      marker.classList.add("bct-inside-block");
      target.appendChild(marker);
      return;
    }
    if (entry.renderMode === "inside-list-item") {
      marker.classList.add("bct-inside-block");
      const nestedFlow = findDirectNestedFlow(target);
      if (nestedFlow) {
        target.insertBefore(marker, nestedFlow);
      } else {
        target.appendChild(marker);
      }
      return;
    }

    if (shouldRenderInsideBlock(target)) {
      marker.classList.add("bct-inside-block");
      target.appendChild(marker);
      return;
    }

    applyStyleHint(marker, entry.styleHint);
    target.insertAdjacentElement("afterend", marker);
  }

  function shouldRenderInsideBlock(element) {
    if (element.matches("p, figcaption, caption, summary, dt, dd")) return true;
    if (!isGenericTextElement(element)) return false;
    const parentStyle = window.getComputedStyle(element.parentElement || document.body);
    return parentStyle.display.includes("grid") || parentStyle.display.includes("flex");
  }

  function findDirectNestedFlow(element) {
    for (const child of element.children) {
      if (child.matches(NESTED_FLOW_SELECTOR)) return child;
      if (child.querySelector(NESTED_FLOW_SELECTOR)) return child;
    }
    return null;
  }

  function createText(text) {
    const textElement = document.createElement("span");
    textElement.className = MARKER_TEXT_CLASS;
    textElement.textContent = text;
    return textElement;
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function isCodeLikeElement(element) {
    if (element.matches(CODE_SELECTOR)) return true;
    const text = normalize(element.innerText || element.textContent);
    if (!text) return false;
    const codeText = Array.from(element.querySelectorAll(CODE_SELECTOR))
      .map((node) => normalize(node.innerText || node.textContent))
      .join(" ");
    if (codeText && codeText.length / text.length > 0.45) {
      return !shouldKeepText(getReadableText(element));
    }
    if (/^[\w./:-]+\s*[:=]\s*[\w./:-]+$/.test(text)) return true;
    return false;
  }

  function isGenericTextElement(element) {
    return element.matches(GENERIC_TEXT_SELECTOR);
  }

  function isSafeGenericTextBlock(element, root) {
    if (element === root) return false;
    if (element.querySelector(STRUCTURED_DESCENDANT_SELECTOR)) return false;

    const text = getReadableText(element);
    if (!shouldKeepText(text)) return false;
    if (text.length > 420) return false;

    const parent = element.parentElement;
    if (parent && parent.children.length <= 1 && getReadableText(parent) === text && parent !== root) {
      return false;
    }

    return true;
  }

  function looksLikeHeroHeading(element) {
    if (!isGenericTextElement(element)) return false;
    const text = normalize(element.innerText || element.textContent);
    if (text.length > 120) return false;
    const style = window.getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize || "0");
    const fontWeight = Number.parseInt(style.fontWeight || "400", 10);
    return fontSize >= 28 || fontWeight >= 650;
  }

  function getStyleHint(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      marginLeft: style.marginLeft,
      maxWidth: rect.width ? `${Math.round(rect.width)}px` : ""
    };
  }

  function applyStyleHint(marker, styleHint) {
    if (!styleHint) return;
    if (styleHint.marginLeft && styleHint.marginLeft !== "0px") {
      marker.style.marginLeft = styleHint.marginLeft;
    }
    if (styleHint.maxWidth) {
      marker.style.maxWidth = styleHint.maxWidth;
    }
  }

  function ensureCaptureId(element) {
    const existingId = element.getAttribute(ID_ATTRIBUTE);
    if (existingId) return existingId;

    const id = `bct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    element.setAttribute(ID_ATTRIBUTE, id);
    return id;
  }

  function findRenderTarget(entry) {
    if (entry.id) {
      const marked = document.querySelector(`[${ID_ATTRIBUTE}="${cssEscape(entry.id)}"]`);
      if (marked) return marked;
    }

    const byParentPath = findElement(entry.parentPath);
    if (byParentPath) return byParentPath;
    return null;
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function getElementPath(element) {
    const parts = [];
    let current = element;
    while (current && current !== document.body) {
      const parent = current.parentElement;
      if (!parent) break;
      const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
      parts.unshift(`${current.tagName.toLowerCase()}[${siblings.indexOf(current)}]`);
      current = parent;
    }
    return `body/${parts.join("/")}`;
  }

  function findElement(path) {
    if (!path || !path.startsWith("body")) return null;
    let current = document.body;
    const parts = path.split("/").slice(1).filter(Boolean);
    for (const part of parts) {
      const match = part.match(/^([a-z0-9-]+)\[(\d+)\]$/i);
      if (!match) return null;
      const tag = match[1].toUpperCase();
      const index = Number(match[2]);
      current = Array.from(current.children).filter((child) => child.tagName === tag)[index];
      if (!current) return null;
    }
    return current;
  }

  function storageKey() {
    return `${STORAGE_PREFIX}${location.origin}${location.pathname}`;
  }

  async function saveOriginals(value) {
    await storageSet({ [storageKey()]: value });
  }

  async function loadOriginals() {
    const stored = await storageGet(storageKey());
    return stored?.[storageKey()] || null;
  }

  async function removeOriginals() {
    await storageRemove(storageKey());
  }

  function storageGet(key) {
    return new Promise((resolve) => chrome.storage.local.get(key, resolve));
  }

  function storageSet(value) {
    return new Promise((resolve) => chrome.storage.local.set(value, resolve));
  }

  function storageRemove(key) {
    return new Promise((resolve) => chrome.storage.local.remove(key, resolve));
  }

  async function tryAutoRestore() {
    if (document.querySelector(`.${MARKER_CLASS}`)) return;
    if (!originals?.entries?.length || originals.schemaVersion !== SCHEMA_VERSION) return;
    if (!pageLooksTranslated()) return;
    await showBilingual();
  }

  async function checkForUrlChange() {
    const nextStorageKey = storageKey();
    if (nextStorageKey === currentStorageKey) return;

    currentStorageKey = nextStorageKey;
    hideBilingual();
    originals = await loadOriginals();
    window.setTimeout(tryAutoRestore, 800);
    window.setTimeout(tryAutoRestore, 2200);
  }

  function pageLooksTranslated() {
    const root = getContentRoot();
    const text = root.innerText || root.textContent || "";
    return /[\u3400-\u9fff]/.test(text);
  }
})();
