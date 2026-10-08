import { NextResponse } from "next/server";
import { getViewer } from "@/server/auth/access";
import { readFileFor, SIGNED_URL_SECONDS } from "@/server/files/storage";

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
    const file = await readFileFor(viewer, id);

    if (file.kind === "redirect") {
      /*
        R2 дээрх зураг: эрх аль хэдийн шалгагдсан, одоо хөтчийг гарын үсэгтэй
        холбоос руу шилжүүлнэ. ⚠️ Энэ шилжүүлгийн кэш холбоосны хугацаанаас
        БОГИНО байх ёстой — эс бөгөөс хөтөч хугацаа нь дууссан холбоос руу
        очиж эвдэрсэн зураг харуулна.
      */
      return NextResponse.redirect(file.url, {
        status: 302,
        headers: { "Cache-Control": `private, max-age=${SIGNED_URL_SECONDS - 600}` },
      });
    }

    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        // Хувийн зураг тул зөвхөн хөтөч дээр, дундын кэшэд биш.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  }
}
