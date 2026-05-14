import { AppShell } from "@/components/app-shell";
import { AdCopyStudio } from "@/components/ad-copy-studio";
import { getDashboardData } from "@/lib/data";

export default async function AdCopyPage() {
  const data = await getDashboardData();
  return (
    <AppShell data={data}>
      <AdCopyStudio />
    </AppShell>
  );
}
