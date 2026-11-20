import { vereisBeheerder } from "@/lib/auth";
import { ActieVelden, BESTAND, Invoer, Kaart, Knop, Melding, PaginaKop, Vinkje } from "@/components/ui";
import { wijzigHuisstijl } from "./acties";

export default async function Huisstijl({ params, searchParams }: PageProps<"/[org]/beheer/huisstijl">) {
  const { org } = await params;
  const zoek = await searchParams;
  const { organisatie } = await vereisBeheerder(org);

  return (
    <>
      <PaginaKop titel="Huisstijl" uitleg="Naam, logo en kleuren van je organisatie, zoals bezoekers ze zien." />
      <Melding zoek={zoek} />
      <Kaart className="max-w-xl">
        <form action={wijzigHuisstijl} className="flex flex-col gap-4">
          <ActieVelden org={org} terug={`/${org}/beheer/huisstijl`} />
          <Invoer label="Naam" name="naam" defaultValue={organisatie.naam} required />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-800">Logo</span>
            {organisatie.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element -- logo uit Supabase Storage
              <img src={organisatie.logo_url} alt="Huidig logo" className="size-24 rounded border border-zinc-200 object-contain p-1" />
            )}
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className={BESTAND} />
            <span className="text-sm text-zinc-500">PNG, JPG of WebP, maximaal 1 MB. Bij voorkeur vierkant.</span>
            {organisatie.logo_url && <Vinkje name="logo_weg" label="Logo verwijderen" />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-zinc-800">Hoofdkleur</span>
              <input type="color" name="kleur_primair" defaultValue={organisatie.kleur_primair ?? "#1d4ed8"} className="h-11 w-full rounded-lg border border-zinc-300" />
              <span className="text-sm text-zinc-500">Knoppen en accenten</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-zinc-800">Tweede kleur</span>
              <input type="color" name="kleur_secundair" defaultValue={organisatie.kleur_secundair ?? "#0f172a"} className="h-11 w-full rounded-lg border border-zinc-300" />
              <span className="text-sm text-zinc-500">Kopbalk</span>
            </label>
          </div>
          <Knop>Opslaan</Knop>
        </form>
      </Kaart>
    </>
  );
}
