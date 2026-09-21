"use server";

import { redirect } from "next/navigation";
import { acceptParentInvite } from "@/server/invite/service";

const RELATIONS = ["MOTHER", "FATHER", "GUARDIAN"] as const;

export async function joinAsParent(formData: FormData): Promise<void> {
  const token = formData.get("token");
  const name = formData.get("name");
  const phone = formData.get("phone");
  const pin = formData.get("pin");
  const relation = formData.get("relation");

  if (
    typeof token !== "string" ||
    typeof name !== "string" ||
    typeof phone !== "string" ||
    typeof pin !== "string" ||
    typeof relation !== "string" ||
    !(RELATIONS as readonly string[]).includes(relation)
  ) {
    redirect(`/join/${typeof token === "string" ? token : ""}?aldaa=duutuu`);
  }

  const result = await acceptParentInvite(token, {
    name,
    phone,
    pin,
    relation: relation as (typeof RELATIONS)[number],
  });

  if (!result.ok) {
    const code = {
      ХҮЧИНГҮЙ: "huchingui",
      PIN_СУЛ: "pin-sul",
      PIN_БУРУУ: "pin-buruu",
      АЛЬ_ХЭДИЙН: "ali-hediin",
    }[result.reason];
    redirect(`/join/${token}?aldaa=${code}`);
  }

  // ⚠️ Сесс үүсгэхгүй. Багш батлах хүртэл харах зүйл алга — нэвтрүүлбэл
  // хоосон дэлгэц үзүүлж, «ажиллахгүй байна» гэж бодуулна.
  redirect(`/join/${token}/hulee`);
}
