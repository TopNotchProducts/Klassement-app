"use client";
import { useActionState } from "react";
import { BESTAND, Knop, Tekstvak, Vinkje } from "@/components/ui";
import { aantal } from "@/lib/tekst";
import { importeerSpelers, type ImportStatus } from "./acties";

const BEGIN: ImportStatus = { stap: "begin", tekst: "", regels: [], fouten: [], nieuweTeams: [] };

export function ImportFormulier({ org, seizoenId }: { org: string; seizoenId: string }) {
  const [status, actie, bezig] = useActionState(importeerSpelers, BEGIN);
  return (
    <form action={actie} className="flex flex-col gap-4">
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="seizoen_id" value={seizoenId} />
      {status.melding && (
        <p role="status" className={`rounded-lg px-4 py-3 ${status.stap === "klaar" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
          {status.melding}
        </p>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-800">Bestand (.csv)</span>
        <input type="file" name="bestand" accept=".csv,text/csv,text/plain" className={BESTAND} />
      </label>
      <Tekstvak
        label="Of plak de regels hier"
        name="tekst"
        defaultValue={status.tekst}
        key={status.stap === "klaar" ? "leeg" : "invoer"}
        placeholder={"naam;rugnummer;team\nJan Jansen;9;De Kampioenen"}
      />

      {status.stap === "controle" && (
        <div className="flex flex-col gap-3">
          {status.fouten.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 text-red-900">
              <p className="font-medium">Deze regels worden overgeslagen:</p>
              <ul className="list-inside list-disc">
                {status.fouten.map((f) => (
                  <li key={`${f.regel}-${f.melding}`}>
                    {f.regel > 0 ? `Regel ${f.regel}: ` : ""}
                    {f.melding}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {status.regels.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="py-1 pr-2">Naam</th>
                    <th className="py-1 pr-2">Nr</th>
                    <th className="py-1 pr-2">Team</th>
                    <th className="py-1">Actie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {status.regels.map((r) => (
                    <tr key={r.regel}>
                      <td className="py-1 pr-2">{r.naam}</td>
                      <td className="py-1 pr-2 tabular-nums">{r.rugnummer ?? ""}</td>
                      <td className="py-1 pr-2">
                        {r.team}
                        {status.nieuweTeams.includes(r.team) && <span className="ml-1 text-amber-700">(nieuw team)</span>}
                      </td>
                      <td className="py-1">{r.actie === "nieuw" ? "toevoegen" : "bijwerken"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {status.nieuweTeams.length > 0 && (
            <Vinkje name="maak_teams" label={`Maak ${aantal(status.nieuweTeams.length, "nieuw team", "nieuwe teams")} aan: ${status.nieuweTeams.join(", ")}`} />
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Knop soort="secundair" name="stap" value="controleren" disabled={bezig}>
          Controleren
        </Knop>
        {status.stap === "controle" && status.regels.length > 0 && (
          <Knop name="stap" value="importeren" disabled={bezig}>
            {aantal(status.regels.length, "speler", "spelers")} importeren
          </Knop>
        )}
      </div>
    </form>
  );
}
