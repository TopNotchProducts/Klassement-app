import type { Metadata } from "next";
import { Invoer, Kaart, Knop, Melding } from "@/components/ui";
import { stuurInloglink } from "./acties";

export const metadata: Metadata = { title: "Inloggen · Klassement" };

export default async function LoginPagina({ searchParams }: PageProps<"/login">) {
  const zoek = await searchParams;
  const volgende = typeof zoek.volgende === "string" ? zoek.volgende : "/";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Klassement</h1>
      <p className="mb-6 text-zinc-600">Inloggen voor beheerders en scheidsrechters</p>
      <Melding zoek={zoek} />
      <Kaart>
        <form action={stuurInloglink} className="flex flex-col gap-4">
          <input type="hidden" name="volgende" value={volgende} />
          <Invoer
            label="E-mailadres"
            name="email"
            type="email"
            autoComplete="email"
            required
            hulp="Je krijgt een link per mail. Een wachtwoord is niet nodig."
          />
          <Knop>Stuur inloglink</Knop>
        </form>
      </Kaart>
    </main>
  );
}
