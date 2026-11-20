// Organisatie-slug: kebab-case, uniek, onveranderlijk na aanmaak; het eerste padsegment.

/** Padsegmenten die de app zelf gebruikt en dus nooit een organisatie-slug mogen zijn. */
export const GERESERVEERDE_SLUGS = new Set([
  "api",
  "auth",
  "login",
  "uitloggen",
  "platform",
  "beheer",
  "_next",
  "favicon.ico",
]);

export const SLUG_PATROON = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "WAC Gemert (zaal)" → "wac-gemert-zaal" */
export function maakSlug(naam: string): string {
  return naam
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function controleerSlug(slug: string): string | null {
  if (!slug) return "Vul een korte naam voor het webadres in.";
  if (!SLUG_PATROON.test(slug)) return "Gebruik alleen kleine letters, cijfers en streepjes.";
  if (slug.length > 50) return "Het webadres mag maximaal 50 tekens zijn.";
  if (GERESERVEERDE_SLUGS.has(slug)) return `"${slug}" is gereserveerd; kies een andere naam.`;
  return null;
}
