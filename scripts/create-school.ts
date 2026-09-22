/**
 * Жинхэнэ сургууль үүсгэнэ — эрхлэгч, үндсэн хичээлүүдтэй нь.
 *
 *   npm run school:create      -- "Сургуулийн нэр" slug "Эрхлэгчийн нэр" 99112233
 *   npm run school:create:prod -- "Сургуулийн нэр" slug "Эрхлэгчийн нэр" 99112233
 *
 * Эхнийх нь хөгжүүлэлтийн санд (туршихад), хоёр дахь нь ПРОД-д.
 *
 * Үүнээс өмнө сургууль үүсгэх ганц арга нь seed байсан — seed нь зөвхөн
 * «zulzaga» гэсэн зохиомол сургуулийг устгаж дахин үүсгэдэг. Пилотын
 * сургуулийг түүгээр үүсгэж болохгүй.
 *
 * Эрхлэгчийн PIN нэг л удаа хэвлэгдэнэ. Дараа нь эрхлэгч өөрөө багш нэмж,
 * анги үүсгэнэ (`/erhlegch/bagsh`).
 */
import { eq, sql } from "drizzle-orm";
import { db } from "../src/server/db";
import { auditLog, memberships, schools, subjects, users } from "../src/server/db/schema";
import { setAdultCredentials } from "../src/server/auth/credentials";
import { generatePin, isWeakPin } from "../src/server/auth/pin";
import { DEFAULT_SUBJECTS } from "../src/server/school/defaults";

function usage(msg: string): never {
  console.error(`⛔ ${msg}`);
  console.error(
    'Хэрэглээ: npm run school:create -- "Сургуулийн нэр" slug "Эрхлэгчийн нэр" 99112233',
  );
  process.exit(1);
}

function safePin(): string {
  for (let i = 0; i < 20; i++) {
    const pin = generatePin();
    if (!isWeakPin(pin)) return pin;
  }
  return "2748";
}

async function main() {
  const [rawName, rawSlug, rawManager, rawPhone] = process.argv.slice(2);
  if (!rawName || !rawSlug || !rawManager || !rawPhone) usage("Дөрвөн утга дутуу байна.");

  const name = rawName.trim().replace(/\s+/g, " ");
  const slug = rawSlug.trim().toLowerCase();
  const managerName = rawManager.trim().replace(/\s+/g, " ");
  const phone = rawPhone.replace(/\s/g, "");

  // Slug нь дэд домэйн болно: <slug>.zulzagaedu.mn
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) {
    usage("slug нь 3–32 тэмдэгт, латин жижиг үсэг, тоо, зураас байна (жишээ: nomin-school).");
  }
  if (slug === "zulzaga") usage("«zulzaga» нь seed-ийн зохиомол сургуульд хадгалагдсан.");
  if (!/^\d{8}$/.test(phone)) usage("Утасны дугаар 8 оронтой байна.");
  if (managerName.length < 2) usage("Эрхлэгчийн нэр хэт богино.");

  const [{ db_name }] = (await db.execute(sql`select current_database() as db_name`))
    .rows as { db_name: string }[];
  console.log(`Сан: ${db_name}${db_name === "railway" ? "  ⚠️ ПРОД" : ""}`);

  const [taken] = await db.select({ id: schools.id }).from(schools).where(eq(schools.slug, slug)).limit(1);
  if (taken) usage(`«${slug}» slug-тай сургууль аль хэдийн бий.`);

  const [existingUser] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  const pin = existingUser ? null : safePin();

  const result = await db.transaction(async (tx) => {
    const [school] = await tx.insert(schools).values({ name, slug }).returning({ id: schools.id });

    await tx
      .insert(subjects)
      .values(DEFAULT_SUBJECTS.map((s, i) => ({ schoolId: school.id, name: s, sortOrder: i })));

    const userId =
      existingUser?.id ??
      (await tx.insert(users).values({ name: managerName, phone }).returning({ id: users.id }))[0]
        .id;

    await tx.insert(memberships).values({ userId, schoolId: school.id, role: "ACADEMIC_MANAGER" });

    await tx.insert(auditLog).values({
      schoolId: school.id,
      actorUserId: null,
      action: "SCHOOL_CREATED",
      targetType: "school",
      targetId: school.id,
      meta: { slug, managerUserId: userId, via: "create-school script" },
    });

    return { schoolId: school.id, userId };
  });

  // PIN нь hash-аар хадгалагдах тул гүйлгээний гадна (scrypt удаан).
  if (pin) await setAdultCredentials(result.userId, pin);

  console.log("");
  console.log(`✅ ${name} (${slug}) үүслээ`);
  console.log(`   Хичээл: ${DEFAULT_SUBJECTS.length}`);
  console.log("");
  console.log("   Эрхлэгчийн нэвтрэх мэдээлэл:");
  console.log(`   Дугаар: ${phone}`);
  if (pin) {
    console.log(`   PIN:    ${pin}`);
    console.log("");
    console.log("   ⚠️ PIN нэг л удаа харагдана. Эрхлэгчид шууд дамжуул.");
  } else {
    console.log(`   PIN:    (өмнөх PIN хэвээр — ${existingUser!.name} системд бүртгэлтэй байсан)`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
