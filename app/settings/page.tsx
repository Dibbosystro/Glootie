import { AppShell } from "@/components/app-shell";
import { ApiSettingsList, type SettingsIntegrationStatus } from "@/components/api-settings-card";
import { SyncButton } from "@/components/sync-button";
import { getDashboardData } from "@/lib/data";
import { dateShort } from "@/lib/format";
import { settingsIntegrations, type SettingsIntegrationConfig } from "@/lib/integration-config";
import { getEnvKeyConfigured } from "@/lib/server-env";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getDashboardData();
  const dataApiSettings = settingsIntegrations
    .filter((integration) => integration.kind === "data")
    .map((integration) => toSettingsStatus(integration, data.integrations.find((item) => item.type === integration.id)));
  const aiApiSettings = settingsIntegrations
    .filter((integration) => integration.kind === "ai")
    .map((integration) => toSettingsStatus(integration, data.integrations.find((item) => item.type === integration.id)));

  return (
    <AppShell data={data}>
      <div className="space-y-5">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#65676b]">Admin</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Settings</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#65676b]">Check live integrations, run manual syncs, and see which AI provider keys are configured.</p>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold">Manual sync</h2>
          <p className="mt-1 text-sm text-[#65676b]">Vercel Cron calls `/api/sync/all` daily using `CRON_SECRET`. These buttons use your private app session.</p>
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
            <p className="mt-1 text-sm text-[#65676b]">Add, replace, or remove the app-local API keys used for live product and ads sync.</p>
            <ApiSettingsList integrations={dataApiSettings} />
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-bold">AI providers</h2>
            <p className="mt-1 text-sm text-[#65676b]">Secrets stay server-side. The browser can add or remove keys, but never reads saved values.</p>
            <ApiSettingsList integrations={aiApiSettings} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function toSettingsStatus(config: SettingsIntegrationConfig, status?: { status: string; message: string; lastSyncedAt: string | null }): SettingsIntegrationStatus {
  const fieldStatus = config.fields.map((field) => ({ key: field.key, configured: getEnvKeyConfigured(field.key) }));
  return {
    ...config,
    configured: fieldStatus.some((field) => field.configured),
    fieldStatus,
    currentStatus: status?.status,
    currentMessage: status?.message,
    lastSynced: status ? dateShort(status.lastSyncedAt) : undefined
  };
}
