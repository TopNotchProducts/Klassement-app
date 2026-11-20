// Isolatietests: een gebruiker van organisatie A kan nooit data van B lezen
// (waar die niet publiek is) of schrijven. Draait tegen klassement-dev met twee
// eigen testorganisaties; wordt overgeslagen zonder env-vars (CI).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  anonClient,
  heeftDatabase,
  maakGebruiker,
  maakLid,
  maakOrganisatie,
  ruimOp,
  serviceClient,
  vulOrganisatie,
  type TestGebruiker,
} from "./helpers/supabase";

type Data = Awaited<ReturnType<typeof vulOrganisatie>>;

/** Alle tenant-tabellen: tabelnaam → sleutel in de testdata + primary key. */
const TENANT_TABELLEN: { tabel: string; sleutel: keyof Data | "lid" | "audit"; pk: string }[] = [
  { tabel: "organisatie_lid", sleutel: "lid", pk: "id" },
  { tabel: "locatie", sleutel: "locatie", pk: "id" },
  { tabel: "veld", sleutel: "veld", pk: "id" },
  { tabel: "seizoen", sleutel: "seizoen", pk: "id" },
  { tabel: "speelmoment", sleutel: "speelmoment", pk: "id" },
  { tabel: "team", sleutel: "team", pk: "id" },
  { tabel: "speler", sleutel: "speler", pk: "id" },
  { tabel: "selectie", sleutel: "selectie", pk: "id" },
  { tabel: "onderdeel", sleutel: "onderdeel", pk: "id" },
  { tabel: "fase", sleutel: "fase", pk: "id" },
  { tabel: "poule", sleutel: "poule", pk: "id" },
  { tabel: "inschrijving", sleutel: "inschrijving", pk: "id" },
  { tabel: "bracket", sleutel: "bracket", pk: "id" },
  { tabel: "doorstroomregel", sleutel: "doorstroomregel", pk: "id" },
  { tabel: "wedstrijd", sleutel: "wedstrijd", pk: "id" },
  { tabel: "wedstrijd_token", sleutel: "wedstrijdToken", pk: "wedstrijd_id" },
  { tabel: "wedstrijd_event", sleutel: "wedstrijdEvent", pk: "id" },
  { tabel: "wedstrijd_uitslag", sleutel: "wedstrijd", pk: "wedstrijd_id" },
  { tabel: "punt_correctie", sleutel: "puntCorrectie", pk: "id" },
  { tabel: "schorsing", sleutel: "schorsing", pk: "id" },
  { tabel: "audit_log", sleutel: "audit", pk: "id" },
  { tabel: "nieuws", sleutel: "nieuws", pk: "id" },
  { tabel: "historie_eindstand", sleutel: "historieEindstand", pk: "id" },
  { tabel: "historie_topscorer", sleutel: "historieTopscorer", pk: "id" },
  { tabel: "historie_bekerwinnaar", sleutel: "historieBekerwinnaar", pk: "id" },
];

/** Tabellen die het publiek nooit mag lezen (ook niet als ingelogde buitenstaander). */
const PRIVE_TABELLEN = ["organisatie_lid", "wedstrijd_token", "schorsing", "audit_log"];

describe.skipIf(!heeftDatabase)("isolatie tussen organisaties", () => {
  const svc = heeftDatabase ? serviceClient() : (null as unknown as SupabaseClient);
  let orgA: string;
  let orgB: string;
  let dataA: Data;
  let dataB: Data;
  let beheerderA: TestGebruiker;
  let scheidsA: TestGebruiker;
  let aanvoerderA: TestGebruiker;
  let beheerderB: TestGebruiker;
  let platform: TestGebruiker;
  const gebruikers: TestGebruiker[] = [];

  /** Een bestaande rij van organisatie `org` uit `tabel`, gelezen via de service role. */
  const rijen = new Map<string, Record<string, unknown>>();
  const rijVan = (org: string, tabel: string) => rijen.get(`${org}:${tabel}`)!;

  beforeAll(async () => {
    orgA = (await maakOrganisatie("iso-a")).id;
    orgB = (await maakOrganisatie("iso-b")).id;
    dataA = await vulOrganisatie(orgA);
    dataB = await vulOrganisatie(orgB);

    beheerderA = await maakGebruiker("beheerder-a");
    scheidsA = await maakGebruiker("scheids-a");
    aanvoerderA = await maakGebruiker("aanvoerder-a");
    beheerderB = await maakGebruiker("beheerder-b");
    platform = await maakGebruiker("platform");
    gebruikers.push(beheerderA, scheidsA, aanvoerderA, beheerderB, platform);

    await maakLid(orgA, beheerderA.id, "beheerder");
    await maakLid(orgA, scheidsA.id, "scheidsrechter");
    await maakLid(orgA, aanvoerderA.id, "aanvoerder");
    await maakLid(orgB, beheerderB.id, "beheerder");
    const { error } = await svc.from("platform_beheerder").insert({ user_id: platform.id });
    if (error) throw error;

    // Van elke tabel één echte rij per organisatie vastleggen.
    for (const org of [orgA, orgB]) {
      for (const { tabel } of TENANT_TABELLEN) {
        const { data, error: fout } = await svc
          .from(tabel)
          .select("*")
          .eq("organisatie_id", org)
          .limit(1)
          .single();
        if (fout) throw new Error(`${tabel}: ${fout.message}`);
        rijen.set(`${org}:${tabel}`, data);
      }
    }
  }, 120_000);

  afterAll(async () => {
    await ruimOp(
      [orgA, orgB].filter(Boolean),
      gebruikers.map((g) => g.id),
    );
  }, 60_000);

  it("de testdata dekt elke tenant-tabel", () => {
    expect(dataA.wedstrijd.id).toBeTruthy();
    expect(dataB.wedstrijd.id).toBeTruthy();
    for (const { tabel } of TENANT_TABELLEN) {
      expect(rijVan(orgA, tabel), tabel).toBeTruthy();
      expect(rijVan(orgB, tabel), tabel).toBeTruthy();
    }
  });

  describe.each(TENANT_TABELLEN)("$tabel", ({ tabel, pk }) => {
    it("beheerder A kan een rij van B niet wijzigen", async () => {
      const rij = rijVan(orgB, tabel);
      const { data, error } = await beheerderA.client
        .from(tabel)
        .update({ organisatie_id: orgB })
        .eq(pk, rij[pk] as string)
        .select();
      expect(error?.code === "42501" || data?.length === 0, JSON.stringify(error)).toBe(true);
    });

    it("beheerder A kan een rij van B niet verwijderen", async () => {
      const rij = rijVan(orgB, tabel);
      await beheerderA.client.from(tabel).delete().eq(pk, rij[pk] as string);
      const { data } = await svc.from(tabel).select(pk).eq(pk, rij[pk] as string);
      expect(data).toHaveLength(1);
    });

    it("beheerder A kan geen rij in B aanmaken", async () => {
      const kopie = { ...rijVan(orgB, tabel) };
      if (pk === "id") delete kopie.id;
      const { error } = await beheerderA.client.from(tabel).insert(kopie);
      expect(error?.code).toBe("42501");
    });

    it("anoniem kan niets aanmaken", async () => {
      const kopie = { ...rijVan(orgA, tabel) };
      if (pk === "id") delete kopie.id;
      const { error } = await anonClient().from(tabel).insert(kopie);
      expect(error?.code).toBe("42501");
    });

    if (PRIVE_TABELLEN.includes(tabel)) {
      it("anoniem en leden van A lezen de rij van B niet", async () => {
        const rij = rijVan(orgB, tabel);
        for (const client of [anonClient(), beheerderA.client, scheidsA.client, aanvoerderA.client]) {
          const { data } = await client.from(tabel).select(pk).eq(pk, rij[pk] as string);
          expect(data ?? []).toHaveLength(0);
        }
      });
    }

    if (tabel !== "audit_log") {
      it("beheerder A kan een eigen rij wel wijzigen", async () => {
        const rij = rijVan(orgA, tabel);
        const { data, error } = await beheerderA.client
          .from(tabel)
          .update({ organisatie_id: orgA })
          .eq(pk, rij[pk] as string)
          .select(pk);
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });
    }

    it("de platformbeheerder leest de rij van B", async () => {
      const rij = rijVan(orgB, tabel);
      const { data } = await platform.client.from(tabel).select(pk).eq(pk, rij[pk] as string);
      expect(data).toHaveLength(1);
    });
  });

  describe("lezen", () => {
    it("anoniem leest publieke data, maar geen verborgen spelers", async () => {
      const anon = anonClient();
      const { data: wedstrijden } = await anon.from("wedstrijd").select("id").eq("id", dataB.wedstrijd.id);
      expect(wedstrijden).toHaveLength(1);
      const { data: spelers } = await anon
        .from("speler")
        .select("id")
        .in("id", [dataB.speler.id, dataB.verborgenSpeler.id]);
      expect(spelers?.map((s) => s.id)).toEqual([dataB.speler.id]);
    });

    it("leden van A zien verborgen spelers van A, niet van B", async () => {
      for (const lid of [beheerderA, scheidsA, aanvoerderA]) {
        const { data } = await lid.client
          .from("speler")
          .select("id")
          .in("id", [dataA.verborgenSpeler.id, dataB.verborgenSpeler.id]);
        expect(data?.map((s) => s.id)).toEqual([dataA.verborgenSpeler.id]);
      }
    });

    it("leden van A lezen schorsingen van A", async () => {
      const { data } = await aanvoerderA.client.from("schorsing").select("id").eq("organisatie_id", orgA);
      expect(data).toHaveLength(1);
    });

    it("alleen de beheerder leest audit_log en tokens", async () => {
      for (const tabel of ["audit_log", "wedstrijd_token"]) {
        const { data: beheerder } = await beheerderA.client.from(tabel).select("organisatie_id").eq("organisatie_id", orgA);
        expect(beheerder!.length, tabel).toBeGreaterThan(0);
        for (const lid of [scheidsA, aanvoerderA]) {
          const { data } = await lid.client.from(tabel).select("organisatie_id").eq("organisatie_id", orgA);
          expect(data ?? [], tabel).toHaveLength(0);
        }
      }
    });

    it("een lid ziet alleen het eigen lidmaatschap, de beheerder alle leden", async () => {
      const { data: eigen } = await scheidsA.client.from("organisatie_lid").select("user_id");
      expect(eigen?.map((l) => l.user_id)).toEqual([scheidsA.id]);
      const { data: alle } = await beheerderA.client.from("organisatie_lid").select("user_id");
      expect(alle).toHaveLength(3);
    });
  });

  describe("schrijven", () => {
    it("de scheidsrechter van A voert events in bij A, niet bij B", async () => {
      const { error: eigen } = await scheidsA.client.from("wedstrijd_event").insert({
        organisatie_id: orgA,
        wedstrijd_id: dataA.wedstrijd.id,
        type: "groen",
        team_id: dataA.team.id,
        speler_id: dataA.speler.id,
      });
      expect(eigen).toBeNull();
      const { error: vreemd } = await scheidsA.client.from("wedstrijd_event").insert({
        organisatie_id: orgB,
        wedstrijd_id: dataB.wedstrijd.id,
        type: "groen",
        team_id: dataB.team.id,
        speler_id: dataB.speler.id,
      });
      expect(vreemd?.code).toBe("42501");
    });

    it("de aanvoerder schrijft geen events", async () => {
      const { error } = await aanvoerderA.client.from("wedstrijd_event").insert({
        organisatie_id: orgA,
        wedstrijd_id: dataA.wedstrijd.id,
        type: "groen",
        team_id: dataA.team.id,
        speler_id: dataA.speler.id,
      });
      expect(error?.code).toBe("42501");
    });

    it("niemand schrijft rechtstreeks in audit_log", async () => {
      const { error } = await beheerderA.client.from("audit_log").insert({
        organisatie_id: orgA,
        tabel: "team",
        record_id: dataA.team.id,
        actie: "update",
      });
      expect(error?.code).toBe("42501");
    });

    it("een beheerder maakt geen organisatie aan en wordt geen platformbeheerder", async () => {
      const { error: org } = await beheerderA.client
        .from("organisatie")
        .insert({ naam: "Kaping", slug: `test-kaping-${Date.now()}` });
      expect(org?.code).toBe("42501");
      const { error: platformFout } = await beheerderA.client
        .from("platform_beheerder")
        .insert({ user_id: beheerderA.id });
      expect(platformFout?.code).toBe("42501");
    });

    it("beheerder A kan zichzelf niet toevoegen aan B", async () => {
      const { error } = await beheerderA.client
        .from("organisatie_lid")
        .insert({ organisatie_id: orgB, user_id: beheerderA.id, rol: "beheerder" });
      expect(error?.code).toBe("42501");
    });

    it("beheerder A kan organisatie B niet wijzigen", async () => {
      const { data } = await beheerderA.client
        .from("organisatie")
        .update({ naam: "Gekaapt" })
        .eq("id", orgB)
        .select();
      expect(data).toHaveLength(0);
    });

    it("een eigen rij kan niet naar een rij van B verwijzen (samengestelde FK)", async () => {
      const { error: veld } = await beheerderA.client
        .from("veld")
        .insert({ organisatie_id: orgA, locatie_id: dataB.locatie.id, naam: "Vreemd veld" });
      expect(veld?.code).toBe("23503");
      const { error: inschrijving } = await beheerderA.client
        .from("inschrijving")
        .insert({ organisatie_id: orgA, poule_id: dataA.poule.id, team_id: dataB.team.id });
      expect(inschrijving?.code).toBe("23503");
    });

    it("de slug van een organisatie is onveranderlijk", async () => {
      const { error } = await beheerderA.client
        .from("organisatie")
        .update({ slug: "test-andere-slug" })
        .eq("id", orgA);
      expect(error?.message).toMatch(/slug/);
    });

    it("beheerder B kan zijn eigen organisatie wel beheren", async () => {
      const { data, error } = await beheerderB.client
        .from("team")
        .insert({ organisatie_id: orgB, naam: "Nieuw team" })
        .select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });
});
