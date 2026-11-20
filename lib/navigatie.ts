import { redirect } from "next/navigation";

/** Terug naar een pagina met een melding (werkt ook zonder JavaScript). */
export function terugMet(pad: string, soort: "ok" | "fout", tekst: string): never {
  const url = new URL(pad, "http://x");
  url.searchParams.set(soort, tekst);
  redirect(url.pathname + url.search + url.hash);
}

/** Alleen interne paden; voorkomt een open redirect via ?volgende=. */
export function veiligPad(pad: string | null | undefined, standaard = "/"): string {
  if (!pad || !pad.startsWith("/") || pad.startsWith("//") || pad.startsWith("/\\")) return standaard;
  return pad;
}
