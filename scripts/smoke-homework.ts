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
import {
  classMembers,
  classes,
  credentials as credentialsTable,
  guardians,
  schools,
  users,
} from "../src/server/db/schema";
import type { Viewer } from "../src/server/auth/access";
import {
  checkAllDone,
  checkSubmission,
  childHomework,
  deleteHomework,
  createHomework,
  homeworkRoster,
  listClassHomework,
  markDone,
  myHomework,
} from "../src/server/homework/service";
import { endOfDayUb, todayUb, addDaysUb } from "../src/server/homework/time";
import { groupByDue, parentHeadline, studentHeadline } from "../src/server/homework/grouping";
import { schoolOverview } from "../src/server/school/overview";
import { signIn, issueStudentCredentials } from "../src/server/auth/credentials";
import {
  acceptParentInvite,
  createParentInvite,
  decideGuardian,
  pendingGuardians,
  readInvite,
} from "../src/server/invite/service";
import { childrenOf } from "../src/server/auth/access";
import { hashPin, verifyPin, isWeakPin, generateLoginCode } from "../src/server/auth/pin";
import type { StudentHomeworkRow } from "../src/server/homework/service";

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

  console.log();
  console.log("9. Багш шалгаж тэмдэглэх");
  const r2 = await homeworkRoster(asTeacher, hwId);
  const doneRow = r2.rows.find((r) => r.status === "DONE")!;
  await checkSubmission(asTeacher, hwId, doneRow.submissionId, "Сайн бичжээ");
  const r3 = await homeworkRoster(asTeacher, hwId);
  const checkedRow = r3.rows.find((r) => r.submissionId === doneRow.submissionId)!;
  check("төлөв CHECKED болов", checkedRow.status === "CHECKED");
  check("тэмдэглэл хадгалагдав", checkedRow.teacherNote === "Сайн бичжээ");

  const seen = (await myHomework(s0)).find((h) => h.id === hwId);
  check("сурагч багшийн тэмдэглэлийг харав", seen?.teacherNote === "Сайн бичжээ");

  console.log();
  console.log("10. Өөр багш шалгах");
  const other = r3.rows.find((r) => r.status === "ASSIGNED")!;
  await refuses("өөр багш шалгах", () =>
    checkSubmission(asTeacher2, hwId, other.submissionId, null),
  );

  console.log();
  console.log("11. Бөөнд нь шалгах");
  await markDone(s1, hwId);
  const bulk = await checkAllDone(asTeacher, hwId);
  check("хийсэн бүгд шалгагдав", bulk === 1, bulk + " мөр");

  console.log();
  console.log("12. Устгах эрх");
  await refuses("өөр багш устгах", () => deleteHomework(asTeacher2, hwId));
  await deleteHomework(asTeacher, hwId);
  const afterDelete = await listClassHomework(asTeacher, klass.id);
  check("даалгавар устав", !afterDelete.some((h) => h.id === hwId));
  const orphan = (await myHomework(s0)).find((h) => h.id === hwId);
  check("сурагчийн мөр цуг устав", orphan === undefined);

  console.log();
  console.log("13. Эцэг эхийн бүлэглэлт (цэвэр логик)");
  const mk = (
    id: string,
    day: string,
    status: StudentHomeworkRow["status"],
    note: string | null = null,
    checkedAt: Date | null = null,
  ): StudentHomeworkRow => ({
    id,
    title: id,
    description: null,
    subject: null,
    dueAt: endOfDayUb(day),
    status,
    teacherNote: note,
    checkedAt,
  });

  const t = todayUb();
  const ystd = addDaysUb(t, -1);
  const tmrw = addDaysUb(t, 1);

  const g = groupByDue([
    mk("хоцорсон", ystd, "ASSIGNED"),
    mk("өнөөдөр", t, "ASSIGNED"),
    mk("маргааш", tmrw, "ASSIGNED"),
    mk("хийсэн", ystd, "DONE"),
    mk("шалгасан", ystd, "CHECKED", "Сайн", new Date(1)),
    mk("тэмдэглэлгүй", ystd, "CHECKED", null, new Date(2)),
  ]);

  check("хоцорсон нь тусдаа", g.overdue.length === 1 && g.overdue[0].id === "хоцорсон");
  check("өнөөдрийнх нь тусдаа", g.today.length === 1 && g.today[0].id === "өнөөдөр");
  check("ирээдүйнх нь тусдаа", g.upcoming.length === 1 && g.upcoming[0].id === "маргааш");
  check("хийсэн нь хүлээгдэж буйд ОРООГҮЙ", g.pendingCount === 3, g.pendingCount + " мөр");
  check("тэмдэглэлгүй шалгалт хасагдав", g.notes.length === 1 && g.notes[0].id === "шалгасан");
  check("тоолол зөв", g.totalCount === 6 && g.doneCount === 3);

  check("хоцорсон бол анхааруулна", parentHeadline(g).tone === "анхаар");
  const allDone = groupByDue([mk("а", ystd, "CHECKED")]);
  check("бүгд хийгдсэн бол тайван", parentHeadline(allDone).tone === "сайн");
  check("хоосон бол хоосон гэнэ", parentHeadline(groupByDue([])).tone === "хоосон");

  check(
    "сурагчид хоцорсныг зэмлэхгүй",
    !studentHeadline(g).includes("хоцор") && !studentHeadline(g).includes("өнгөр"),
    studentHeadline(g),
  );
  check("сурагчид одоо хийх тоог хэлнэ", studentHeadline(g) === "Одоо 2 зүйл хийх байна",
    studentHeadline(g));
  check("бүгд дууссаныг баярлуулна", studentHeadline(allDone).includes("🎉"));

  console.log();
  console.log("14. Эрхлэгчийн тойм");
  const [managerRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "erhlegch@zulzaga.test"))
    .limit(1);
  const asManager: Viewer = {
    userId: managerRow.id,
    schoolId: school.id,
    role: "ACADEMIC_MANAGER",
  };

  const ov = await schoolOverview(asManager);
  check("багшийн тоо зөв", ov.teachers === 2, ov.teachers + " багш");
  check("сурагчийн тоо зөв", ov.students === students.length, ov.students + " сурагч");
  check("ангиуд буцаав", ov.classes.length >= 1);

  // Гол хамгаалалт: энэ объектод даалгаврын гарчиг ОРОХГҮЙ.
  const asText = JSON.stringify(ov);
  check(
    "тоймд даалгаврын агуулга АЛГА",
    !asText.includes("Шалгалтын даалгавар") && !asText.includes("title"),
  );

  await refuses("багш эрхлэгчийн тоймыг харах", () => schoolOverview(asTeacher));
  await refuses("эцэг эх эрхлэгчийн тоймыг харах", () =>
    schoolOverview({ userId: link.parentId, schoolId: school.id, role: "PARENT" }),
  );

  console.log();
  console.log("15. PIN ба нэвтрэлт");
  const h = await hashPin("2648");
  check("hash нь PIN-ийг агуулаагүй", !h.includes("2648"));
  check("зөв PIN танигдана", await verifyPin("2648", h));
  check("буруу PIN татгалзана", !(await verifyPin("2649", h)));
  check("ижил PIN өөр hash өгнө", (await hashPin("2648")) !== h);

  check("1111 сул гэж үзнэ", isWeakPin("1111"));
  check("1234 сул гэж үзнэ", isWeakPin("1234"));
  check("4321 сул гэж үзнэ", isWeakPin("4321"));
  check("2648 сул биш", !isWeakPin("2648"));
  check("3 оронтой татгалзана", isWeakPin("264"));

  const code = generateLoginCode("3A");
  check("код 6 тэмдэгттэй", code.length === "3A-".length + 6, code);
  check("андуурах тэмдэгт алга", !/[01OIS5]/.test(code.split("-")[1]), code);

  console.log();
  console.log("16. Нэвтрэх оролдлого");
  const [stCred] = await db
    .select({ code: credentialsTable.loginCode })
    .from(credentialsTable)
    .where(eq(credentialsTable.userId, students[0].id))
    .limit(1);

  const good = await signIn(stCred.code!, "2648");
  check("зөв код + PIN нэвтэрнэ", good.ok && good.userId === students[0].id);
  if (good.ok) check("сурагч дүрээр орлоо", good.role === "STUDENT", good.role);

  const badPin = await signIn(stCred.code!, "9999");
  check("буруу PIN татгалзана", !badPin.ok);

  const noSuch = await signIn("3A-XXXXXX", "2648");
  check(
    "байхгүй код нь буруу PIN-тэй ИЖИЛ хариу өгнө",
    !noSuch.ok && !badPin.ok && noSuch.reason === badPin.reason,
    noSuch.ok ? "?" : noSuch.reason,
  );

  console.log();
  console.log("17. Түгжих");
  const [victim] = await db
    .select({ code: credentialsTable.loginCode })
    .from(credentialsTable)
    .where(eq(credentialsTable.userId, students[1].id))
    .limit(1);

  let lockedAt = 0;
  for (let i = 1; i <= 6; i++) {
    const r = await signIn(victim.code!, "0000");
    if (!r.ok && r.reason === "ТҮГЖЭЭТЭЙ" && lockedAt === 0) lockedAt = i;
  }
  check("5 удаагийн дараа түгжигдэв", lockedAt === 5, lockedAt + " дахь оролдлогод");

  const afterLock = await signIn(victim.code!, "2648");
  check("түгжээтэй үед ЗӨВ PIN ч орохгүй", !afterLock.ok);

  // Дараагийн ажиллуулалтад саад болохгүйн тулд түгжээг тайлна.
  await issueStudentCredentials(students[1].id, "3A", "2648");

  console.log();
  console.log("18. Урилга үүсгэх");
  const target = students[students.length - 1];
  const inv = await createParentInvite(asTeacher, klass.id, target.id);
  check("багш урилга гаргав", inv.token.length > 20);
  await refuses("өөр ангийн багш урилга гаргах", () =>
    createParentInvite(asTeacher2, klass.id, target.id),
  );

  const view = await readInvite(inv.token);
  check("урилга зөв сурагчийг заав", view?.studentUserId === target.id);
  check("хуурамч токен таарахгүй", (await readInvite("xxxx")) === null);

  console.log();
  console.log("19. Эцэг эх нэгдэх");
  const newPhone = "9955" + String(Date.now()).slice(-4);
  const acc = await acceptParentInvite(inv.token, {
    name: "Тестийн Эцэг",
    phone: newPhone,
    pin: "7382",
    relation: "FATHER",
  });
  check("урилга хүлээн авагдав", acc.ok);
  if (!acc.ok) throw new Error("урилга хүлээн авагдсангүй");

  const newParent: Viewer = { userId: acc.userId, schoolId: school.id, role: "PARENT" };
  const kidsBefore = await childrenOf(acc.userId);
  check("ХҮЛЭЭГДЭЖ буй үед хүүхэд харагдахгүй", kidsBefore.length === 0,
    kidsBefore.length + " хүүхэд");
  await refuses("батлагдаагүй эцэг эх даалгавар харах", () =>
    childHomework(newParent, target.id),
  );

  console.log();
  console.log("20. Багш батлах");
  const waiting = await pendingGuardians(asTeacher, klass.id);
  const mine = waiting.find((w) => w.studentName === target.name);
  check("багшийн жагсаалтад гарав", Boolean(mine));
  await refuses("өөр багш батлах", () => decideGuardian(asTeacher2, mine!.id, "ACTIVE"));

  await decideGuardian(asTeacher, mine!.id, "ACTIVE");
  const kidsAfter = await childrenOf(acc.userId);
  check("батласны дараа хүүхэд харагдав", kidsAfter.includes(target.id));
  const seenHw = await childHomework(newParent, target.id);
  check("батласны дараа даалгавар харагдав", Array.isArray(seenHw));

  console.log();
  console.log("21. Урилгын хязгаар");
  const dup = await acceptParentInvite(inv.token, {
    name: "Тестийн Эцэг",
    phone: newPhone,
    pin: "7382",
    relation: "FATHER",
  });
  check("нэг хүн хоёр удаа холбогдохгүй", !dup.ok && dup.reason === "АЛЬ_ХЭДИЙН");

  const wrongPin = await acceptParentInvite(inv.token, {
    name: "Хэн нэгэн",
    phone: newPhone,
    pin: "1357",
    relation: "MOTHER",
  });
  check("байгаа дугаарт буруу PIN татгалзана", !wrongPin.ok && wrongPin.reason === "PIN_БУРУУ");

  const weak = await acceptParentInvite(inv.token, {
    name: "Шинэ хүн",
    phone: "99009900",
    pin: "1111",
    relation: "MOTHER",
  });
  check("сул PIN татгалзана", !weak.ok && weak.reason === "PIN_СУЛ");

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} зөв, ${failed} алдаа\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
