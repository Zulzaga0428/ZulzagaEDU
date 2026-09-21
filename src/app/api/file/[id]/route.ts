import { NextResponse } from "next/server";
import { getViewer } from "@/server/auth/access";
import { readFileFor } from "@/server/files/storage";

export const dynamic = "force-dynamic";

/**
 * Зураг үзүүлэх.
 *
 * ⚠️ Хүсэлт бүрд эрхийг шалгана. Файлын дугаар таамаглахад бэрх ч гэсэн
 * тэр нь хамгаалалт биш — хүүхдийн дэвтрийн зураг шүү дээ.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Нэвтрээгүй" }, { status: 401 });

  const { id } = await params;

  try {
    const { bytes, mime } = await readFileFor(viewer, id);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        // Хувийн зураг тул зөвхөн хөтөч дээр, дундын кэшэд биш.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  }
}
