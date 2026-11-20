import { describe, expect, it } from "vitest";
import { controleerSlug, maakSlug } from "@/lib/slug";
import { veiligPad } from "@/lib/navigatie";

describe("slug", () => {
  it("maakt een kebab-case slug zonder accenten", () => {
    expect(maakSlug("WAC Gemert (zaal)")).toBe("wac-gemert-zaal");
    expect(maakSlug("  Café Één ")).toBe("cafe-een");
  });
  it("weigert gereserveerde en ongeldige slugs", () => {
    expect(controleerSlug("wac-gemert")).toBeNull();
    expect(controleerSlug("login")).toMatch(/gereserveerd/);
    expect(controleerSlug("WAC")).toMatch(/kleine letters/);
    expect(controleerSlug("")).toMatch(/Vul/);
  });
});

describe("veiligPad", () => {
  it("staat alleen interne paden toe", () => {
    expect(veiligPad("/wac/beheer")).toBe("/wac/beheer");
    expect(veiligPad("//evil.com")).toBe("/");
    expect(veiligPad("https://evil.com")).toBe("/");
    expect(veiligPad("/\\evil.com")).toBe("/");
    expect(veiligPad(null, "/x")).toBe("/x");
  });
});

import { aantal } from "@/lib/tekst";
describe("aantal", () => {
  it("kiest enkelvoud of meervoud", () => {
    expect(aantal(1, "team", "teams")).toBe("1 team");
    expect(aantal(0, "team", "teams")).toBe("0 teams");
  });
});
