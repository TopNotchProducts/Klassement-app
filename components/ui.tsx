// Eenvoudige UI-bouwstenen voor de beheeromgeving. Mobile-first: grote tikvlakken
// (min. 44 px), één kolom op een telefoon. Werken zonder JavaScript (gewone formulieren).
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function PaginaKop({ titel, uitleg, actie }: { titel: string; uitleg?: ReactNode; actie?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{titel}</h1>
        {uitleg && <p className="mt-1 max-w-prose text-zinc-600">{uitleg}</p>}
      </div>
      {actie}
    </div>
  );
}

export function Kaart({ titel, children, className = "" }: { titel?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {titel && <h2 className="mb-3 text-lg font-semibold text-zinc-900">{titel}</h2>}
      {children}
    </section>
  );
}

const knopStijl = {
  primair: "bg-[var(--merk)] text-white hover:opacity-90",
  secundair: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
  gevaar: "bg-red-600 text-white hover:bg-red-700",
} as const;

export function Knop({
  soort = "primair",
  className = "",
  ...props
}: ComponentProps<"button"> & { soort?: keyof typeof knopStijl }) {
  return (
    <button
      type="submit"
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-medium transition ${knopStijl[soort]} ${className}`}
      {...props}
    />
  );
}

export function KnopLink({
  soort = "primair",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { soort?: keyof typeof knopStijl }) {
  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-medium transition ${knopStijl[soort]} ${className}`}
      {...props}
    />
  );
}

/** Gestijlde bestandskiezer (de knop zelf volgt de taal van de browser). */
export const BESTAND =
  "min-h-11 text-base text-zinc-700 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-4 file:font-medium file:text-zinc-800 hover:file:bg-zinc-50";

const invoerStijl =
  "min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 focus:border-[var(--merk)] focus:outline-none focus:ring-2 focus:ring-[var(--merk)]/30";

export function Invoer({ label, hulp, ...props }: ComponentProps<"input"> & { label: string; hulp?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <input className={invoerStijl} {...props} />
      {hulp && <span className="text-sm text-zinc-500">{hulp}</span>}
    </label>
  );
}

export function Tekstvak({ label, hulp, ...props }: ComponentProps<"textarea"> & { label: string; hulp?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <textarea className={`${invoerStijl} min-h-32 py-2 font-mono text-sm`} {...props} />
      {hulp && <span className="text-sm text-zinc-500">{hulp}</span>}
    </label>
  );
}

export function Keuze({
  label,
  hulp,
  children,
  ...props
}: ComponentProps<"select"> & { label: string; hulp?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <select className={invoerStijl} {...props}>
        {children}
      </select>
      {hulp && <span className="text-sm text-zinc-500">{hulp}</span>}
    </label>
  );
}

export function Vinkje({ label, hulp, ...props }: ComponentProps<"input"> & { label: string; hulp?: string }) {
  return (
    <label className="flex min-h-11 items-start gap-3 py-2">
      <input type="checkbox" className="mt-1 size-5 accent-[var(--merk)]" {...props} />
      <span>
        <span className="text-zinc-800">{label}</span>
        {hulp && <span className="block text-sm text-zinc-500">{hulp}</span>}
      </span>
    </label>
  );
}

/** Toont ?ok= of ?fout= uit de URL (gezet door terugMet in een server action). */
export function Melding({ zoek }: { zoek: { ok?: string | string[]; fout?: string | string[] } }) {
  const ok = typeof zoek.ok === "string" ? zoek.ok : undefined;
  const fout = typeof zoek.fout === "string" ? zoek.fout : undefined;
  if (!ok && !fout) return null;
  return (
    <p
      role={fout ? "alert" : "status"}
      className={`mb-4 rounded-lg px-4 py-3 ${fout ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}
    >
      {fout ?? ok}
    </p>
  );
}

/** Verwijderen in twee stappen, zonder JavaScript-dialoog. */
export function VerwijderKnop({
  actie,
  vraag,
  children,
}: {
  actie: (formData: FormData) => Promise<void>;
  vraag: string;
  children?: ReactNode;
}) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-sm text-red-700 hover:bg-red-50">
        Verwijderen
      </summary>
      <form action={actie} className="mt-2 flex flex-col gap-2 rounded-lg bg-red-50 p-3">
        {children}
        <p className="text-sm text-red-900">{vraag}</p>
        <Knop soort="gevaar">Ja, verwijderen</Knop>
      </form>
    </details>
  );
}

export function Leeg({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-zinc-500">{children}</p>;
}

/** Verborgen velden die elke beheer-actie nodig heeft (zie lib/beheer.ts). */
export function ActieVelden({ org, terug, ...extra }: { org: string; terug: string } & Record<string, string>) {
  return (
    <>
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="terug" value={terug} />
      {Object.entries(extra).map(([naam, waarde]) => (
        <input key={naam} type="hidden" name={naam} value={waarde} />
      ))}
    </>
  );
}
