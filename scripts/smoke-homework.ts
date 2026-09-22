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
  memberships,
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
import { sendDueReminders } from "../src/server/notify/push";
import {
  attachToSubmission,
  deleteFile,
  myAttachments,
  readFileFor,
  saveImage,
} from "../src/server/files/storage";
import {
  classAnnouncements,
  deleteAnnouncement,
  myAnnouncements,
  parentAnnouncements,
  postAnnouncement,
} from "../src/server/announce/service";
import {
  addTeacher,
  assignTeacher,
  createClass,
  currentAcademicYear,
  listClasses,
  listTeachers,
  resetTeacherPin,
  unassignTeacher,
} from "../src/server/school/manage";
import { signIn, issueStudentCredentials } from "../src/server/auth/credentials";
import {
  acceptParentInvite,
  createParentInvite,
  decideGuardian,
  pendingGuardians,
  readInvite,
} from "../src/server/invite/service";
import { childrenOf } from "../src/server/auth/access";
import { addStudent, resetStudentPin } from "../src/server/students/service";
import {
  childWeek,
  myWeek,
  nextSchoolDay,
  saveWeek,
  teacherWeek,
} from "../src/server/schedule/service";
import { schoolSubjects } from "../src/server/homework/service";
import { hashPin, verifyPin, isWeakPin, generateLoginCode, latinPrefix } from "../src/server/auth/pin";
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

  console.log();
  console.log("22. Сурагч нэмэх");
  const added = await addStudent(asTeacher, klass.id, "  Тестийн   Шинэсурагч  ");
  check("нэрийн илүү хоосон зай цэвэрлэгдэв", added.name === "Тестийн Шинэсурагч", added.name);
  check(
    "код латин угтвартай олгогдов",
    added.loginCode.startsWith(latinPrefix(klass.name) + "-"),
    added.loginCode,
  );
  check("PIN сул биш", !isWeakPin(added.pin), added.pin);

  const signedIn = await signIn(added.loginCode, added.pin);
  check("шинэ сурагч шууд нэвтэрлээ", signedIn.ok && signedIn.role === "STUDENT");
  await refuses("өөр ангийн багш сурагч нэмэх", () =>
    addStudent(asTeacher2, klass.id, "Болохгүй Хүн"),
  );

  console.log();
  console.log("23. PIN шинэчлэх");
  if (!signedIn.ok) throw new Error("нэвтэрсэнгүй");
  const newStudentId = signedIn.userId;

  const reset = await resetStudentPin(asTeacher, newStudentId);
  check("код ХЭВЭЭР үлдэв", reset.loginCode === added.loginCode, reset.loginCode);
  check("PIN өөрчлөгдөв", reset.pin !== added.pin);

  const oldPin = await signIn(added.loginCode, added.pin);
  check("хуучин PIN ажиллахаа болив", !oldPin.ok);
  const freshPin = await signIn(reset.loginCode, reset.pin);
  check("шинэ PIN ажиллав", freshPin.ok);

  await refuses("өөр ангийн багш PIN шинэчлэх", () =>
    resetStudentPin(asTeacher2, newStudentId),
  );

  // Түгжигдсэн сурагчийг PIN шинэчлэлт чөлөөлдөг эсэх.
  for (let i = 0; i < 5; i++) await signIn(reset.loginCode, "0000");
  const locked = await signIn(reset.loginCode, reset.pin);
  check("буруу оролдлогын дараа түгжигдэв", !locked.ok);
  const reset2 = await resetStudentPin(asTeacher, newStudentId);
  const unlocked = await signIn(reset2.loginCode, reset2.pin);
  check("PIN шинэчлэхэд түгжээ тайлагдав", unlocked.ok);

  check("кирилл ангийн нэр латин болов", latinPrefix("3А") === "3A", latinPrefix("3А"));
  check("кирилл Б латин B болов", latinPrefix("5Б") === "5B", latinPrefix("5Б"));
  check("код бүхэлдээ латин", /^[A-Z0-9]+-[A-Z0-9]+$/.test(added.loginCode), added.loginCode);

  console.log();
  console.log("24. Хичээлийн хуваарь");
  const subs = await schoolSubjects(asTeacher);
  const saved = await saveWeek(asTeacher, klass.id, [
    { dayOfWeek: 1, period: 1, subjectId: subs[0].id },
    { dayOfWeek: 1, period: 2, subjectId: subs[1].id },
    { dayOfWeek: 3, period: 1, subjectId: subs[0].id },
    // Буруу утгууд — шүүгдэх ёстой
    { dayOfWeek: 9, period: 1, subjectId: subs[0].id },
    { dayOfWeek: 1, period: 99, subjectId: subs[0].id },
    { dayOfWeek: 2, period: 1, subjectId: null },
  ]);
  check("зөвхөн хүчинтэй нүд хадгалагдав", saved === 3, saved + " нүд");

  const week = await teacherWeek(asTeacher, klass.id);
  check("хуваарь уншигдав", week.length === 3);
  check("хичээлийн нэр холбогдов", Boolean(week[0].subjectName), week[0].subjectName ?? "—");

  await refuses("өөр ангийн багш хуваарь харах", () => teacherWeek(asTeacher2, klass.id));
  await refuses("өөр ангийн багш хуваарь хадгалах", () =>
    saveWeek(asTeacher2, klass.id, [{ dayOfWeek: 1, period: 1, subjectId: subs[0].id }]),
  );

  // Дахин хадгалахад хуучин нь бүтнээр солигдоно.
  const again = await saveWeek(asTeacher, klass.id, [
    { dayOfWeek: 5, period: 1, subjectId: subs[2].id },
  ]);
  const replaced = await teacherWeek(asTeacher, klass.id);
  check("дахин хадгалахад бүтнээр солигдов", again === 1 && replaced.length === 1,
    replaced.length + " нүд");

  const studentView = await myWeek(s0);
  check("сурагч өөрийн хуваарийг харав", studentView.length === 1);
  const parentView = await childWeek(
    { userId: link.parentId, schoolId: school.id, role: "PARENT" },
    link.childId,
  );
  check("эцэг эх хүүхдийн хуваарийг харав", parentView.length === 1);
  await refuses("эцэг эх хамаагүй хүүхдийн хуваарь", () =>
    childWeek({ userId: link.parentId, schoolId: school.id, role: "PARENT" }, notMine),
  );

  console.log();
  console.log("25. Дараагийн хичээлтэй өдөр");
  const cells = [
    { dayOfWeek: 1, period: 1, subjectId: null, subjectName: "Монгол хэл", customName: null },
    { dayOfWeek: 3, period: 1, subjectId: null, subjectName: "Математик", customName: null },
  ];
  // Даваа гараг → дараагийнх нь Лхагва
  const fromMon = nextSchoolDay(cells, new Date("2026-09-21T02:00:00Z"));
  check("Даваагаас Лхагва руу", fromMon?.dayOfWeek === 3, fromMon?.label ?? "—");
  // Ням гараг → маргааш нь Даваа
  const fromSun = nextSchoolDay(cells, new Date("2026-09-20T02:00:00Z"));
  check("Нямаас маргааш Даваа", fromSun?.dayOfWeek === 1 && fromSun.label === "Маргааш",
    fromSun?.label ?? "—");
  check("хоосон хуваарьт юу ч буцаахгүй", nextSchoolDay([]) === null);

  console.log();
  console.log("26. Хоёр дүртэй хүний нэвтрэлт");
  // Сарантуяа багш бөгөөд нэг сурагчийн ээж — seed ингэж үүсгэдэг.
  const dual = await signIn("99110002", "2648");
  check(
    "багш дугаараараа орвол БАГШ дүрээр эхэлнэ",
    dual.ok && dual.role === "TEACHER",
    dual.ok ? dual.role : "нэвтэрсэнгүй",
  );

  const onlyParent = await signIn("99110101", "2648");
  check("зөвхөн эцэг эх бол эцэг эх хэвээр", onlyParent.ok && onlyParent.role === "PARENT",
    onlyParent.ok ? onlyParent.role : "нэвтэрсэнгүй");

  console.log();
  console.log("27. Эрхлэгч багш, анги удирдах");
  const phone = "9977" + String(Date.now()).slice(-4);
  const newT = await addTeacher(asManager, "  Шинэ   Багшаа  ", phone);
  check("нэр цэвэрлэгдэв", newT.name === "Шинэ Багшаа", newT.name);
  check("PIN олгогдов", !isWeakPin(newT.pin), newT.pin);

  const asNewT = await signIn(phone, newT.pin);
  check("шинэ багш нэвтэрлээ", asNewT.ok && asNewT.role === "TEACHER");
  if (!asNewT.ok) throw new Error("шинэ багш нэвтэрсэнгүй");

  const tList = await listTeachers(asManager);
  const me2 = tList.find((t) => t.id === asNewT.userId);
  check("жагсаалтад гарав", Boolean(me2));
  check("ангигүй гэж харагдав", me2?.classNames === "", me2?.classNames ?? "?");

  // Ангигүй багш даалгавар өгч ЧАДАХГҮЙ — энэ нь Zulzaga-гийн тулгарсан алдаа.
  const newTeacherViewer: Viewer = {
    userId: asNewT.userId,
    schoolId: school.id,
    role: "TEACHER",
  };
  await refuses("ангигүй багш даалгавар өгөх", () =>
    createHomework(newTeacherViewer, {
      classId: klass.id,
      subjectId: null,
      title: "Болохгүй",
      description: null,
      dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    }),
  );

  console.log();
  console.log("28. Ангид хуваарилах");
  // Тест давтан ажиллахад давхцахгүйн тулд нэр нь өвөрмөц.
  const tmpClassName = "T" + String(Date.now()).slice(-5);
  const newClassId = await createClass(asManager, tmpClassName, 5, currentAcademicYear());
  await assignTeacher(asManager, newClassId, asNewT.userId);

  const tList2 = await listTeachers(asManager);
  check("хуваарилсны дараа анги харагдав",
    tList2.find((t) => t.id === asNewT.userId)?.classNames === tmpClassName,
    tList2.find((t) => t.id === asNewT.userId)?.classNames ?? "?");

  // Одоо чадах ёстой.
  const hwId2 = await createHomework(newTeacherViewer, {
    classId: newClassId,
    subjectId: null,
    title: "Хуваарилсны дараа",
    description: null,
    dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
  });
  check("хуваарилсны дараа даалгавар өгч чадав", Boolean(hwId2));

  await unassignTeacher(asManager, newClassId, asNewT.userId);
  await refuses("хассаны дараа дахин чадахгүй", () =>
    createHomework(newTeacherViewer, {
      classId: newClassId,
      subjectId: null,
      title: "Дахиж болохгүй",
      description: null,
      dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    }),
  );

  await refuses("багш өөрөө багш нэмэх", () => addTeacher(asTeacher, "Хэн нэгэн", "99001122"));
  await refuses("багш анги үүсгэх", () =>
    createClass(asTeacher, "8Ю", 4, currentAcademicYear()),
  );
  await refuses("багш багш хуваарилах", () =>
    assignTeacher(asTeacher, newClassId, asNewT.userId),
  );

  const cList = await listClasses(asManager);
  check("ангийн жагсаалтад шинэ анги орсон", cList.some((c) => c.id === newClassId));
  check("хичээлийн жилийн формат", /^\d{4}-\d{4}$/.test(currentAcademicYear()),
    currentAcademicYear());

  console.log();
  console.log("29. Маргаашийн сануулга");
  // Маргааш дуусах даалгавар өгнө.
  const dueTomorrow = await createHomework(asTeacher, {
    classId: klass.id,
    subjectId: null,
    title: "Маргааш дуусна",
    description: null,
    dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
  });
  // Нэг сурагч хийчихнэ — түүнд сануулга очих ЁСГҮЙ.
  await markDone(s0, dueTomorrow);

  // Ангийн бодит бүрэлдэхүүнийг шууд уншина — тестийн эхэнд авсан жагсаалт
  // хуучирсан байж болно (22-р шалгалтад сурагч нэмэгдсэн).
  const rosterNow = await homeworkRoster(asTeacher, dueTomorrow);
  const notDone = rosterNow.rows.filter((r) => r.status === "ASSIGNED").length;

  const rem = await sendDueReminders();
  check(
    "хийгээгүй сурагчдад сануулга бэлдэв",
    rem.students === notDone,
    rem.students + " сануулга / " + notDone + " хийгээгүй",
  );
  check("хийсэн сурагч хасагдав", rem.students === rosterNow.rows.length - 1,
    rosterNow.rows.length + " сурагчаас 1 нь хийсэн");
  check("эцэг эхэд ч бэлдэв", rem.parents > 0, rem.parents + " эцэг эх");

  // Өнөөдөр дуусах даалгавар маргаашийн сануулгад ОРОХГҮЙ.
  await createHomework(asTeacher, {
    classId: klass.id,
    subjectId: null,
    title: "Өнөөдөр дуусна",
    description: null,
    dueAt: endOfDayUb(todayUb()),
  });
  // Хоёр дахь дуудалт — өдөрт нэг удаа гэсэн хамгаалалт ажиллах ёстой.
  const rem2 = await sendDueReminders();
  check(
    "өдөрт хоёр дахь удаа илгээхгүй",
    rem2.alreadySent === true && rem2.students === 0,
    rem2.alreadySent ? "давхардлаас сэргийлэв" : rem2.students + " илгээв",
  );

  // Маргааш болоход дахин илгээх ёстой.
  const tomorrowRun = await sendDueReminders(
    new Date(Date.now() + 24 * 3600 * 1000),
  );
  check(
    "маргааш дахин илгээх боломжтой",
    tomorrowRun.alreadySent !== true,
    tomorrowRun.alreadySent ? "буруу хаагдав" : "нээлттэй",
  );

  await deleteHomework(asTeacher, dueTomorrow);

  console.log();
  console.log("30. Зарлал");
  const parentViewer: Viewer = { userId: link.parentId, schoolId: school.id, role: "PARENT" };

  const forAll = await postAnnouncement(asTeacher, {
    classId: klass.id,
    body: "Маргааш 10:00 цагт хурал",
    audience: "ALL",
  });
  check("багш зарлал бичив", Boolean(forAll));

  await refuses("өөр ангийн багш зарлал бичих", () =>
    postAnnouncement(asTeacher2, { classId: klass.id, body: "Болохгүй", audience: "ALL" }),
  );
  await refuses("багш сургууль даяар зарлах", () =>
    postAnnouncement(asTeacher, { classId: null, body: "Болохгүй", audience: "ALL" }),
  );
  await refuses("хоосон зарлал", () =>
    postAnnouncement(asTeacher, { classId: klass.id, body: "   ", audience: "ALL" }),
  );

  const seenByStudent = await myAnnouncements(s0, 10);
  const seenByParent = await parentAnnouncements(parentViewer, 10);
  check("сурагч харав", seenByStudent.some((a) => a.id === forAll));
  check("эцэг эх харав", seenByParent.some((a) => a.id === forAll));

  console.log();
  console.log("31. «Хэнд» гэсэн шүүлт");
  const forParents = await postAnnouncement(asTeacher, {
    classId: klass.id,
    body: "Төлбөрийн тухай",
    audience: "PARENTS",
  });
  const forStudents = await postAnnouncement(asTeacher, {
    classId: klass.id,
    body: "Спортын хувцсаа авчир",
    audience: "STUDENTS",
  });

  const st2 = await myAnnouncements(s0, 10);
  const pa2 = await parentAnnouncements(parentViewer, 10);

  check("эцэг эхийн зарлал сурагчид ХАРАГДАХГҮЙ",
    !st2.some((a) => a.id === forParents));
  check("эцэг эхийн зарлал эцэг эхэд харагдав", pa2.some((a) => a.id === forParents));
  check("сурагчийн зарлал эцэг эхэд ХАРАГДАХГҮЙ",
    !pa2.some((a) => a.id === forStudents));
  check("сурагчийн зарлал сурагчид харагдав", st2.some((a) => a.id === forStudents));

  console.log();
  console.log("32. Зарлал устгах");
  await refuses("өөр хүний зарлал устгах", () => deleteAnnouncement(asTeacher2, forAll));
  await deleteAnnouncement(asTeacher, forAll);
  const left = await classAnnouncements(asTeacher, klass.id, 20);
  check("устсан", !left.some((a) => a.id === forAll));

  // Цэвэрлэнэ
  await deleteAnnouncement(asTeacher, forParents);
  await deleteAnnouncement(asTeacher, forStudents);

  console.log();
  console.log("33. Эрхлэгчийн сургууль даяарх зарлал");
  const schoolWide = await postAnnouncement(asManager, {
    classId: null,
    body: "Амралтын өдрийн хуваарь",
    audience: "ALL",
  });
  const st3 = await myAnnouncements(s0, 10);
  check("сургууль даяарх зарлал сурагчид хүрэв", st3.some((a) => a.id === schoolWide));
  await deleteAnnouncement(asManager, schoolWide);

  console.log();
  console.log("34. Дэвтрийн зураг");
  // 1x1 PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  const hwPhoto = await createHomework(asTeacher, {
    classId: klass.id,
    subjectId: null,
    title: "Зурагтай даалгавар",
    description: null,
    dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
  });

  const shot = await saveImage(s0, new Uint8Array(png), "image/png");
  check("зураг хадгалагдав", Boolean(shot.id) && shot.sizeBytes === png.length,
    shot.sizeBytes + " байт");

  await refuses("зураг биш файл", () =>
    saveImage(s0, new Uint8Array([1, 2, 3]), "application/pdf"),
  );
  await refuses("хоосон файл", () => saveImage(s0, new Uint8Array(0), "image/png"));

  await attachToSubmission(s0, hwPhoto, shot.id);
  const attached = await myAttachments(s0, hwPhoto);
  check("даалгаварт хавсрагдав", attached.includes(shot.id));

  // Зураг илгээхэд автоматаар «хийсэн» болно — хүүхэд хоёр үйлдэл хийхгүй.
  const afterUpload = (await myHomework(s0)).find((h) => h.id === hwPhoto);
  check("зураг илгээхэд хийсэн болов", afterUpload?.status === "DONE",
    afterUpload?.status ?? "?");

  console.log();
  console.log("35. Зураг харах эрх");
  const byOwner = await readFileFor(s0, shot.id);
  check("эзэн нь харав", byOwner.bytes.length === png.length);

  const teacherSees = await readFileFor(asTeacher, shot.id);
  check("ангийн багш харав", teacherSees.bytes.length === png.length);

  await refuses("өөр ангийн багш харах", () => readFileFor(asTeacher2, shot.id));
  await refuses("хамаагүй сурагч харах", () => readFileFor(s1, shot.id));
  await refuses("эрхлэгч харах", () => readFileFor(asManager, shot.id));

  const parentOfOwner = await db
    .select({ id: guardians.parentUserId })
    .from(guardians)
    .where(and(eq(guardians.studentUserId, students[0].id), eq(guardians.status, "ACTIVE")))
    .limit(1);
  if (parentOfOwner.length > 0) {
    const pv: Viewer = { userId: parentOfOwner[0].id, schoolId: school.id, role: "PARENT" };
    const seen = await readFileFor(pv, shot.id);
    check("эцэг эх нь харав", seen.bytes.length === png.length);
  }

  await deleteFile(shot.id);
  await deleteHomework(asTeacher, hwPhoto);

  console.log();
  console.log("36. Сургууль хоорондын хана");
  // Хоёр дахь сургууль, өөрийн эрхлэгчтэй.
  const slugB = "tenant-b-" + String(Date.now()).slice(-6);
  const [schoolB] = await db
    .insert(schools)
    .values({ name: "Өөр сургууль", slug: slugB })
    .returning({ id: schools.id });
  const [mgrB] = await db
    .insert(users)
    .values({ name: "Өөр Эрхлэгч" })
    .returning({ id: users.id });
  await db.insert(memberships).values({
    userId: mgrB.id,
    schoolId: schoolB.id,
    role: "ACADEMIC_MANAGER",
  });
  const asMgrB: Viewer = { userId: mgrB.id, schoolId: schoolB.id, role: "ACADEMIC_MANAGER" };

  const ovB = await schoolOverview(asMgrB);
  check("өөр сургуулийн тойм хоосон", ovB.teachers === 0 && ovB.students === 0,
    ovB.teachers + " багш, " + ovB.students + " сурагч");
  check("өөр сургуулийн багш харагдахгүй", (await listTeachers(asMgrB)).length === 0);
  check("өөр сургуулийн анги харагдахгүй", (await listClasses(asMgrB)).length === 0);

  await refuses("өөр сургуулийн ангид багш хуваарилах", () =>
    assignTeacher(asMgrB, klass.id, teacher.id),
  );
  await refuses("өөр сургуулийн ангид сурагч нэмэх", () =>
    addStudent(asMgrB, klass.id, "Халдагч Хүүхэд"),
  );
  await refuses("өөр сургуулийн ангид зарлал бичих", () =>
    postAnnouncement(asMgrB, { classId: klass.id, body: "Халдлага", audience: "ALL" }),
  );
  await refuses("өөр сургуулийн багшийн PIN шинэчлэх", () =>
    resetTeacherPin(asMgrB, teacher.id),
  );

  // Хүүхдийн зураг — хамгийн эмзэг зүйл.
  const hwX = await createHomework(asTeacher, {
    classId: klass.id,
    subjectId: null,
    title: "Хана шалгах",
    description: null,
    dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
  });
  const shotX = await saveImage(s0, new Uint8Array(png), "image/png");
  await attachToSubmission(s0, hwX, shotX.id);
  await refuses("өөр сургуулийн эрхлэгч хүүхдийн зураг харах", () =>
    readFileFor(asMgrB, shotX.id),
  );
  await deleteFile(shotX.id);
  await deleteHomework(asTeacher, hwX);
  await db.delete(schools).where(eq(schools.id, schoolB.id));

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} зөв, ${failed} алдаа\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
