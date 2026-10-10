import { BookOpen, Calculator, NotebookPen } from "lucide-react";
import { Card, IconBox } from "@/components/ui";
import { PhotoUpload } from "@/components/photo-upload";
import { DoneButton } from "@/components/student-done-buttons";
import type { StudentHomeworkRow } from "@/server/homework/service";

/**
 * Сурагчийн нэг даалгаврын карт.
 *
 * Нүүр ба даалгаврын жагсаалт **хоёулаа** үүнийг хэрэглэнэ. Хуулж хоёр
 * хувилбар үүсгэвэл нэгийг нь зассан үед нөгөө нь хоцорно.
 *
 * ⚠️ Самбарын зургийг жижигрүүлж таслахгүй — уншиж чадахгүй бол утга алга.
 */

function subjectIcon(subject: string | null) {
  const s = (subject ?? "").toLowerCase();
  if (s.includes("матем")) return { icon: Calculator, tint: "шар" as const };
  if (s.includes("хэл")) return { icon: BookOpen, tint: "цэнхэр" as const };
  return { icon: NotebookPen, tint: "ягаан" as const };
}

export function StudentTask({
  h,
  when,
  photos,
  senior = false,
}: {
  h: StudentHomeworkRow;
  when: string;
  photos: string[];
  /** 6–12-р анги: дүрсгүй, хичээлийн нэр дээр нь тод (`school/stage.ts`). */
  senior?: boolean;
}) {
  const { icon, tint } = subjectIcon(h.subject);

  return (
    <Card>
      {senior ? (
        // Олон хичээлтэй том хүүхэд эхлээд «аль хичээлийнх вэ» гэж хардаг.
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">
            {h.subject ?? "Хичээл"} <span className="font-semibold normal-case tracking-normal text-ink-faint">· {when}</span>
          </p>
          <p className="mt-0.5 text-base font-bold leading-snug text-ink">{h.title}</p>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <IconBox icon={icon} tint={tint} size="том" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold leading-tight text-ink">{h.title}</p>
            <p className="text-xs text-ink-faint">
              {h.subject ?? "Хичээл"} · {when}
            </p>
          </div>
        </div>
      )}

      {h.boardPhotos.length > 0 && (
        <div className="mt-3 space-y-2">
          {h.boardPhotos.map((id) => (
            <a key={id} href={`/api/file/${id}`} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/file/${id}`}
                alt="Багшийн самбар"
                className="w-full rounded-2xl border border-line object-contain"
              />
            </a>
          ))}
        </div>
      )}

      {h.description && (
        <p className="mt-3 whitespace-pre-line rounded-2xl bg-surface-soft px-4 py-3 text-sm text-ink-soft">
          {h.description}
        </p>
      )}

      {photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={`/api/file/${id}`}
              alt="Илгээсэн зураг"
              className="h-24 w-24 shrink-0 rounded-xl object-cover"
            />
          ))}
        </div>
      )}

      {/* Даалгавар цаасан дээр хийгддэг — дэлгэц рүү оруулахын оронд зурагдана. */}
      <div className="mt-3">
        <PhotoUpload homeworkId={h.id} />
      </div>

      <DoneButton homeworkId={h.id} />
    </Card>
  );
}
