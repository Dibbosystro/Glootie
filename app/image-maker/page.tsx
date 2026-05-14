import { AppShell } from "@/components/app-shell";
import { ImageMakerStudio } from "@/components/image-maker-studio";
import { getDashboardData } from "@/lib/data";

export default async function ImageMakerPage() {
  const data = await getDashboardData();
  return (
    <AppShell data={data}>
      <ImageMakerStudio />
    </AppShell>
  );
}
