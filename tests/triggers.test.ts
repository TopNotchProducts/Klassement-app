// Trigger-tests: afgeleide score, handmatige uitslag, strafschoppen, bevestigen,
// rechten van de scheidsrechter en audit_log. Draait tegen klassement-dev.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  heeftDatabase,
  maakGebruiker,
  maakLid,
  maakOrganisatie,
  ruimOp,
  serviceClient,
  voegToe,
  vulOrganisatie,
  type TestGebruiker,
} from "./helpers/supabase";

type Data = Awaited<ReturnType<typeof vulOrganisatie>>;
type Rij = { id: string } & Record<string, unknown>;

describe.skipIf(!heeftDatabase)("triggers", () => {
  const svc = heeftDatabase ? serviceClient() : (null as unknown as SupabaseClient);
  let org: string;
  let d: Data;
  let beheerder: TestGebruiker;
  let scheids: TestGebruiker;
  const gebruikers: TestGebruiker[] = [];

  beforeAll(async () => {
    org = (await maakOrganisatie("trig")).id;
    d = await vulOrganisatie(org);
    beheerder = await maakGebruiker("trig-beheerder");
    scheids = await maakGebruiker("trig-scheids");
    gebruikers.push(beheerder, scheids);
    await maakLid(org, beheerder.id, "beheerder");
    await maakLid(org, scheids.id, "scheidsrechter");
  }, 120_000);

  afterAll(async () => {
    await ruimOp([org].filter(Boolean), gebruikers.map((g) => g.id));
  }, 60_000);

  /** Nieuwe lege wedstrijd tussen de twee testteams in de gegeven fase. */
  async function nieuweWedstrijd(fase: "poule" | "knockout"): Promise<Rij> {
    return voegToe<Rij>("wedstrijd", {
      organisatie_id: org,
      fase_id: fase === "poule" ? d.fase.id : d.koFase.id,
      poule_id: fase === "poule" ? d.poule.id : null,
      bracket_id: fase === "knockout" ? d.bracket.id : null,
      thuis_team_id: d.team.id,
      uit_team_id: d.teamUit.id,
    });
  }

  async function event(
    client: SupabaseClient,
    wedstrijdId: string,
    type: string,
    teamId: string,
    spelerId: string | null = null,
  ) {
    const { data, error } = await client
      .from("wedstrijd_event")
      .insert({ organisatie_id: org, wedstrijd_id: wedstrijdId, type, team_id: teamId, speler_id: spelerId })
      .select("id")
      .single();
    return { id: data?.id as string | undefined, error };
  }

  async function uitslag(wedstrijdId: string) {
    const { data } = await svc.from("wedstrijd_uitslag").select("*").eq("wedstrijd_id", wedstrijdId).single();
    return data as {
      score_thuis: number;
      score_uit: number;
      handmatig: boolean;
      winnaar_na_strafschoppen_team_id: string | null;
    };
  }

  describe("afgeleide score", () => {
    it("telt doelpunten, eigen doelpunten en onbekende doelpunten per team", async () => {
      const w = await nieuweWedstrijd("poule");
      expect((await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id)).error).toBeNull();
      expect((await event(scheids.client, w.id, "doelpunt_onbekend", d.team.id)).error).toBeNull();
      expect((await event(scheids.client, w.id, "eigen_doelpunt", d.teamUit.id)).error).toBeNull();
      expect((await event(scheids.client, w.id, "geel", d.team.id, d.speler.id)).error).toBeNull();
      expect(await uitslag(w.id)).toMatchObject({ score_thuis: 2, score_uit: 1 });
    });

    it("negeert een directe overschrijving van de score", async () => {
      const w = await nieuweWedstrijd("poule");
      await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);
      await beheerder.client.from("wedstrijd_uitslag").update({ score_thuis: 9, score_uit: 9 }).eq("wedstrijd_id", w.id);
      expect(await uitslag(w.id)).toMatchObject({ score_thuis: 1, score_uit: 0 });
    });

    it("rekent opnieuw na het verwijderen van een event", async () => {
      const w = await nieuweWedstrijd("poule");
      const { id } = await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);
      await scheids.client.from("wedstrijd_event").delete().eq("id", id!);
      expect(await uitslag(w.id)).toMatchObject({ score_thuis: 0, score_uit: 0 });
    });

    it("weigert een team dat niet meespeelt en een speler buiten de selectie", async () => {
      const w = await nieuweWedstrijd("poule");
      const ander = await voegToe<Rij>("team", { organisatie_id: org, naam: "Buitenstaander" });
      expect((await event(scheids.client, w.id, "eigen_doelpunt", ander.id)).error?.message).toMatch(/speelt niet mee/);
      // d.speler zit in de selectie van het thuisteam, niet van het uitteam
      expect((await event(scheids.client, w.id, "doelpunt", d.teamUit.id, d.speler.id)).error?.message).toMatch(
        /selectie/,
      );
    });

    it("eist een speler bij een doelpunt", async () => {
      const w = await nieuweWedstrijd("poule");
      expect((await event(scheids.client, w.id, "doelpunt", d.team.id)).error?.code).toBe("23514");
    });
  });

  describe("handmatige uitslag", () => {
    it("vraagt een reden en houdt de ingevulde score vast", async () => {
      const w = await nieuweWedstrijd("poule");
      await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);

      const zonderReden = await beheerder.client
        .from("wedstrijd_uitslag")
        .update({ handmatig: true, score_thuis: 0, score_uit: 3 })
        .eq("wedstrijd_id", w.id);
      expect(zonderReden.error?.code).toBe("23514");

      const metReden = await beheerder.client
        .from("wedstrijd_uitslag")
        .update({ handmatig: true, score_thuis: 0, score_uit: 3, reden: "Reglementair: niet opgekomen" })
        .eq("wedstrijd_id", w.id);
      expect(metReden.error).toBeNull();

      // een extra event verandert een handmatige uitslag niet
      await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);
      expect(await uitslag(w.id)).toMatchObject({ handmatig: true, score_thuis: 0, score_uit: 3 });

      // terug naar afgeleid: de score volgt weer de events (2 doelpunten thuis)
      await beheerder.client.from("wedstrijd_uitslag").update({ handmatig: false, reden: null }).eq("wedstrijd_id", w.id);
      expect(await uitslag(w.id)).toMatchObject({ handmatig: false, score_thuis: 2, score_uit: 0 });
    });

    it("is niet voor de scheidsrechter", async () => {
      const w = await nieuweWedstrijd("poule");
      await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);
      const { error } = await scheids.client
        .from("wedstrijd_uitslag")
        .update({ handmatig: true, score_thuis: 5, reden: "poging" })
        .eq("wedstrijd_id", w.id);
      expect(error?.message).toMatch(/alleen een beheerder/);
      const { data } = await scheids.client.from("wedstrijd_uitslag").delete().eq("wedstrijd_id", w.id).select();
      expect(data).toHaveLength(0);
    });
  });

  describe("strafschoppen", () => {
    it("mag alleen in een knockout-fase", async () => {
      const w = await nieuweWedstrijd("poule");
      await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);
      await event(scheids.client, w.id, "eigen_doelpunt", d.teamUit.id);
      const { error } = await scheids.client
        .from("wedstrijd_uitslag")
        .update({ winnaar_na_strafschoppen_team_id: d.team.id })
        .eq("wedstrijd_id", w.id);
      expect(error?.message).toMatch(/knockout/);
    });

    it("mag alleen bij een gelijke stand en wordt geleegd als de stand verandert", async () => {
      const w = await nieuweWedstrijd("knockout");
      await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);

      const bijOngelijk = await scheids.client
        .from("wedstrijd_uitslag")
        .update({ winnaar_na_strafschoppen_team_id: d.team.id })
        .eq("wedstrijd_id", w.id);
      expect(bijOngelijk.error?.message).toMatch(/gelijke stand/);

      await event(scheids.client, w.id, "eigen_doelpunt", d.teamUit.id);
      const bijGelijk = await scheids.client
        .from("wedstrijd_uitslag")
        .update({ winnaar_na_strafschoppen_team_id: d.teamUit.id })
        .eq("wedstrijd_id", w.id);
      expect(bijGelijk.error).toBeNull();
      expect((await uitslag(w.id)).winnaar_na_strafschoppen_team_id).toBe(d.teamUit.id);

      await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);
      expect(await uitslag(w.id)).toMatchObject({ score_thuis: 2, score_uit: 1, winnaar_na_strafschoppen_team_id: null });
    });

    it("moet een van beide teams zijn", async () => {
      const w = await nieuweWedstrijd("knockout");
      await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);
      await event(scheids.client, w.id, "eigen_doelpunt", d.teamUit.id);
      const ander = await voegToe<Rij>("team", { organisatie_id: org, naam: "Derde team" });
      const { error } = await beheerder.client
        .from("wedstrijd_uitslag")
        .update({ winnaar_na_strafschoppen_team_id: ander.id })
        .eq("wedstrijd_id", w.id);
      expect(error?.message).toMatch(/een van beide teams/);
    });
  });

  describe("bevestigen en de scheidsrechter", () => {
    it("bevestigen kan niet met een onbekend doelpunt", async () => {
      const w = await nieuweWedstrijd("poule");
      const { id } = await event(scheids.client, w.id, "doelpunt_onbekend", d.team.id);
      const geweigerd = await scheids.client.from("wedstrijd").update({ status: "bevestigd" }).eq("id", w.id);
      expect(geweigerd.error?.message).toMatch(/onbekend doelpunt/);

      await scheids.client.from("wedstrijd_event").delete().eq("id", id!);
      const gelukt = await scheids.client.from("wedstrijd").update({ status: "bevestigd" }).eq("id", w.id);
      expect(gelukt.error).toBeNull();

      const achteraf = await event(scheids.client, w.id, "doelpunt_onbekend", d.team.id);
      expect(achteraf.error?.message).toMatch(/bevestigde wedstrijd/);
    });

    it("de scheidsrechter wijzigt alleen de status, binnen gepland/bezig/bevestigd", async () => {
      const w = await nieuweWedstrijd("poule");
      const datum = await scheids.client.from("wedstrijd").update({ datum: "2027-01-01" }).eq("id", w.id);
      expect(datum.error?.message).toMatch(/alleen de status/);
      const bezig = await scheids.client.from("wedstrijd").update({ status: "bezig" }).eq("id", w.id);
      expect(bezig.error).toBeNull();
      const afgelast = await scheids.client.from("wedstrijd").update({ status: "afgelast" }).eq("id", w.id);
      expect(afgelast.error?.message).toMatch(/afgelasten/);
      const beheerderAfgelast = await beheerder.client.from("wedstrijd").update({ status: "afgelast" }).eq("id", w.id);
      expect(beheerderAfgelast.error).toBeNull();
    });
  });

  describe("audit_log", () => {
    it("legt elke wijziging aan events en uitslagen vast, met de gebruiker", async () => {
      const w = await nieuweWedstrijd("poule");
      const { id } = await event(scheids.client, w.id, "doelpunt", d.team.id, d.speler.id);
      await scheids.client.from("wedstrijd_event").update({ minuut: 33 }).eq("id", id!);
      await scheids.client.from("wedstrijd_event").delete().eq("id", id!);

      const { data: eventLog } = await beheerder.client
        .from("audit_log")
        .select("actie, door, oud, nieuw")
        .eq("record_id", id!)
        .order("op");
      expect(eventLog?.map((r) => r.actie)).toEqual(["insert", "update", "delete"]);
      expect(eventLog?.every((r) => r.door === scheids.id)).toBe(true);

      const { data: uitslagLog } = await beheerder.client
        .from("audit_log")
        .select("actie")
        .eq("tabel", "wedstrijd_uitslag")
        .eq("record_id", w.id);
      // aangemaakt bij het eerste doelpunt, bijgewerkt naar 0-0 bij het verwijderen
      expect(uitslagLog?.map((r) => r.actie).sort()).toEqual(["insert", "update"]);
    });
  });
});
