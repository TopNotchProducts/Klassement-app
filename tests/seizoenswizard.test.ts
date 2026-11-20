// De seizoenswizard (maak_seizoen) en het indelen (deel_klassen_in), als beheerder via RLS.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
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

describe.skipIf(!heeftDatabase)("seizoenswizard", () => {
  let org: string;
  let anderOrg: string;
  let d: Data;
  let beheerder: TestGebruiker;
  let scheids: TestGebruiker;

  beforeAll(async () => {
    org = (await maakOrganisatie("wizard")).id;
    anderOrg = (await maakOrganisatie("wizard-b")).id;
    d = await vulOrganisatie(org);
    beheerder = await maakGebruiker("wizard-beheerder");
    scheids = await maakGebruiker("wizard-scheids");
    await maakLid(org, beheerder.id, "beheerder");
    await maakLid(org, scheids.id, "scheidsrechter");
  }, 120_000);

  afterAll(async () => {
    await ruimOp([org, anderOrg].filter(Boolean), [beheerder, scheids].filter(Boolean).map((g) => g.id));
  }, 60_000);

  async function seizoenOpbouw(seizoenId: string) {
    const { data } = await serviceClient()
      .from("seizoen")
      .select("status, onderdeel (naam, vorm, fase (type, regelset, poule (naam, volgorde, inschrijving (team_id)))), selectie (team_id, speler_id)")
      .eq("id", seizoenId)
      .single();
    return data!;
  }

  it("maakt een seizoen met klassen en toernooi, en neemt selecties en indeling over", async () => {
    const { data: id, error } = await beheerder.client.rpc("maak_seizoen", {
      p_organisatie_id: org,
      p_naam: "2027-28",
      p_startdatum: "2027-09-01",
      p_einddatum: "2028-05-31",
      p_klassen: ["Klasse A", " klasse a ", "Klasse B", ""],
      p_kopieer_van: d.seizoen.id,
      p_toernooien: ["Beker"],
    });
    expect(error).toBeNull();
    const s = await seizoenOpbouw(id as string);
    expect(s.status).toBe("concept");
    expect(s.onderdeel.map((o) => `${o.vorm}:${o.naam}`).sort()).toEqual(["competitie:Competitie", "toernooi:Beker"]);
    const fase = s.onderdeel.find((o) => o.vorm === "competitie")!.fase[0];
    expect(fase.type).toBe("poule");
    expect(fase.regelset).toMatchObject({ punten: { winst: 3, gelijk: 1, verlies: 0 } });
    // dubbele en lege klassen weggefilterd, volgorde behouden
    const poules = [...fase.poule].sort((a, b) => a.volgorde - b.volgorde);
    expect(poules.map((p) => p.naam)).toEqual(["Klasse A", "Klasse B"]);
    // de testdata heeft beide teams in "Klasse A": die indeling is overgenomen
    expect(poules[0].inschrijving.map((i) => i.team_id).sort()).toEqual([d.team.id, d.teamUit.id].sort());
    expect(s.selectie).toHaveLength(2);
  });

  it("deelt teams in, verplaatst en haalt eruit", async () => {
    const { data: id } = await beheerder.client.rpc("maak_seizoen", {
      p_organisatie_id: org,
      p_naam: "2028-29",
      p_klassen: ["Hoog", "Laag"],
    });
    const s = await seizoenOpbouw(id as string);
    expect(s.selectie).toHaveLength(0);
    const { data: fase } = await serviceClient()
      .from("fase")
      .select("id, poule (id, naam)")
      .eq("onderdeel_id", (await serviceClient().from("onderdeel").select("id").eq("seizoen_id", id as string).single()).data!.id)
      .single();
    const hoog = fase!.poule.find((p) => p.naam === "Hoog")!.id;
    const laag = fase!.poule.find((p) => p.naam === "Laag")!.id;

    const indelen = (indeling: Record<string, string | null>) =>
      beheerder.client.rpc("deel_klassen_in", { p_fase_id: fase!.id, p_indeling: indeling });

    expect((await indelen({ [d.team.id]: hoog, [d.teamUit.id]: hoog })).error).toBeNull();
    expect((await indelen({ [d.team.id]: laag, [d.teamUit.id]: "" })).error).toBeNull();
    const na = await seizoenOpbouw(id as string);
    const poules = na.onderdeel.find((o) => o.vorm === "competitie")!.fase[0].poule;
    expect(poules.find((p) => p.naam === "Laag")!.inschrijving.map((i) => i.team_id)).toEqual([d.team.id]);
    expect(poules.find((p) => p.naam === "Hoog")!.inschrijving).toHaveLength(0);

    // een klasse uit een andere fase wordt geweigerd
    const vreemd = await indelen({ [d.team.id]: d.poule.id });
    expect(vreemd.error?.message).toMatch(/hoort niet bij deze fase/);
  });

  it("weigert zonder klassen, voor een scheidsrechter en voor een andere organisatie", async () => {
    const leeg = await beheerder.client.rpc("maak_seizoen", { p_organisatie_id: org, p_naam: "X", p_klassen: [" "] });
    expect(leeg.error?.message).toMatch(/minstens één klasse/);

    const scheidsPoging = await scheids.client.rpc("maak_seizoen", { p_organisatie_id: org, p_naam: "X", p_klassen: ["A"] });
    expect(scheidsPoging.error?.code).toBe("42501");

    const vreemd = await beheerder.client.rpc("maak_seizoen", { p_organisatie_id: anderOrg, p_naam: "X", p_klassen: ["A"] });
    expect(vreemd.error?.code).toBe("42501");
    const { count } = await serviceClient().from("seizoen").select("id", { count: "exact", head: true }).eq("organisatie_id", anderOrg);
    expect(count).toBe(0);
  });
});
