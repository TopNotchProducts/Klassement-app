// Landingsplek van de magic link: wisselt de code om voor een sessie (PKCE).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { veiligPad } from "@/lib/navigatie";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const volgende = veiligPad(url.searchParams.get("volgende"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(volgende, url.origin));
  }
  const fout = new URL("/login", url.origin);
  fout.searchParams.set("fout", "Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.");
  fout.searchParams.set("volgende", volgende);
  return NextResponse.redirect(fout);
}
