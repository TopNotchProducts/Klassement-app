"use client";
// Vult het webadres automatisch in op basis van de naam (aanpasbaar).
import { useState } from "react";
import { Invoer } from "@/components/ui";
import { maakSlug } from "@/lib/slug";

export function SlugVelden() {
  const [naam, setNaam] = useState("");
  const [slug, setSlug] = useState("");
  const [zelfAangepast, setZelfAangepast] = useState(false);
  return (
    <>
      <Invoer
        label="Naam"
        name="naam"
        required
        value={naam}
        onChange={(e) => {
          setNaam(e.target.value);
          if (!zelfAangepast) setSlug(maakSlug(e.target.value));
        }}
      />
      <Invoer
        label="Webadres"
        name="slug"
        required
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        value={slug}
        onChange={(e) => {
          setSlug(e.target.value);
          setZelfAangepast(true);
        }}
        hulp={`klassement.app/${slug || "…"} · kan later niet meer worden gewijzigd`}
      />
    </>
  );
}
