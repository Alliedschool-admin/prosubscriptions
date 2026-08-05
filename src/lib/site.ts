/** Canonical public origin for this store (custom domain). */
export const SITE_URL = "https://www.digitalchacho.store";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Trim post body into a meta-description-sized summary. */
export function excerpt(text: string, max = 155): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
