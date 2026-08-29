const KEY = "dc_copy_unlock_v1";
const STYLE_ID = "dc-copy-unlock-style";

const CSS = `*,*::before,*::after{
  -webkit-user-select:text !important;
  -moz-user-select:text !important;
  -ms-user-select:text !important;
  user-select:text !important;
  -webkit-touch-callout:default !important;
}`;

const blocked = ["contextmenu", "copy", "cut", "selectstart", "dragstart", "mousedown", "mouseup"] as const;

function stopper(e: Event) {
  e.stopPropagation();
}

let attached = false;

function attach() {
  if (attached || typeof document === "undefined") return;
  attached = true;
  blocked.forEach((ev) => document.addEventListener(ev, stopper, true));
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }
}

function detach() {
  if (!attached || typeof document === "undefined") return;
  attached = false;
  blocked.forEach((ev) => document.removeEventListener(ev, stopper, true));
  document.getElementById(STYLE_ID)?.remove();
}

export function isCopyUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setCopyUnlocked(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (on) attach();
  else detach();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dc-copy-unlock", { detail: on }));
  }
}

export function initCopyUnlock() {
  if (isCopyUnlocked()) attach();
}

/** Universal bookmarklet users can run on ANY site to re-enable text selection & copy. */
export const COPY_UNLOCK_BOOKMARKLET = `javascript:(function(){var d=document,s=d.createElement('style');s.textContent='*,*::before,*::after{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}';d.head.appendChild(s);['contextmenu','copy','cut','selectstart','dragstart','mousedown','mouseup'].forEach(function(e){d.addEventListener(e,function(ev){ev.stopPropagation()},true)});d.designMode='off';alert('Text selection unlocked \\u2713');})();`;

/** Copy whatever text is currently selected (or the whole page as fallback). */
export async function copySelectionOrPage(): Promise<{ ok: boolean; chars: number }> {
  const sel = typeof window !== "undefined" ? window.getSelection()?.toString() ?? "" : "";
  const text = sel.trim() ? sel : document.body?.innerText ?? "";
  if (!text.trim()) return { ok: false, chars: 0 };
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, chars: text.length };
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return { ok: true, chars: text.length };
    } catch {
      return { ok: false, chars: 0 };
    }
  }
}
