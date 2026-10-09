import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { SchoolProfileForm } from "@/components/school-profile-form";
import { schoolProfile } from "@/server/school/profile";

export const dynamic = "force-dynamic";

/**
 * «Манай сургууль» — эрхлэгч сургуулийнхаа профайлыг засна.
 *
 * Zulzaga (2026-10-09): сургууль бүр лого, байрны зураг, хаяг, утас, вэб
 * сайт, сошиал хуудсаа оруулдаг байх. Бүгд заавал биш. Багш, эцэг эх үүнийг
 * профайл дээрээ «Манай сургууль» гэж харна.
 */
export default async function SchoolProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "ACADEMIC_MANAGER") redirect("/");

  const profile = await schoolProfile(viewer.schoolId);
  if (!profile) redirect("/erhlegch");

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Эрхлэгчийн орон зай"
      title="Манай сургууль"
      subtitle="Лого, хаяг, холбоосууд — багш, эцэг эх бүгд харна."
    >
      <Link href="/erhlegch" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>
      <Card>
        <SchoolProfileForm profile={profile} />
      </Card>
    </AppShell>
  );
}
