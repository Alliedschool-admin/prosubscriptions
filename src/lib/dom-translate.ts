import { translateStrings } from "./translate.functions";
import type { Lang } from "./i18n";


// Attribute set to translated node so we don't re-translate it.
const MARK_ATTR = "data-i18n-lang";
const ORIG_ATTR = "data-i18n-orig";
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
  "NOSCRIPT",
  "SVG",
  "PATH",
]);

function shouldSkip(el: Element | null): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (SKIP_TAGS.has(cur.tagName)) return true;
    if (cur.getAttribute && cur.getAttribute("data-no-translate") != null) return true;
    cur = cur.parentElement;
  }
  return false;
}

function isTranslatable(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length < 2) return false;
  // Skip pure numbers, prices, emails, urls, single symbols.
  if (/^[\d\s.,:/$€₨%+\-–—·•]+$/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^\S+@\S+\.\S+$/.test(trimmed)) return false;
  // Needs at least one letter.
  if (!/[A-Za-z]/.test(trimmed)) return false;
  return true;
}

type CacheMap = Record<string, string>;
const memCache: Record<string, CacheMap> = {};

function cacheKey(lang: Lang) {
  return `i18n-cache-${lang}`;
}
function loadCache(lang: Lang): CacheMap {
  if (memCache[lang]) return memCache[lang];
  try {
    const raw = localStorage.getItem(cacheKey(lang));
    memCache[lang] = raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    memCache[lang] = {};
  }
  return memCache[lang];
}
function saveCache(lang: Lang) {
  try {
    localStorage.setItem(cacheKey(lang), JSON.stringify(memCache[lang] ?? {}));
  } catch {
    /* ignore quota */
  }
}

type Pending = { node: Text; original: string };

function collectPendingIn(root: Node, lang: Lang, out: Pending[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const t = node as Text;
      if (!t.data || !isTranslatable(t.data)) return NodeFilter.FILTER_REJECT;
      const parent = t.parentElement;
      if (!parent || shouldSkip(parent)) return NodeFilter.FILTER_REJECT;
      if (parent.getAttribute(MARK_ATTR) === lang) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const parent = t.parentElement!;
    // Persist the ORIGINAL English text once so we can restore or re-translate.
    let original = parent.getAttribute(ORIG_ATTR);
    if (original == null) {
      original = t.data;
      parent.setAttribute(ORIG_ATTR, original);
    }
    out.push({ node: t, original });
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

let activeLang: Lang = "en";
let observer: MutationObserver | null = null;
let scheduled = false;

function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    void translatePass();
  }, 120);
}

async function translatePass() {
  if (activeLang === "en") return;
  const lang = activeLang;
  const cache = loadCache(lang);
  const pending: Pending[] = [];
  collectPendingIn(document.body, lang, pending);
  if (pending.length === 0) return;

  // Apply cached translations immediately.
  const uncached: Pending[] = [];
  for (const p of pending) {
    const key = p.original.trim();
    const hit = cache[key];
    if (hit) {
      const leading = p.original.match(/^\s*/)?.[0] ?? "";
      const trailing = p.original.match(/\s*$/)?.[0] ?? "";
      p.node.data = leading + hit + trailing;
      p.node.parentElement?.setAttribute(MARK_ATTR, lang);
    } else {
      uncached.push(p);
    }
  }
  if (uncached.length === 0) return;

  // Dedup by original text to save tokens.
  const uniq = Array.from(new Set(uncached.map((p) => p.original.trim())));
  const batches = chunk(uniq, 40);

  for (const batch of batches) {
    if (activeLang !== lang) return; // user switched; abandon.
    try {
      const { translations } = await translateStrings({ data: { lang, strings: batch } });
      batch.forEach((src, i) => {
        const out = translations[i];
        if (out) cache[src] = out;
      });
      // Apply everything for this batch.
      for (const p of uncached) {
        const key = p.original.trim();
        const hit = cache[key];
        if (!hit) continue;
        if (p.node.parentElement?.getAttribute(MARK_ATTR) === lang) continue;
        const leading = p.original.match(/^\s*/)?.[0] ?? "";
        const trailing = p.original.match(/\s*$/)?.[0] ?? "";
        p.node.data = leading + hit + trailing;
        p.node.parentElement?.setAttribute(MARK_ATTR, lang);
      }
      saveCache(lang);
    } catch (err) {
      console.warn("[i18n] translate batch failed", err);
      break;
    }
  }
}

function restoreOriginals() {
  const nodes = document.querySelectorAll(`[${ORIG_ATTR}]`);
  nodes.forEach((el) => {
    const original = el.getAttribute(ORIG_ATTR);
    if (original == null) return;
    // Replace the FIRST text child with original.
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        (child as Text).data = original;
        break;
      }
    }
    el.removeAttribute(MARK_ATTR);
  });
}

export function setActiveLanguage(lang: Lang) {
  activeLang = lang;
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (lang === "en") {
    restoreOriginals();
    return;
  }

  // Clear "marked" so nodes get re-translated to the new language.
  document.querySelectorAll(`[${MARK_ATTR}]`).forEach((el) => el.removeAttribute(MARK_ATTR));

  schedule();

  observer = new MutationObserver(() => schedule());
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}