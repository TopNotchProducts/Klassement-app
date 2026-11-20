import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/auth";
import { STATUS_TEKST, WEEKDAGEN } from "@/lib/seizoen";
import { aantal } from "@/lib/tekst";
import {
  ActieVelden,
  Invoer,
  Kaart,
  Keuze,
  Knop,
  KnopLink,
  Leeg,
  Melding,
  PaginaKop,
  VerwijderKnop,
} from "@/components/ui";
import {
  maakKlasse,
  maakOnderdeel,
  maakSpeelmoment,
  verwijderKlasse,
  verwijderOnderdeel,
  verwijderSpeelmoment,
  wijzigKlasse,
  wijzigSeizoen,
} from "../acties";

const datumTekst = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });

export default async function SeizoenPagina({ params, searchParams }: PageProps<"/[org]/beheer/seizoenen/[seizoen]">) {
  const { org, seizoen: seizoenId } = await params;
  const zoek = await searchParams;
  const { supabase, organisatie } = await vereisBeheerder(org);
  const [{ data: seizoen }, { data: locaties }] = await Promise.all([
    supabase
      .from("seizoen")
      .select(
        "id, naam, status, startdatum, einddatum, onderdeel (id, naam, vorm, volgorde, fase (id, volgorde, type, poule (id, naam, volgorde, inschrijving (id)))), speelmoment (id, weekdag, datum, starttijden, velden)",
      )
      .eq("id", seizoenId)
      .eq("organisatie_id", organisatie.id)
      .maybeSingle(),
    supabase.from("locatie").select("naam, veld (id, naam, volgorde)").eq("organisatie_id", organisatie.id).order("naam"),
  ]);
  if (!seizoen) notFound();

  const terug = `/${org}/beheer/seizoenen/${seizoenId}`;
  const av = { org, terug };
  const onderdelen = [...seizoen.onderdeel].sort((a, b) => a.volgorde - b.volgorde);
  const competitie = onderdelen.find((o) => o.vorm === "competitie");
  const fase = competitie?.fase.filter((f) => f.type === "poule").sort((a, b) => a.volgorde - b.volgorde)[0];
  const klassen = [...(fase?.poule ?? [])].sort((a, b) => a.volgorde - b.volgorde);
  const toernooien = onderdelen.filter((o) => o.vorm === "toernooi");
  const velden = (locaties ?? []).flatMap((l) =>
    [...l.veld].sort((a, b) => a.volgorde - b.volgorde).map((v) => ({ id: v.id, naam: `${l.naam} · ${v.naam}` })),
  );
  const veldNaam = new Map(velden.map((v) => [v.id, v.naam]));
  const speelmomenten = [...seizoen.speelmoment].sort(
    (a, b) => (a.weekdag ?? 9) - (b.weekdag ?? 9) || (a.datum ?? "").localeCompare(b.datum ?? ""),
  );

  return (
    <>
      <Link href={`/${org}/beheer/seizoenen`} className="mb-3 inline-block text-sm text-zinc-600 underline">
        ← Seizoenen
      </Link>
      <PaginaKop titel={seizoen.naam} uitleg={STATUS_TEKST[seizoen.status]} />
      <Melding zoek={zoek} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Kaart titel="Klassen van de competitie">
          {klassen.length === 0 && <Leeg>Nog geen klassen.</Leeg>}
          <ul className="mb-3 flex flex-col gap-2">
            {klassen.map((k) => (
              <li key={k.id} className="flex flex-wrap items-end gap-2">
                <form action={wijzigKlasse} className="flex flex-1 items-end gap-2">
                  <ActieVelden {...av} id={k.id} />
                  <div className="flex-1">
                    <Invoer label={aantal(k.inschrijving.length, "team", "teams")} name="naam" defaultValue={k.naam} required />
                  </div>
                  <Knop soort="secundair">Opslaan</Knop>
                </form>
                <VerwijderKnop actie={verwijderKlasse} vraag={`${k.naam} verwijderen?`}>
                  <ActieVelden {...av} id={k.id} />
                </VerwijderKnop>
              </li>
            ))}
          </ul>
          {fase && (
            <form action={maakKlasse} className="mb-4 flex items-end gap-2">
              <ActieVelden {...av} fase_id={fase.id} volgorde={String(klassen.length)} />
              <div className="flex-1">
                <Invoer label="Nieuwe klasse" name="naam" required />
              </div>
              <Knop soort="secundair">Toevoegen</Knop>
            </form>
          )}
          <KnopLink href={`${terug}/indelen`} className="w-full sm:w-auto">
            Teams indelen
          </KnopLink>
        </Kaart>

        <Kaart titel="Speelmomenten">
          <p className="mb-3 text-sm text-zinc-600">Wanneer en waar wordt er gespeeld? Het programma wordt hier later op ingedeeld.</p>
          {speelmomenten.length === 0 && <Leeg>Nog geen speelmomenten.</Leeg>}
          <ul className="mb-4 flex flex-col divide-y divide-zinc-100">
            {speelmomenten.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">
                    {m.weekdag ? `Elke ${WEEKDAGEN[m.weekdag]}` : m.datum ? datumTekst(m.datum) : ""}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {m.starttijden.map((t) => t.slice(0, 5)).join(", ")} ·{" "}
                    {m.velden.map((v) => veldNaam.get(v) ?? "?").join(", ")}
                  </p>
                </div>
                <VerwijderKnop actie={verwijderSpeelmoment} vraag="Dit speelmoment verwijderen?">
                  <ActieVelden {...av} id={m.id} />
                </VerwijderKnop>
              </li>
            ))}
          </ul>
          {velden.length === 0 ? (
            <Leeg>
              Voeg eerst een <Link className="underline" href={`/${org}/beheer/locaties`}>locatie met velden</Link> toe.
            </Leeg>
          ) : (
            <details>
              <summary className="min-h-11 cursor-pointer content-center font-medium text-[var(--merk)]">+ Speelmoment toevoegen</summary>
              <form action={maakSpeelmoment} className="mt-2 flex flex-col gap-3">
                <ActieVelden {...av} seizoen_id={seizoen.id} />
                <Keuze label="Soort" name="soort" defaultValue="wekelijks">
                  <option value="wekelijks">Elke week op dezelfde dag</option>
                  <option value="datum">Eén datum</option>
                </Keuze>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Keuze label="Weekdag (bij elke week)" name="weekdag" defaultValue="5">
                    {WEEKDAGEN.slice(1).map((d, i) => (
                      <option key={d} value={i + 1}>
                        {d}
                      </option>
                    ))}
                  </Keuze>
                  <Invoer label="Datum (bij één datum)" name="datum" type="date" />
                </div>
                <Invoer label="Starttijden" name="starttijden" placeholder="19:00, 20:00, 21:00" required />
                <fieldset className="flex flex-col">
                  <legend className="mb-1 text-sm font-medium text-zinc-800">Velden</legend>
                  {velden.map((v) => (
                    <label key={v.id} className="flex min-h-11 items-center gap-3">
                      <input type="checkbox" name="velden" value={v.id} defaultChecked className="size-5 accent-[var(--merk)]" />
                      {v.naam}
                    </label>
                  ))}
                </fieldset>
                <Knop soort="secundair">Toevoegen</Knop>
              </form>
            </details>
          )}
        </Kaart>

        <Kaart titel="Toernooien en bekers">
          {toernooien.length === 0 && <Leeg>Geen toernooien in dit seizoen.</Leeg>}
          <ul className="mb-3 flex flex-col divide-y divide-zinc-100">
            {toernooien.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                <span className="font-medium">{t.naam}</span>
                <VerwijderKnop actie={verwijderOnderdeel} vraag={`${t.naam} verwijderen?`}>
                  <ActieVelden {...av} id={t.id} />
                </VerwijderKnop>
              </li>
            ))}
          </ul>
          <form action={maakOnderdeel} className="flex items-end gap-2">
            <ActieVelden {...av} seizoen_id={seizoen.id} volgorde={String(onderdelen.length)} />
            <div className="flex-1">
              <Invoer label="Nieuw toernooi" name="naam" placeholder="Beker" required />
            </div>
            <Knop soort="secundair">Toevoegen</Knop>
          </form>
        </Kaart>

        <Kaart titel="Seizoen">
          <form action={wijzigSeizoen} className="flex flex-col gap-3">
            <ActieVelden {...av} id={seizoen.id} />
            <Invoer label="Naam" name="naam" defaultValue={seizoen.naam} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Invoer label="Eerste speeldag" name="startdatum" type="date" defaultValue={seizoen.startdatum ?? ""} />
              <Invoer label="Laatste speeldag" name="einddatum" type="date" defaultValue={seizoen.einddatum ?? ""} />
            </div>
            <Keuze label="Status" name="status" defaultValue={seizoen.status} hulp="“Loopt” zodra het seizoen begint; “Afgesloten” na de laatste speeldag.">
              {Object.entries(STATUS_TEKST).map(([waarde, label]) => (
                <option key={waarde} value={waarde}>
                  {label}
                </option>
              ))}
            </Keuze>
            <Knop soort="secundair">Opslaan</Knop>
          </form>
        </Kaart>
      </div>
    </>
  );
}
