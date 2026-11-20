// Inloglink met token_hash (verifyOtp). Werkt in elke browser, ook als de link op een
// ander apparaat wordt geopend dan waar hij is aangevraagd (anders dan /auth/callback/PKCE).
// Mailtemplate (vanaf Resend, Fase 4):
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&volgende=/
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { veiligPad } from "@/lib/navigatie";

const TYPES: EmailOtpType[] = ["magiclink", "email", "invite", "signup", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const volgende = veiligPad(url.searchParams.get("volgende"));

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(volgende, url.origin));
  }
  const fout = new URL("/login", url.origin);
  fout.searchParams.set("fout", "Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.");
  fout.searchParams.set("volgende", volgende);
  return NextResponse.redirect(fout);
}
