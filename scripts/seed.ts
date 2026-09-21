/**
 * Хөгжүүлэлтийн өгөгдөл суулгана — нэг сургууль, эрхлэгч, 2 багш, 3А анги,
 * 24 сурагч, 6 эцэг эх, хичээлүүд.
 *
 *   npm run db:seed
 *
 * ⚠️ Энэ скрипт «zulzaga» slug-тай сургуулийг БҮХЭЛД НЬ УСТГААД дахин
 * үүсгэнэ. Зөвхөн хөгжүүлэлтийн санд ажиллуулна.
 */
import { eq, sql } from "drizzle-orm";
import {
  issueStudentCredentials,
  setAdultCredentials,
} from "../src/server/auth/credentials";
import { db } from "../src/server/db";
import {
  classMembers,
  classes,
  guardians,
  memberships,
  schools,
  credentials,
  subjects,
  users,
} from "../src/server/db/schema";

const SCHOOL_SLUG = "zulzaga";
/** Хөгжүүлэлтийн PIN. Прод өгөгдөлд хэзээ ч ашиглагдахгүй. */
const DEV_PIN = "2648";
const ACADEMIC_YEAR = "2026-2027";

const STUDENT_NAMES = [
  "Батбаярын Тэмүүлэн", "Ганбатын Номин", "Доржийн Анужин", "Сүхбаатарын Мөнх-Эрдэнэ",
  "Энхбатын Сувдаа", "Баярсайханы Билгүүн", "Оюунбатын Хулан", "Түмэнбаярын Дэлгэрмаа",
  "Наранбаатарын Цэнгүүн", "Алтанцэцэгийн Ариунаа", "Мөнхбатын Батжаргал", "Цэрэндоржийн Хишигням",
  "Эрдэнэбатын Одбаяр", "Ганзоригийн Мишээл", "Баатарын Ундрам", "Жаргалсайханы Тэмүүжин",
  "Пүрэвдоржийн Мөнхцэцэг", "Отгонбаярын Амарбаясгалан", "Лхагвасүрэнгийн Ганхүү", "Дашдоржийн Энхжин",
  "Батсайханы Тэгшжаргал", "Нямдоржийн Сарангэрэл", "Гантөмөрийн Батбилэг", "Ууганбаярын Хонгорзул",
];

const SUBJECT_NAMES = ["Монгол хэл", "Математик", "Хүн ба орчин", "Англи хэл", "Дүрслэх урлаг", "Хөгжим"];

async function main() {
  const existing = await db.select().from(schools).where(eq(schools.slug, SCHOOL_SLUG)).limit(1);
  if (existing.length > 0) {
    console.log(`«${SCHOOL_SLUG}» сургууль байна — устгаж дахин үүсгэнэ.`);
    await db.delete(schools).where(eq(schools.slug, SCHOOL_SLUG));
  }

  // Сургуулийг устгахад гишүүнчлэл нь цуг явна, харин `users` мөрүүд үлдэнэ —
  // хүн сургуульд харьяалагддаггүй, гишүүнчлэлээрээ холбогддог. Тиймээс
  // эзэнгүй үлдсэн хүмүүсийг цэвэрлэнэ, эс бөгөөс имэйл давхцаад seed унана.
  const orphans = await db.execute(sql`
    delete from users u
    where not exists (select 1 from memberships m where m.user_id = u.id)
    returning u.id
  `);
  if (orphans.rowCount) console.log("Эзэнгүй хэрэглэгч цэвэрлэв:", orphans.rowCount);

  const [school] = await db
    .insert(schools)
    .values({ name: "Зулзага сургууль", slug: SCHOOL_SLUG })
    .returning();
  console.log("Сургууль:", school.name);

  await db.insert(subjects).values(
    SUBJECT_NAMES.map((name, i) => ({ schoolId: school.id, name, sortOrder: i })),
  );

  // Эрхлэгч ба багш нар — Google-ээр нэвтрэх хүмүүс тул имэйлтэй.
  const [manager] = await db
    .insert(users)
    .values({ name: "Сүхбаатарын Оюунчимэг", email: "erhlegch@zulzaga.test", phone: "99110001" })
    .returning();
  const [teacher] = await db
    .insert(users)
    .values({ name: "Дашдоржийн Сарантуяа", email: "bagsh@zulzaga.test", phone: "99110002" })
    .returning();
  const [teacher2] = await db
    .insert(users)
    .values({ name: "Батбаярын Энхтуяа", email: "bagsh2@zulzaga.test", phone: "99110003" })
    .returning();

  await db.insert(memberships).values([
    { userId: manager.id, schoolId: school.id, role: "ACADEMIC_MANAGER" },
    { userId: teacher.id, schoolId: school.id, role: "TEACHER" },
    { userId: teacher2.id, schoolId: school.id, role: "TEACHER" },
  ]);

  const [class3a] = await db
    .insert(classes)
    .values({
      schoolId: school.id,
      name: "3А",
      grade: 3,
      academicYear: ACADEMIC_YEAR,
      createdBy: manager.id,
    })
    .returning();
  console.log("Анги:", class3a.name);

  await db.insert(classMembers).values({
    classId: class3a.id,
    userId: teacher.id,
    role: "TEACHER",
  });

  // Сурагчид — имэйлгүй, код + PIN-ээр нэвтэрнэ.
  const studentRows = await db
    .insert(users)
    .values(STUDENT_NAMES.map((name) => ({ name })))
    .returning();

  await db.insert(memberships).values(
    studentRows.map((s) => ({ userId: s.id, schoolId: school.id, role: "STUDENT" as const })),
  );
  await db.insert(classMembers).values(
    studentRows.map((s) => ({ classId: class3a.id, userId: s.id, role: "STUDENT" as const })),
  );
  // Бүх сурагчид нэг PIN — зөвхөн ХӨГЖҮҮЛЭЛТИЙН өгөгдөл учраас.
  // Жинхэнэ ашиглалтад PIN нь эцэг эх холбогдох үед тус тусдаа тавигдана.
  const sampleCodes: string[] = [];
  for (const s of studentRows) {
    const { loginCode } = await issueStudentCredentials(s.id, "3A", DEV_PIN);
    if (sampleCodes.length < 3) sampleCodes.push(`${s.name} → ${loginCode}`);
  }
  console.log("Сурагч:", studentRows.length, `(PIN: ${DEV_PIN})`);
  for (const c of sampleCodes) console.log("   ", c);

  // Эхний 6 сурагчид эцэг эх холбоно — нэг нь ЭХНИЙ БАГШ ӨӨРӨӨ (хоёр дүртэй хүн).
  const PARENT_NAMES = [
    "Цэрэндоржийн Оюунтуяа",
    "Балданы Нэргүй",
    "Ширэндэвийн Алтанцэцэг",
    "Гомбын Сэлэнгэ",
    "Дамдинсүрэнгийн Цэцэгмаа",
  ];

  const parentRows = await db
    .insert(users)
    .values(
      PARENT_NAMES.map((name, i) => ({
        name,
        email: `etseg${i + 1}@zulzaga.test`,
        phone: `9911010${i + 1}`,
      })),
    )
    .returning();

  await db.insert(memberships).values(
    parentRows.map((p) => ({ userId: p.id, schoolId: school.id, role: "PARENT" as const })),
  );
  await db.insert(guardians).values(
    parentRows.map((p, i) => ({
      parentUserId: p.id,
      studentUserId: studentRows[i].id,
      relation: "MOTHER" as const,
      status: "ACTIVE" as const,
      verifiedBy: teacher.id,
    })),
  );

  // Хоёр дүртэй хүн: багш Сарантуяа нь 6 дахь сурагчийн ээж.
  await db.insert(memberships).values({
    userId: teacher.id,
    schoolId: school.id,
    role: "PARENT",
  });
  await db.insert(guardians).values({
    parentUserId: teacher.id,
    studentUserId: studentRows[5].id,
    relation: "MOTHER",
    status: "ACTIVE",
    verifiedBy: manager.id,
  });
  for (const u of [manager, teacher, teacher2, ...parentRows]) {
    await setAdultCredentials(u.id, DEV_PIN);
  }
  console.log("Эцэг эх:", parentRows.length + 1, "(нэг нь багш өөрөө — хоёр дүртэй)");
  console.log("Насанд хүрэгчид: дугаар 9911000x / 9911010x, PIN", DEV_PIN);

  console.log("\n✅ Дууслаа.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
