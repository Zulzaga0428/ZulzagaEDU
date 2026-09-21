import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { ROLE_HOME } from "@/server/auth/roles";

export const dynamic = "force-dynamic";

/** Үндсэн хаяг нь дүр бүрийг өөрийнх нь нүүр рүү явуулна. */
export default async function RootPage() {
  const viewer = await getViewer();
  redirect(viewer ? ROLE_HOME[viewer.role] : "/login");
}
