/**
 * Даалгаврын гогцооны шалгалт — ялангуяа ЭРХИЙН хэсэг.
 *
 *   npm run smoke
 *
 * Seed өгөгдөл дээр ажиллана. Юу шалгаж байгаагаа мөр бүрт хэвлэнэ, учир нь
 * «амжилттай» гэсэн мессежэд биш, харьцуулсан тоонд итгэнэ.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../src/server/db";
import { classMembers, classes, guardians, schools, users } from "../src/server/db/schema";
import type { Viewer } from "../src/server/auth/access";
import {
  childHomework,
  createHomework,
  homeworkRoster,
  listClassHomework,
  markDone,
  myHomework,
} from "../src/server/homework/service";
import { endOfDayUb, todayUb, addDaysUb } from "../src/server/homework/time";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function refuses(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(label, false, "татгалзах ёстой байсан ч зөвшөөрөв");
  } catch {
    check(label, true, "татгалзав");
  }
}

async function main() {
  const [school] = await db.select().from(schools).where(eq(schools.slug, "zulzaga")).limit(1);
  if (!school) throw new Error("Seed ажиллуулаагүй байна.");

  const [teacher] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, "bagsh@zulzaga.test"))
    .limit(1);
  const [teacher2] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, "bagsh2@zulzaga.test"))
    .limit(1);
  const [klass] = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(eq(classes.schoolId, school.id))
    .limit(1);

  const students = await db
    .select({ id: users.id, name: users.name })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .where(and(eq(classMembers.classId, klass.id), eq(classMembers.role, "STUDENT")));

  // Хосыг таамаглахгүй — `guardians`-аас бодит холбоосыг уншина.
  const [link] = await db
    .select({ parentId: guardians.parentUserId, childId: guardians.studentUserId })
    .from(guardians)
    .where(eq(guardians.status, "ACTIVE"))
    .limit(1);

  const asTeacher: Viewer = { userId: teacher.id, schoolId: school.id, role: "TEACHER" };
  const asTeacher2: Viewer = { userId: teacher2.id, schoolId: school.id, role: "TEACHER" };

  console.log(`\nСургууль: ${school.name} · Анги: ${klass.name} · Сурагч: ${students.length}`);

  console.log("\n1. Багш даалгавар өгөх");
  const hwId = await createHomework(asTeacher, {
    classId: klass.id,
    subjectId: null,
    title: "Шалгалтын даалгавар",
    description: "Автомат шалгалтаас үүссэн.",
    dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
  });
  const roster0 = await homeworkRoster(asTeacher, hwId);
  check("сурагч бүрд мөр үүсэв", roster0.rows.length === students.length,
    `${roster0.rows.length} / ${students.length}`);
  check("бүгд эхэндээ хийгээгүй",
    roster0.rows.every((r) => r.status === "ASSIGNED"));

  console.log("\n2. Өөр ангийн багш хандах");
  await refuses("өөр багш жагсаалт харах", () => homeworkRoster(asTeacher2, hwId));
  await refuses("өөр багш тэр ангид даалгавар өгөх", () =>
    createHomework(asTeacher2, {
      classId: klass.id,
      subjectId: null,
      title: "Зөвшөөрөгдөх ёсгүй",
      description: null,
      dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    }),
  );

  console.log("\n3. Сурагч хийсэн гэж тэмдэглэх");
  const s0: Viewer = { userId: students[0].id, schoolId: school.id, role: "STUDENT" };
  const before = (await myHomework(s0)).find((h) => h.id === hwId);
  check("сурагч даалгавраа харав", before?.status === "ASSIGNED");
  await markDone(s0, hwId);
  const after = (await myHomework(s0)).find((h) => h.id === hwId);
  check("төлөв DONE болов", after?.status === "DONE");

  const roster1 = await homeworkRoster(asTeacher, hwId);
  const doneCount = roster1.rows.filter((r) => r.status !== "ASSIGNED").length;
  check("багшийн тоо нэгээр нэмэгдэв", doneCount === 1, `${doneCount}/${roster1.rows.length}`);

  console.log("\n4. Давхар тэмдэглэх");
  await refuses("нэг даалгаврыг хоёр удаа хийх", () => markDone(s0, hwId));

  console.log("\n5. Өөр сурагчийн даалгаврыг хөндөх");
  const s1: Viewer = { userId: students[1].id, schoolId: school.id, role: "STUDENT" };
  const s1Before = (await myHomework(s1)).find((h) => h.id === hwId);
  check("нөгөө сурагчид нөлөөлөөгүй", s1Before?.status === "ASSIGNED");

  console.log("\n6. Эцэг эх хүүхдээ харах");
  const parent: Viewer = { userId: link.parentId, schoolId: school.id, role: "PARENT" };
  const own = await childHomework(parent, link.childId);
  check("өөрийн хүүхдийн даалгавар харагдав", own.length > 0, `${own.length} мөр`);

  console.log("\n7. Эцэг эх ӨӨРИЙН БИШ хүүхдийг харах");
  const notMine = students.find((s) => s.id !== link.childId)!.id;
  await refuses("хамаагүй хүүхдийн даалгавар", () => childHomework(parent, notMine));

  console.log("\n8. Багшийн жагсаалт");
  const list = await listClassHomework(asTeacher, klass.id);
  const found = list.find((h) => h.id === hwId);
  check("шинэ даалгавар жагсаалтад орсон", Boolean(found));
  check("тоолол зөв", found?.done === 1 && found?.total === students.length,
    `${found?.done}/${found?.total}`);

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} зөв, ${failed} алдаа\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
