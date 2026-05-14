import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glootie",
  description: "Client ads command center for Shopify, Meta Ads, Google Ads, and AI creative."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
