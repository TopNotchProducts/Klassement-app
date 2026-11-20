export const STATUS_TEKST = { concept: "In voorbereiding", actief: "Loopt", afgesloten: "Afgesloten" } as const;

export const WEEKDAGEN = ["", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

/** "2025-26" → "2026-27"; anders een voorstel op basis van de datum (Europe/Amsterdam). */
export function volgendeSeizoensnaam(vorige?: string): string {
  const m = vorige?.match(/^(\d{4})[-/](\d{2,4})$/);
  if (m) {
    const start = Number(m[1]) + 1;
    return `${start}-${String(start + 1).slice(-2)}`;
  }
  const nu = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const start = nu.getMonth() >= 6 ? nu.getFullYear() : nu.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}
