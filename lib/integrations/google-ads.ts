import "server-only";

export interface GoogleAdsSyncResult {
  source: "google_ads";
  status: "success" | "demo" | "error";
  rowsChanged: number;
  message: string;
}

export async function syncGoogleAds(): Promise<GoogleAdsSyncResult> {
  const required = [
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID"
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    return {
      source: "google_ads",
      status: "demo",
      rowsChanged: 0,
      message: `Google Ads credentials are missing (${missing.join(", ")}), seed data is being used.`
    };
  }

  // Full GAQL sync is intentionally isolated here. The UI and schema are ready;
  // add the official Google Ads client when the approved developer token exists.
  return {
    source: "google_ads",
    status: "success",
    rowsChanged: 0,
    message: "Google Ads credentials are configured. GAQL campaign sync can be enabled from this connector module."
  };
}
