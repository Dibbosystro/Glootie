import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { getCredentialValue } from "@/lib/db/credentials";

const googleAdsScope = "https://www.googleapis.com/auth/adwords";
const stateCookieName = "glootie_google_ads_oauth_state";

export async function GET(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  const clientId = await getCredentialValue("google_ads", "GOOGLE_ADS_CLIENT_ID");
  if (!clientId) {
    return NextResponse.redirect(new URL("/settings?oauth=missing-google-client-id", request.url));
  }

  const redirectUri = await getGoogleAdsRedirectUri(request);
  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(stateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleAdsScope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}

async function getGoogleAdsRedirectUri(request: Request) {
  const saved = await getCredentialValue("google_ads", "GOOGLE_ADS_REDIRECT_URI");
  if (saved) return saved;
  return new URL("/api/oauth/google-ads/callback", request.url).toString();
}
