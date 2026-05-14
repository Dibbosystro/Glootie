import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getCredentialValue, upsertStoredIntegrationCredentials } from "@/lib/db/credentials";
import { canEncryptCredentials } from "@/lib/security/encryption";
import { upsertLocalEnv } from "@/lib/server-env";

const stateCookieName = "glootie_google_ads_oauth_state";

type GoogleTokenResponse = {
  refresh_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
};

export async function GET(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(stateCookieName)?.value;
  cookieStore.delete(stateCookieName);

  if (error) return settingsRedirect(request, `google-oauth-${error}`);
  if (!code || !state || !expectedState || state !== expectedState) {
    return settingsRedirect(request, "google-oauth-state");
  }

  const clientId = await getCredentialValue("google_ads", "GOOGLE_ADS_CLIENT_ID");
  const clientSecret = await getCredentialValue("google_ads", "GOOGLE_ADS_CLIENT_SECRET");
  if (!clientId || !clientSecret) return settingsRedirect(request, "missing-google-oauth-client");

  const tokenResponse = await exchangeCodeForToken(code, clientId, clientSecret, await getGoogleAdsRedirectUri(request));
  if (!tokenResponse.refresh_token) {
    return settingsRedirect(request, tokenResponse.error ? `google-oauth-${tokenResponse.error}` : "google-oauth-no-refresh-token");
  }

  if (process.env.NODE_ENV === "production") {
    if (!getDb() || !canEncryptCredentials()) return settingsRedirect(request, "google-oauth-production-storage-needed");
    await upsertStoredIntegrationCredentials("google_ads", { GOOGLE_ADS_REFRESH_TOKEN: tokenResponse.refresh_token });
    return settingsRedirect(request, "google-oauth-connected");
  }

  upsertLocalEnv({ GOOGLE_ADS_REFRESH_TOKEN: tokenResponse.refresh_token });
  return settingsRedirect(request, "google-oauth-connected");
}

async function exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  return (await res.json().catch(() => ({}))) as GoogleTokenResponse;
}

async function getGoogleAdsRedirectUri(request: Request) {
  const saved = await getCredentialValue("google_ads", "GOOGLE_ADS_REDIRECT_URI");
  if (saved) return saved;
  return new URL("/api/oauth/google-ads/callback", request.url).toString();
}

function settingsRedirect(request: Request, oauth: string) {
  return NextResponse.redirect(new URL(`/settings?oauth=${encodeURIComponent(oauth)}`, request.url));
}
