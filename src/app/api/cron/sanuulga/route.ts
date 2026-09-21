import { NextResponse } from "next/server";
import { sendDueReminders } from "@/server/notify/push";

export const dynamic = "force-dynamic";

/**
 * Маргааш дуусах даалгаврын сануулга илгээнэ.
 *
 * Railway-гийн cron энэ хаяг руу өдөрт нэг удаа хандана.
 *
 * ⚠️ Нууц үгээр хамгаалагдсан. Ил байвал хэн ч бүх эцэг эх рүү мэдэгдэл
 * илгээх боломжтой болно — өөрөө спам явуулах хэрэгсэл болж хувирна.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET тохируулаагүй" }, { status: 503 });
  }

  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (given !== secret) {
    return NextResponse.json({ error: "Эрхгүй" }, { status: 401 });
  }

  const result = await sendDueReminders();
  console.log("Сануулга илгээв:", JSON.stringify(result));
  return NextResponse.json({ ok: true, ...result });
}
