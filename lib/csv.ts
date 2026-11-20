// CSV-import van spelers. Kolommen: naam, rugnummer (optioneel), team.
// Scheidingsteken ; , of tab (Excel in NL gebruikt ;). Een kopregel is optioneel.

export interface SpelerRij {
  regel: number;
  naam: string;
  rugnummer: number | null;
  team: string;
}

export interface CsvFout {
  regel: number;
  melding: string;
}

/** Splitst één regel op het scheidingsteken, met ondersteuning voor "aanhalingstekens". */
function splits(regel: string, teken: string): string[] {
  const velden: string[] = [];
  let huidig = "";
  let inQuotes = false;
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i];
    if (inQuotes) {
      if (c === '"' && regel[i + 1] === '"') {
        huidig += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else huidig += c;
    } else if (c === '"') inQuotes = true;
    else if (c === teken) {
      velden.push(huidig);
      huidig = "";
    } else huidig += c;
  }
  velden.push(huidig);
  return velden.map((v) => v.trim());
}

function kiesScheidingsteken(eersteRegel: string): string {
  const tellingen = [";", "\t", ","].map((t) => [t, eersteRegel.split(t).length] as const);
  return tellingen.sort((a, b) => b[1] - a[1])[0][0];
}

const KOP = { naam: ["naam", "speler", "spelersnaam"], rugnummer: ["rugnummer", "nummer", "nr", "rug"], team: ["team", "ploeg"] };

export function leesSpelersCsv(tekst: string): { rijen: SpelerRij[]; fouten: CsvFout[] } {
  const regels = tekst.replace(/^﻿/, "").split(/\r?\n/);
  const eerste = regels.find((r) => r.trim() !== "");
  if (!eerste) return { rijen: [], fouten: [{ regel: 0, melding: "Het bestand is leeg." }] };
  const teken = kiesScheidingsteken(eerste);

  // Standaardvolgorde naam, rugnummer, team; een kopregel mag die bepalen.
  let kolom = { naam: 0, rugnummer: 1, team: 2 };
  let start = regels.indexOf(eerste);
  const kop = splits(eerste, teken).map((v) => v.toLowerCase());
  if (kop.some((v) => KOP.naam.includes(v))) {
    const zoek = (namen: string[]) => kop.findIndex((v) => namen.includes(v));
    kolom = { naam: zoek(KOP.naam), rugnummer: zoek(KOP.rugnummer), team: zoek(KOP.team) };
    start += 1;
    if (kolom.team < 0) return { rijen: [], fouten: [{ regel: 1, melding: 'De kolom "team" ontbreekt.' }] };
  }

  const rijen: SpelerRij[] = [];
  const fouten: CsvFout[] = [];
  for (let i = start; i < regels.length; i++) {
    if (regels[i].trim() === "") continue;
    const regel = i + 1;
    const v = splits(regels[i], teken);
    const naam = v[kolom.naam] ?? "";
    const team = v[kolom.team] ?? "";
    const rugTekst = kolom.rugnummer >= 0 ? (v[kolom.rugnummer] ?? "") : "";
    if (!naam) {
      fouten.push({ regel, melding: "De naam ontbreekt." });
      continue;
    }
    if (!team) {
      fouten.push({ regel, melding: `Bij ${naam} ontbreekt het team.` });
      continue;
    }
    let rugnummer: number | null = null;
    if (rugTekst !== "") {
      rugnummer = Number(rugTekst);
      if (!Number.isInteger(rugnummer) || rugnummer < 0 || rugnummer > 999) {
        fouten.push({ regel, melding: `Het rugnummer "${rugTekst}" van ${naam} is geen geldig getal.` });
        continue;
      }
    }
    rijen.push({ regel, naam, rugnummer, team });
  }
  return { rijen, fouten };
}
