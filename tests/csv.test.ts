import { describe, expect, it } from "vitest";
import { leesSpelersCsv } from "@/lib/csv";

describe("leesSpelersCsv", () => {
  it("leest puntkomma-CSV met kopregel uit Excel (BOM, CRLF)", () => {
    const r = leesSpelersCsv("﻿Naam;Rugnummer;Team\r\nJan Jansen;9;De Kampioenen\r\nPiet;;FC Test\r\n");
    expect(r.fouten).toEqual([]);
    expect(r.rijen).toEqual([
      { regel: 2, naam: "Jan Jansen", rugnummer: 9, team: "De Kampioenen" },
      { regel: 3, naam: "Piet", rugnummer: null, team: "FC Test" },
    ]);
  });

  it("volgt de kolomvolgorde van de kopregel", () => {
    const r = leesSpelersCsv("team,naam\nFC Test,Klaas");
    expect(r.rijen).toEqual([{ regel: 2, naam: "Klaas", rugnummer: null, team: "FC Test" }]);
  });

  it("werkt zonder kopregel en met aanhalingstekens", () => {
    const r = leesSpelersCsv('"Jansen, Jan";7;"Team ""A"""');
    expect(r.rijen).toEqual([{ regel: 1, naam: "Jansen, Jan", rugnummer: 7, team: 'Team "A"' }]);
  });

  it("meldt fouten per regel en gaat door met de rest", () => {
    const r = leesSpelersCsv("naam;rugnummer;team\n;3;FC\nKees;abc;FC\nJoop;5;\nAnne;4;FC");
    expect(r.rijen.map((x) => x.naam)).toEqual(["Anne"]);
    expect(r.fouten.map((f) => f.regel)).toEqual([2, 3, 4]);
  });

  it("meldt een lege invoer en een ontbrekende teamkolom", () => {
    expect(leesSpelersCsv("  \n").fouten[0].melding).toMatch(/leeg/);
    expect(leesSpelersCsv("naam;rugnummer\nJan;1").fouten[0].melding).toMatch(/team/);
  });
});
