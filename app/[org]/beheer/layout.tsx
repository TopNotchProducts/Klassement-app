import type { CSSProperties } from "react";
import Link from "next/link";
import { vereisBeheerder } from "@/lib/auth";
import { BeheerNav } from "./nav";

export default async function BeheerLayout({ children, params }: LayoutProps<"/[org]/beheer">) {
  const { org } = await params;
  const { organisatie } = await vereisBeheerder(org);
  const stijl = {
    "--merk": organisatie.kleur_primair ?? "#1d4ed8",
    "--merk-2": organisatie.kleur_secundair ?? "#0f172a",
  } as CSSProperties;

  return (
    <div style={stijl} className="flex min-h-full flex-1 flex-col">
      <header className="bg-[var(--merk-2)] text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          {organisatie.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- logo uit Supabase Storage, wisselend formaat
            <img src={organisatie.logo_url} alt="" className="size-9 rounded bg-white object-contain p-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{organisatie.naam}</p>
            <p className="text-xs text-white/70">Beheer</p>
          </div>
          <Link href="/" className="min-h-11 content-center px-2 text-sm text-white/80 underline">
            Start
          </Link>
        </div>
        <BeheerNav slug={org} />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
