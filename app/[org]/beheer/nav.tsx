"use client";
// Horizontaal scrollbare tabs: past op 360 px, markeert de huidige sectie.
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["", "Overzicht"],
  ["/seizoenen", "Seizoenen"],
  ["/teams", "Teams"],
  ["/spelers", "Spelers"],
  ["/locaties", "Locaties"],
  ["/leden", "Leden"],
  ["/huisstijl", "Huisstijl"],
] as const;

export function BeheerNav({ slug }: { slug: string }) {
  const pad = usePathname();
  const basis = `/${slug}/beheer`;
  return (
    <nav className="mx-auto w-full max-w-5xl overflow-x-auto px-2" aria-label="Beheer">
      <ul className="flex gap-1 whitespace-nowrap">
        {ITEMS.map(([sub, label]) => {
          const href = basis + sub;
          const actief = sub === "" ? pad === basis : pad.startsWith(href);
          return (
            <li key={sub}>
              <Link
                href={href}
                aria-current={actief ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-4 px-3 text-sm font-medium ${
                  actief ? "border-[var(--merk)] text-white" : "border-transparent text-white/75 hover:text-white"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
