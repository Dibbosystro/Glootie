import { AppShell } from "@/components/app-shell";
import { ApiSettingsList, type SettingsIntegrationStatus } from "@/components/api-settings-card";
import { SyncButton } from "@/components/sync-button";
import { isCredentialKeyConfigured } from "@/lib/db/credentials";
import { getDashboardData } from "@/lib/data";
import { dateShort } from "@/lib/format";
import { settingsIntegrations, type SettingsIntegrationConfig } from "@/lib/integration-config";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ oauth?: string | string[] }> }) {
  const data = await getDashboardData();
  const params = await searchParams;
  const oauthMessage = oauthStatusMessage(Array.isArray(params?.oauth) ? params?.oauth[0] : params?.oauth);
  const dataApiSettings = await Promise.all(settingsIntegrations
    .filter((integration) => integration.kind === "data")
    .map((integration) => toSettingsStatus(integration, data.integrations.find((item) => item.type === integration.id))));
  const aiApiSettings = await Promise.all(settingsIntegrations
    .filter((integration) => integration.kind === "ai")
    .map((integration) => toSettingsStatus(integration, data.integrations.find((item) => item.type === integration.id))));

  return (
    <AppShell data={data}>
      <div className="space-y-5">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#57534e]">Admin</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Settings</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#57534e]">Check live integrations, run manual syncs, and see which AI provider keys are configured.</p>
          {oauthMessage ? (
            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${oauthMessage.tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-[#fde68a] bg-[#fef3c7] text-[#b45309]"}`}>
              {oauthMessage.text}
            </div>
          ) : null}
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold">Manual sync</h2>
          <p className="mt-1 text-sm text-[#57534e]">Vercel Cron calls `/api/sync/all` daily using `CRON_SECRET`. These buttons use your private app session.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <SyncButton source="all" label="Sync all" />
            <SyncButton source="shopify" label="Sync Shopify" />
            <SyncButton source="meta" label="Sync Meta" />
            <SyncButton source="google-ads" label="Sync Google Ads" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-lg font-bold">Data integrations</h2>
            <p className="mt-1 text-sm text-[#57534e]">Add, replace, or remove the app-local API keys used for live product and ads sync.</p>
            <ApiSettingsList integrations={dataApiSettings} />
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-bold">AI providers</h2>
            <p className="mt-1 text-sm text-[#57534e]">Secrets stay server-side. The browser can add or remove keys, but never reads saved values.</p>
            <ApiSettingsList integrations={aiApiSettings} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function oauthStatusMessage(code?: string): { tone: "good" | "warn"; text: string } | null {
  if (!code) return null;
  if (code === "google-oauth-connected") return { tone: "good", text: "Google OAuth connected locally. The refresh token was saved to your app-local environment." };
  if (code === "missing-google-client-id") return { tone: "warn", text: "Add the Google OAuth client ID before starting the Google Ads OAuth flow." };
  if (code === "missing-google-oauth-client") return { tone: "warn", text: "Add both Google OAuth client ID and client secret before finishing OAuth." };
  if (code === "google-oauth-no-refresh-token") return { tone: "warn", text: "Google did not return a refresh token. Try again with consent prompt or remove the previous app grant in Google Account permissions." };
  if (code === "google-oauth-production-storage-needed") return { tone: "warn", text: "Google OAuth worked, but production token storage needs encrypted DB credentials. Do not expose the refresh token in the browser." };
  if (code === "google-oauth-state") return { tone: "warn", text: "Google OAuth state check failed. Start the connection flow again from this page." };
  return { tone: "warn", text: "Google OAuth did not complete. Check the OAuth app settings and redirect URI." };
}

async function toSettingsStatus(config: SettingsIntegrationConfig, status?: { status: string; message: string; lastSyncedAt: string | null }): Promise<SettingsIntegrationStatus> {
  const fieldStatus = await Promise.all(config.fields.map(async (field) => ({ key: field.key, configured: await isCredentialKeyConfigured(config.id, field.key) })));
  return {
    ...config,
    configured: fieldStatus.some((field) => field.configured),
    fieldStatus,
    currentStatus: status?.status,
    currentMessage: status?.message,
    lastSynced: status ? dateShort(status.lastSyncedAt) : undefined
  };
}
