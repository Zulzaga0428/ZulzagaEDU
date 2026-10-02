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
  homework as homeworkTable,
  leads,
  notifications,
  pointsLedger,
  studentAvatars,
  teacherIncentives,
  threads,
  guardians,
  memberships,
  schools,
  subjects,
  users,
} from "../src/server/db/schema";
import type { Viewer } from "../src/server/auth/access";
import {
  checkAllDone,
  checkSubmission,
  childHomework,
  deleteHomework,
  createHomework,
  homeworkForEdit,
  homeworkRoster,
  listClassHomework,
  markDone,
  myChildren,
  myHomework,
  strugglingStudents,
  undoDone,
  updateHomework,
} from "../src/server/homework/service";
import { endOfDayUb, todayUb, addDaysUb } from "../src/server/homework/time";
import { groupByDue, parentHeadline, studentHeadline } from "../src/server/homework/grouping";
import { schoolOverview } from "../src/server/school/overview";
import {
  notifyGuardianPending,
  notifyThreadMessage,
  sendDueReminders,
} from "../src/server/notify/push";
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
import { devAccountExists, listDevAccounts } from "../src/server/auth/dev-login";
import { adminSecret, secretMatches } from "../src/server/admin/session";
import { createSchoolWithManager, listSchools } from "../src/server/admin/service";
import {
  listLeads,
  markLeadHandled,
  submitLead,
  unhandledLeadCount,
} from "../src/server/leads/service";
import {
  acceptParentInvite,
  createParentInvite,
  decideGuardian,
  pendingGuardians,
  readInvite,
  myPendingLinks,
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
import {
  awardForHomework,
  childPoints,
  isComingBack,
  myHistory,
  myPoints,
} from "../src/server/points/service";
import {
  avatarCatalog,
  buyAvatar,
  selectAvatar,
  selectedAvatar,
} from "../src/server/points/avatars";
import type { StudentHomeworkRow } from "../src/server/homework/service";
import { myProfile, changeOwnPin } from "../src/server/profile/service";
import { attachToHomework, homeworkFiles } from "../src/server/files/storage";
import {
  openThread,
  parentThreads,
  sendMessage,
  startThreadForChild,
  teacherThreads,
  unreadCount,
} from "../src/server/thread/service";
import {
  cancelIncentive,
  enrollTeacher,
  markPaid,
  myIncentive,
  schoolIncentives,
} from "../src/server/incentive/service";

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
    boardPhotos: [],
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

  console.log();
  console.log("38. Багшийн самбарын зураг");
  {
    const hwB = await createHomework(asTeacher, {
      classId: klass.id,
      subjectId: null,
      title: "Самбар шалгах",
      description: null,
      dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    });

    const board = await saveImage(asTeacher, new Uint8Array(png), "image/png");
    await attachToHomework(asTeacher, hwB, board.id);
    check("зураг хавсрав", (await homeworkFiles(hwB)).includes(board.id));

    // Ангийн БҮХ хүн харна — энэ нь хүүхдийн дэвтрийн зурагтай ЭСРЭГ дүрэм.
    check("багш өөрөө харав", (await readFileFor(asTeacher, board.id)).bytes.length > 0);
    check("ангийн сурагч харав", (await readFileFor(s0, board.id)).bytes.length > 0);
    check("өөр сурагч ч харав", (await readFileFor(s1, board.id)).bytes.length > 0);
    check("эцэг эх харав", (await readFileFor(parent, board.id)).bytes.length > 0);

    // Харин эрхлэгч ангийн агуулга харахгүй — PERMISSIONS-ийн шугам хэвээр.
    await refuses("эрхлэгч самбарын зураг харах", () => readFileFor(asManager, board.id));
    await refuses("өөр ангийн багш самбарын зураг харах", () =>
      readFileFor(asTeacher2, board.id),
    );

    // Сурагч, эцэг эх зураг хавсаргах гарц байх ёсгүй.
    await refuses("сурагч самбарын зураг хавсаргах", () =>
      attachToHomework(s0, hwB, board.id),
    );
    await refuses("эцэг эх самбарын зураг хавсаргах", () =>
      attachToHomework(parent, hwB, board.id),
    );
    await refuses("ангийн бус багш зураг хавсаргах", () =>
      attachToHomework(asTeacher2, hwB, board.id),
    );

    // Сурагчийн жагсаалтад зураг хүрч байгаа эсэх — гол үнэ цэн тэнд.
    const mine = (await myHomework(s0)).find((h) => h.id === hwB);
    check("сурагчийн жагсаалтад зураг ирэв", mine?.boardPhotos.includes(board.id) === true);
    const forParent = (await childHomework(parent, link.childId)).find((h) => h.id === hwB);
    check("эцэг эхийн жагсаалтад зураг ирэв", forParent?.boardPhotos.includes(board.id) === true);

    const noPhoto = (await myHomework(s0)).find((h) => h.id !== hwB);
    check("зураггүй даалгаварт хоосон массив", Array.isArray(noPhoto?.boardPhotos));

    await deleteHomework(asTeacher, hwB);
    await deleteFile(board.id);
  }

  console.log();
  console.log("39. Багшийн пилотын хөлс");
  {
    // Эрхлэгч бүртгэх хүртэл багш юу ч харахгүй — бүх багшид мөнгө амлахгүй.
    check("бүртгээгүй багш карт харахгүй", (await myIncentive(asTeacher)) === null);

    await enrollTeacher(asManager, teacher.id);
    const mine = await myIncentive(asTeacher);
    check("бүртгэсний дараа карт гарав", mine?.amountMnt === 50000, mine?.amountMnt + "₮");
    check("төлөв нь хүлээгдэж байна", mine?.status === "PENDING");
    check("сарын шошго зөв", /сар$/.test(mine?.periodLabel ?? ""), mine?.periodLabel);

    // Өөр багш бүртгэгдээгүй тул түүнд юу ч харагдахгүй.
    check("хөрш багш карт харахгүй", (await myIncentive(asTeacher2)) === null);

    const list = await schoolIncentives(asManager);
    check("эрхлэгчийн жагсаалтад орлоо", list.some((i) => i.teacherUserId === teacher.id));

    const row = list.find((i) => i.teacherUserId === teacher.id)!;
    await markPaid(asManager, row.id);
    check("олгосон гэж тэмдэглэв", (await myIncentive(asTeacher))?.status === "PAID");
    check("олгосон огноо бичигдэв", (await myIncentive(asTeacher))?.paidAt instanceof Date);

    // Багш өөрөө өөрийгөө бүртгэх, олгосон гэж тэмдэглэх гарц байх ёсгүй.
    await refuses("багш өөрийгөө бүртгэх", () => enrollTeacher(asTeacher, teacher.id));
    await refuses("багш олгосон гэж тэмдэглэх", () => markPaid(asTeacher, row.id));
    await refuses("багш жагсаалт харах", () => schoolIncentives(asTeacher));
    await refuses("эцэг эх жагсаалт харах", () => schoolIncentives(parent));
    await refuses("сурагч жагсаалт харах", () => schoolIncentives(s0));

    // Хүүхэд, эцэг эх мөнгөний тухай юу ч харахгүй.
    check("сурагчид хөлс харагдахгүй", (await myIncentive(s0)) === null);
    check("эцэг эхэд хөлс харагдахгүй", (await myIncentive(parent)) === null);

    // Цуцалсан мөр багшийн картаас алга болно.
    await cancelIncentive(asManager, row.id);
    check("цуцлахад карт алга болов", (await myIncentive(asTeacher)) === null);

    // Дахин бүртгэвэл сэргэнэ, давхар мөр үүсэхгүй.
    await enrollTeacher(asManager, teacher.id, 70000);
    const again = await schoolIncentives(asManager);
    check(
      "давхар мөр үүсээгүй",
      again.filter((i) => i.teacherUserId === teacher.id).length === 1,
    );
    check("дүн шинэчлэгдэв", (await myIncentive(asTeacher))?.amountMnt === 70000);

    await db.delete(teacherIncentives).where(eq(teacherIncentives.teacherUserId, teacher.id));
  }

  console.log();
  console.log("40. Багш ↔ эцэг эхийн яриа");
  {
    const tid = await startThreadForChild(asTeacher, link.childId);
    check("багш яриа эхлүүлэв", typeof tid === "string" && tid.length > 0);

    // Хоёр дахь удаа дуудахад ШИНЭ яриа үүсэхгүй — нэг хүүхэдэд нэг яриа.
    const again = await startThreadForChild(parent, link.childId);
    check("давхар яриа үүсэхгүй", again === tid);

    await sendMessage(asTeacher, tid, "Сайн байна уу. Болд өнөөдөр сайн ажиллалаа.");
    await sendMessage(parent, tid, "Баярлалаа багш аа.");

    const view = await openThread(parent, tid);
    check("хоёр мессеж харагдав", view.messages.length === 2, view.messages.length + " мессеж");
    check("хүүхдийн нэр гарав", view.studentName.length > 0, view.studentName);
    check("өөрийн мессежийг таньж байна", view.messages[1].mine === true);
    check("багшийн мессеж өөрийнх биш", view.messages[0].mine === false);

    // ⚠️ Хамгийн чухал шалгалт: ХҮҮХЭД оролцохгүй.
    await refuses("сурагч яриа нээх", () => openThread(s0, tid));
    await refuses("сурагч мессеж бичих", () => sendMessage(s0, tid, "Сайн уу"));
    await refuses("сурагч яриа эхлүүлэх", () => startThreadForChild(s0, link.childId));

    // Эрхлэгч ч орохгүй — ангийн агуулга хардаггүй.
    await refuses("эрхлэгч яриа нээх", () => openThread(asManager, tid));

    // Өөр ангийн багш, өөр хүүхдийн эцэг эх орохгүй.
    await refuses("ангийн бус багш яриа нээх", () => openThread(asTeacher2, tid));
    const notMyChild = students.find((st) => st.id !== link.childId)!;
    await refuses("эцэг эх өөр хүүхдийн яриа эхлүүлэх", () =>
      startThreadForChild(parent, notMyChild.id),
    );

    // Хоосон, хэт урт мессеж.
    await refuses("хоосон мессеж", () => sendMessage(parent, tid, "   "));
    await refuses("хэт урт мессеж", () => sendMessage(parent, tid, "a".repeat(2001)));

    // Уншаагүйн тоо: өөрийн бичсэн нь ОРОХГҮЙ.
    await sendMessage(asTeacher, tid, "Маргааш дэвтрээ авчраарай.");
    const forParent = (await parentThreads(parent)).find((t) => t.id === tid);
    check("эцэг эхэд 1 уншаагүй", forParent?.unread === 1, forParent?.unread + " уншаагүй");
    const forTeacher = (await teacherThreads(asTeacher)).find((t) => t.id === tid);
    check("багшид өөрийн мессеж уншаагүй болоогүй", forTeacher?.unread === 0);

    await openThread(parent, tid);
    const after = (await parentThreads(parent)).find((t) => t.id === tid);
    check("нээсний дараа 0 болов", after?.unread === 0);
    check("сүүлийн мессеж харагдав", after?.preview?.includes("дэвтрээ") === true);

    check("багшийн жагсаалтад орлоо", (await teacherThreads(asTeacher)).some((t) => t.id === tid));
    check("ангийн бус багшид харагдахгүй", !(await teacherThreads(asTeacher2)).some((t) => t.id === tid));
    await refuses("сурагч жагсаалт харах", () => teacherThreads(s0));
    await refuses("сурагч эцэг эхийн жагсаалт харах", () => parentThreads(s0));
    check("сурагчид уншаагүй тоо 0", (await unreadCount(s0)) === 0);

    await db.delete(threads).where(eq(threads.id, tid));
  }

  console.log();
  console.log("41. Багш руу чиглэсэн мэдэгдэл");
  {
    // Багш өмнө нь ЯМАР Ч мэдэгдэл авдаггүй байсан — бүгд сурагч/эцэг эх рүү явдаг байв.
    await db.delete(notifications).where(eq(notifications.userId, teacher.id));

    const g = await notifyGuardianPending({
      schoolId: school.id,
      classId: klass.id,
      studentName: "Шалгалтын Сурагч",
      parentName: "Шалгалтын Эцэг",
    });
    check("нэгдэх хүсэлт багшид очив", g.recipients >= 1, g.recipients + " багш");

    const rows = await db
      .select({ kind: notifications.kind })
      .from(notifications)
      .where(and(eq(notifications.userId, teacher.id), eq(notifications.kind, "GUARDIAN_PENDING")));
    check("мөр бичигдэв", rows.length === 1);

    // Ярианы мэдэгдэл — бичсэн хүн өөрөө авахгүй.
    const tid2 = await startThreadForChild(asTeacher, link.childId);
    const sent = await sendMessage(parent, tid2, "Болд өнөөдөр ирэхгүй.");
    const n = await notifyThreadMessage({
      schoolId: school.id,
      threadId: sent.threadId,
      classId: sent.classId,
      studentUserId: sent.studentUserId,
      studentName: sent.studentName,
      authorUserId: parent.userId,
      preview: sent.preview,
    });
    check("ярианы мэдэгдэл явав", n.recipients >= 1, n.recipients + " хүн");

    const mine = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, parent.userId), eq(notifications.kind, "THREAD_MESSAGE")));
    check("бичсэн эцэг эх өөртөө мэдэгдэл авахгүй", mine.length === 0);

    const toTeacher = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, teacher.id), eq(notifications.kind, "THREAD_MESSAGE")));
    check("багшид ярианы мөр бичигдэв", toTeacher.length === 1);

    // ⚠️ Хязгаар: хоёр дахь мессежийн мөр БИЧИГДЭНЭ, зөвхөн түлхэлт дарагдана.
    const sent2 = await sendMessage(parent, tid2, "Хоёр дахь мессеж.");
    await notifyThreadMessage({
      schoolId: school.id,
      threadId: sent2.threadId,
      classId: sent2.classId,
      studentUserId: sent2.studentUserId,
      studentName: sent2.studentName,
      authorUserId: parent.userId,
      preview: sent2.preview,
    });
    const after = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, teacher.id), eq(notifications.kind, "THREAD_MESSAGE")));
    check("хязгаар мөр бичихийг зогсоохгүй", after.length === 2, after.length + " мөр");

    await db.delete(threads).where(eq(threads.id, tid2));
    await db.delete(notifications).where(eq(notifications.userId, teacher.id));
  }

  console.log();
  console.log("42. Даалгавар засах");
  {
    const hwE = await createHomework(asTeacher, {
      classId: klass.id,
      subjectId: null,
      title: "Буруу бичсэн гарчиг",
      description: null,
      dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    });

    // Хоёр сурагч хийчихсэн байя — засахад ЭДГЭЭР АЛДАГДАХ ЁСГҮЙ.
    await markDone(s0, hwE);
    await markDone(s1, hwE);
    const before = await homeworkRoster(asTeacher, hwE);
    const doneBefore = before.rows.filter((r) => r.status !== "ASSIGNED").length;
    check("засахын өмнө 2 хүн хийсэн", doneBefore === 2, doneBefore + " хийсэн");

    await updateHomework(asTeacher, hwE, {
      title: "Зөв гарчиг",
      description: "Нэмэлт заавар.",
      subjectId: null,
      dueAt: endOfDayUb(addDaysUb(todayUb(), 2)),
    });

    const after = await homeworkRoster(asTeacher, hwE);
    check("гарчиг солигдов", after.title === "Зөв гарчиг", after.title);
    check(
      "ХИЙСЭН ТЭМДЭГ ХЭВЭЭР",
      after.rows.filter((r) => r.status !== "ASSIGNED").length === 2,
    );
    check("сурагчийн тоо хэвээр", after.rows.length === before.rows.length);

    const forStudent = (await myHomework(s0)).find((h) => h.id === hwE);
    check("сурагч шинэ гарчгийг харав", forStudent?.title === "Зөв гарчиг");

    await refuses("хоосон гарчгаар засах", () =>
      updateHomework(asTeacher, hwE, {
        title: "   ",
        description: null,
        subjectId: null,
        dueAt: endOfDayUb(todayUb()),
      }),
    );
    await refuses("өөр багш засах", () =>
      updateHomework(asTeacher2, hwE, {
        title: "Халдлага",
        description: null,
        subjectId: null,
        dueAt: endOfDayUb(todayUb()),
      }),
    );
    await refuses("сурагч засах", () =>
      updateHomework(s0, hwE, {
        title: "Халдлага",
        description: null,
        subjectId: null,
        dueAt: endOfDayUb(todayUb()),
      }),
    );
    await refuses("өөр багш засах маягтыг нээх", () => homeworkForEdit(asTeacher2, hwE));
    check("эзэн нь засах маягтыг нээв", (await homeworkForEdit(asTeacher, hwE)).title === "Зөв гарчиг");

    await deleteHomework(asTeacher, hwE);
  }

  console.log();
  console.log("43. Дэмжлэг хэрэгтэй хүүхэд");
  {
    // Цэвэр талбар — өмнөх хэсгүүдийн даалгаврууд саад болохгүйн тулд.
    await db.delete(homeworkTable).where(eq(homeworkTable.classId, klass.id));

    check("даалгавар цөөн үед хоосон", (await strugglingStudents(asTeacher, klass.id)).length === 0);

    // 4 даалгавар өгье. s0 нэгийг нь хийнэ, s1 бүгдийг хийнэ.
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      ids.push(
        await createHomework(asTeacher, {
          classId: klass.id,
          subjectId: null,
          title: `Хэв шинж ${i + 1}`,
          description: null,
          dueAt: endOfDayUb(addDaysUb(todayUb(), i + 1)),
        }),
      );
    }
    await markDone(s0, ids[0]);
    for (const id of ids) await markDone(s1, id);

    const list = await strugglingStudents(asTeacher, klass.id);

    // Хязгааргүйгээр — бүх хүүхдийн тоог шалгахад.
    const all = await strugglingStudents(asTeacher, klass.id, { limit: 100 });
    const forS0 = all.find((x) => x.studentUserId === students[0].id);
    check("бага хийсэн хүүхэд гарав", forS0 !== undefined, forS0?.done + "/" + forS0?.total);
    check("тоо зөв", forS0?.done === 1 && forS0?.total === 4);
    check(
      "огт хийгээгүй нь 1 хийснээсээ ӨМНӨ",
      all.findIndex((x) => x.done === 0) < all.findIndex((x) => x.studentUserId === students[0].id),
    );
    check(
      "бүгдийг хийсэн хүүхэд ГАРАХГҮЙ",
      !all.some((x) => x.studentUserId === students[1].id),
    );
    check("жагсаалт 5-аар хязгаарлагдав", list.length <= 5, list.length + " хүн");
    check(
      "хамгийн бага хийсэн нь эхэнд",
      list.length < 2 || list[0].done / list[0].total <= list[1].done / list[1].total,
    );

    await refuses("өөр ангийн багш харах", () => strugglingStudents(asTeacher2, klass.id));
    await refuses("эцэг эх харах", () => strugglingStudents(parent, klass.id));
    await refuses("сурагч харах", () => strugglingStudents(s0, klass.id));
    await refuses("эрхлэгч харах", () => strugglingStudents(asManager, klass.id));

    for (const id of ids) await deleteHomework(asTeacher, id);
  }

  console.log();
  console.log("44. Сурагч андуурч дарсныг буцаах");
  {
    const hwU = await createHomework(asTeacher, {
      classId: klass.id,
      subjectId: null,
      title: "Буцаах шалгалт",
      description: null,
      dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    });

    await markDone(s0, hwU);
    check("хийсэн гэж тэмдэглэв", (await myHomework(s0)).find((h) => h.id === hwU)?.status === "DONE");

    await undoDone(s0, hwU);
    const back = (await myHomework(s0)).find((h) => h.id === hwU);
    check("буцаагдав", back?.status === "ASSIGNED", back?.status);

    // Багшийн тоолол ч буцах ёстой — эс бөгөөс тоо худал үлдэнэ.
    const roster = await homeworkRoster(asTeacher, hwU);
    const row = roster.rows.find((r) => r.studentUserId === students[0].id);
    check("багшийн жагсаалтад хийгээгүй болов", row?.status === "ASSIGNED");

    // Хийгээгүй зүйлийг буцаах боломжгүй.
    await refuses("хийгээгүйг буцаах", () => undoDone(s0, hwU));

    // Багш шалгасны дараа буцаахгүй.
    await markDone(s0, hwU);
    const r2 = await homeworkRoster(asTeacher, hwU);
    const subId = r2.rows.find((r) => r.studentUserId === students[0].id)!.submissionId;
    await checkSubmission(asTeacher, hwU, subId, "Сайн.");
    await refuses("багш шалгасныг буцаах", () => undoDone(s0, hwU));

    // Өөр хүний ажлыг буцаахгүй.
    await markDone(s1, hwU);
    await refuses("багш өөрөө буцаах", () => undoDone(asTeacher, hwU));
    await refuses("эцэг эх буцаах", () => undoDone(parent, hwU));

    // Зураг илгээсэн бол буцаахгүй — зураг нь баталгаа.
    const hwP = await createHomework(asTeacher, {
      classId: klass.id,
      subjectId: null,
      title: "Зурагтай буцаах шалгалт",
      description: null,
      dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    });
    const shotU = await saveImage(s0, new Uint8Array(png), "image/png");
    await attachToSubmission(s0, hwP, shotU.id);
    await refuses("зураг илгээснийг буцаах", () => undoDone(s0, hwP));

    await deleteFile(shotU.id);
    await deleteHomework(asTeacher, hwP);
    await deleteHomework(asTeacher, hwU);
  }

  console.log();
  console.log("45. Батлагдаагүй эцэг эхийн дэлгэц");
  {
    // Шинэ эцэг эх урилгаар нэгдээд, багш хараахан батлаагүй байдал.
    const inv2 = await createParentInvite(asTeacher, klass.id, students[2].id);
    const acc2 = await acceptParentInvite(inv2.token, {
      name: "Хүлээгч Эцэг",
      phone: "99119911",
      pin: "7351",
      relation: "MOTHER",
    });
    check("урилга хүлээн авав", acc2.ok === true);
    if (!acc2.ok) throw new Error("урилга бүтсэнгүй");

    const waiting: Viewer = {
      userId: acc2.userId,
      schoolId: school.id,
      role: "PARENT",
    };

    check("хүүхэд хараахан харагдахгүй", (await myChildren(waiting)).length === 0);
    const links = await myPendingLinks(waiting);
    check("хүлээгдэж буй хүсэлт харагдав", links.length === 1, links[0]?.studentName);
    check("хүүхдийн нэр зөв", links[0]?.studentName === students[2].name);

    // Багш батласны дараа хүсэлт жагсаалтаас гарна.
    const pend = await pendingGuardians(asTeacher, klass.id);
    const mine = pend.find((p) => p.studentName === students[2].name);
    check("багшид хүсэлт харагдав", mine !== undefined);
    const decided = await decideGuardian(asTeacher, mine!.id, "ACTIVE");
    check("батлахад хүүхдийн нэр буцав", decided.studentName === students[2].name);
    check("батлагдсан гэж буцав", decided.approved === true);
    check("батласны дараа хүлээлт хоосон", (await myPendingLinks(waiting)).length === 0);
    check("батласны дараа хүүхэд харагдав", (await myChildren(waiting)).length === 1);

    // Багш, сурагч энэ жагсаалтыг хэзээ ч харахгүй.
    check("багшид хүлээлтийн жагсаалт хоосон", (await myPendingLinks(asTeacher)).length === 0);
    check("сурагчид хүлээлтийн жагсаалт хоосон", (await myPendingLinks(s0)).length === 0);

    await db.delete(guardians).where(eq(guardians.parentUserId, acc2.userId));
    await db.delete(memberships).where(eq(memberships.userId, acc2.userId));
    await db.delete(credentialsTable).where(eq(credentialsTable.userId, acc2.userId));
    await db.delete(notifications).where(eq(notifications.userId, acc2.userId));
    await db.delete(users).where(eq(users.id, acc2.userId));
  }

  console.log();
  console.log("46. Урамшууллын оноо");
  {
    process.env.POINTS_ENABLED = "1";
    await db.delete(pointsLedger).where(eq(pointsLedger.userId, students[0].id));

    const hwP1 = await createHomework(asTeacher, {
      classId: klass.id, subjectId: null, title: "Оноо 1",
      description: null, dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    });

    check("эхлэхэд 0 оноо", (await myPoints(s0)) === 0);
    await markDone(s0, hwP1);
    await awardForHomework(s0, hwP1, "HOMEWORK_DONE");
    check("хийхэд оноо нэмэгдэв", (await myPoints(s0)) === 10, (await myPoints(s0)) + " оноо");

    // Давхар олгохгүй — «буцаах → дахин хийх» гэж тармуулах гарц хаалттай.
    await awardForHomework(s0, hwP1, "HOMEWORK_DONE");
    check("давхар оноо өгөхгүй", (await myPoints(s0)) === 10);

    // Зураг нь нэмэлт — гэхдээ ХҮҮХДИЙН үйлдэл.
    await awardForHomework(s0, hwP1, "PHOTO");
    check("зурагт нэмэлт оноо", (await myPoints(s0)) === 15);

    // ⚠️ ХАМГИЙН ЧУХАЛ: багш шалгасан нь оноонд НӨЛӨӨЛӨХГҮЙ.
    const rp = await homeworkRoster(asTeacher, hwP1);
    const sid = rp.rows.find((r) => r.studentUserId === students[0].id)!.submissionId;
    await checkSubmission(asTeacher, hwP1, sid, "Сайн байна.");
    check("багш шалгахад оноо ӨӨРЧЛӨГДӨХГҮЙ", (await myPoints(s0)) === 15);

    // Хугацаа хэтэрсэнд оноо байхгүй — хуучныг дарж тармуулахаас сэргийлнэ.
    const hwOld = await createHomework(asTeacher, {
      classId: klass.id, subjectId: null, title: "Хугацаа өнгөрсөн",
      description: null, dueAt: endOfDayUb(addDaysUb(todayUb(), -3)),
    });
    await awardForHomework(s0, hwOld, "HOMEWORK_DONE");
    check("хугацаа хэтэрсэнд оноо алга", (await myPoints(s0)) === 15);

    // Багш, эцэг эх оноо цуглуулахгүй.
    await awardForHomework(asTeacher, hwP1, "HOMEWORK_DONE");
    check("багш оноо цуглуулахгүй", (await myPoints(asTeacher)) === 0);

    // Эцэг эх өөрийн хүүхдийнхээ оноог харна, өөр хүүхдийнхийг ҮГҮЙ.
    check("эцэг эх хүүхдийнхээ оноог харав", (await childPoints(parent, link.childId)) >= 0);
    const notMine2 = students.find((x) => x.id !== link.childId)!;
    await refuses("эцэг эх өөр хүүхдийн оноо харах", () => childPoints(parent, notMine2.id));
    await refuses("багш childPoints дуудах", () => childPoints(asTeacher, link.childId));

    const hist = await myHistory(s0);
    check("түүх бичигдэв", hist.length === 2, hist.length + " мөр");

    // ⚠️ Туг унтраахад оноо олгохоо болино.
    process.env.POINTS_ENABLED = "0";
    const hwP2 = await createHomework(asTeacher, {
      classId: klass.id, subjectId: null, title: "Оноо 2",
      description: null, dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    });
    await awardForHomework(s0, hwP2, "HOMEWORK_DONE");
    check("туг унтраалттай үед оноо өгөхгүй", (await myPoints(s0)) === 15);

    await db.delete(pointsLedger).where(eq(pointsLedger.userId, students[0].id));
    await deleteHomework(asTeacher, hwP2);
    await deleteHomework(asTeacher, hwOld);
    await deleteHomework(asTeacher, hwP1);
  }

  console.log();
  console.log("47. Аватар — оноогоор нээх");
  {
    process.env.POINTS_ENABLED = "1";
    await db.delete(studentAvatars).where(eq(studentAvatars.userId, students[0].id));
    await db.delete(pointsLedger).where(eq(pointsLedger.userId, students[0].id));

    const cat0 = await avatarCatalog(s0);
    check("каталог 8 аватартай", cat0.length === 8, cat0.length + " аватар");
    check("үнэгүй нь эзэмшсэн", cat0[0].owned === true && cat0[0].cost === 0);
    check("үнэгүй нь анхнаасаа сонгогдсон", cat0[0].selected === true);
    check("үнэтэй нь хаалттай", cat0[1].owned === false);
    check("оноогүй үед авах боломжгүй", cat0[1].affordable === false);

    // Оноо цуглуулъя — 4 даалгавар × 10.
    const hwIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const id = await createHomework(asTeacher, {
        classId: klass.id, subjectId: null, title: `Аватар ${i}`,
        description: null, dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
      });
      hwIds.push(id);
      await awardForHomework(s0, id, "HOMEWORK_DONE");
    }
    check("40 оноо цуглав", (await myPoints(s0)) === 40);

    await refuses("оноо хүрэхгүй үед авах", () => buyAvatar(s0, "honi"));

    await buyAvatar(s0, "nohoi");
    check("аватар нээгдэв", (await myPoints(s0)) === 10, (await myPoints(s0)) + " оноо үлдэв");
    const cat1 = await avatarCatalog(s0);
    check("эзэмшсэн болов", cat1.find((a) => a.id === "nohoi")?.owned === true);

    await refuses("нэг аватарыг хоёр удаа авах", () => buyAvatar(s0, "nohoi"));

    // ⚠️ Үнэгүй аватарыг «худалдаж авах» гэж оноо хасуулах гарц байхгүй.
    await refuses("үнэгүй аватарыг худалдах", () => buyAvatar(s0, "muur"));
    await refuses("байхгүй аватар авах", () => buyAvatar(s0, "luu"));

    // Сонгох — зөвхөн нээсэн зүйлээ.
    await selectAvatar(s0, "nohoi");
    check("сонгогдов", (await selectedAvatar(students[0].id)) === "nohoi");
    await refuses("нээгээгүй аватар сонгох", () => selectAvatar(s0, "burged"));
    check("үнэгүй рүү буцаж сонгож болно", await selectAvatar(s0, "muur").then(() => true));
    check("нэг л идэвхтэй", (await selectedAvatar(students[0].id)) === "muur");

    // Багш, эцэг эх аватар авахгүй.
    await refuses("багш аватар авах", () => buyAvatar(asTeacher, "nohoi"));
    await refuses("эцэг эх каталог харах", () => avatarCatalog(parent));

    // Туг унтраалттай бол худалдаж авахгүй.
    process.env.POINTS_ENABLED = "0";
    await refuses("туг унтраалттай үед авах", () => buyAvatar(s0, "honi"));

    await db.delete(studentAvatars).where(eq(studentAvatars.userId, students[0].id));
    await db.delete(pointsLedger).where(eq(pointsLedger.userId, students[0].id));
    for (const id of hwIds) await deleteHomework(asTeacher, id);
  }

  console.log();
  console.log("48. Эргэж ирсэн хүүхдийн оноо");
  {
    process.env.POINTS_ENABLED = "1";
    await db.delete(pointsLedger).where(eq(pointsLedger.userId, students[0].id));

    // Анх удаа хийж байгаа хүүхэд «эргэж ирсэн» биш — зүгээр эхэлж байна.
    check("анхны удаа эргэж ирсэн биш", (await isComingBack(s0)) === false);

    const hwC1 = await createHomework(asTeacher, {
      classId: klass.id, subjectId: null, title: "Эргэх 1",
      description: null, dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    });
    await awardForHomework(s0, hwC1, "HOMEWORK_DONE");
    check("саяхан хийсэн бол эргэж ирсэн биш", (await isComingBack(s0)) === false);

    // Сүүлийн мөрийг 3 хоногийн өмнөх болгож завсарлалт үүсгэе.
    await db
      .update(pointsLedger)
      .set({ createdAt: new Date(Date.now() - 3 * 86_400_000) })
      .where(eq(pointsLedger.userId, students[0].id));
    check("3 хоног завсарласны дараа эргэж ирсэн", (await isComingBack(s0)) === true);

    const hwC2 = await createHomework(asTeacher, {
      classId: klass.id, subjectId: null, title: "Эргэх 2",
      description: null, dueAt: endOfDayUb(addDaysUb(todayUb(), 1)),
    });
    await awardForHomework(s0, hwC2, "HOMEWORK_DONE");
    await awardForHomework(s0, hwC2, "COMEBACK");
    check("эргэж ирэх оноо 15", (await myPoints(s0)) === 10 + 10 + 15, (await myPoints(s0)) + " оноо");

    // Дараагийн даалгавар дээр дахин эргэх оноо гарахгүй.
    check("одоо дахин эргэж ирсэн биш", (await isComingBack(s0)) === false);

    // Багш, эцэг эхэд хамаарахгүй.
    check("багш эргэж ирэхгүй", (await isComingBack(asTeacher)) === false);

    process.env.POINTS_ENABLED = "0";
    check("туг унтраалттай бол эргэлт тооцохгүй", (await isComingBack(s0)) === false);

    await db.delete(pointsLedger).where(eq(pointsLedger.userId, students[0].id));
    await deleteHomework(asTeacher, hwC2);
    await deleteHomework(asTeacher, hwC1);
  }

  console.log();
  console.log("49. Хөгжүүлэлтийн нэвтрэлт — зөвхөн тестийн сургууль");
  {
    process.env.DEV_LOGIN_ENABLED = "1";
    const list = await listDevAccounts();
    check("тестийн сургуулийн хүмүүс жагсав", list.length > 0, list.length + " данс");
    check(
      "бүгд ТЕСТИЙН сургуулийнх",
      list.every((a) => a.schoolId === school.id),
      new Set(list.map((a) => a.schoolName)).size + " сургууль",
    );

    // Жинхэнэ сургууль үүсгээд, түүний хүн жагсаалтад ГАРАХГҮЙ байхыг шалгана.
    const [realSchool] = await db
      .insert(schools)
      .values({ name: "Жинхэнэ сургууль", slug: "jinhene-" + Date.now() })
      .returning({ id: schools.id });
    const [realUser] = await db
      .insert(users)
      .values({ name: "Жинхэнэ Багш", phone: "99000" + String(Date.now()).slice(-4) })
      .returning({ id: users.id });
    await db
      .insert(memberships)
      .values({ userId: realUser.id, schoolId: realSchool.id, role: "TEACHER" });

    const after = await listDevAccounts();
    check(
      "ЖИНХЭНЭ сургуулийн хүн жагсаалтад АЛГА",
      !after.some((a) => a.schoolId === realSchool.id),
    );
    check(
      "id мэдсэн ч жинхэнэ сургууль руу нэвтрэхгүй",
      (await devAccountExists(realUser.id, realSchool.id, "TEACHER")) === false,
    );
    check(
      "тестийн сургууль руу нэвтрэхэд саад алга",
      (await devAccountExists(teacher.id, school.id, "TEACHER")) === true,
    );

    await db.delete(memberships).where(eq(memberships.userId, realUser.id));
    await db.delete(users).where(eq(users.id, realUser.id));
    await db.delete(schools).where(eq(schools.id, realSchool.id));

    process.env.DEV_LOGIN_ENABLED = "0";
    check("туг унтраалттай бол хоосон", (await listDevAccounts()).length === 0);
    check(
      "туг унтраалттай бол нэвтрэхгүй",
      (await devAccountExists(teacher.id, school.id, "TEACHER")) === false,
    );
    process.env.DEV_LOGIN_ENABLED = "1";
  }

  console.log();
  console.log("50. Админ — сургууль үүсгэх");
  {
    // Кодын шалгалт — урт, утга хоёулаа.
    process.env.ADMIN_SECRET = "turshilt-admin-kod-123";
    check("зөв код таарав", secretMatches("turshilt-admin-kod-123") === true);
    check("буруу код татгалзав", secretMatches("turshilt-admin-kod-124") === false);
    check("богино код татгалзав", secretMatches("turshilt") === false);
    check("урт код татгалзав", secretMatches("turshilt-admin-kod-1234") === false);

    // Код тохируулаагүй бол админы зам БҮХЭЛДЭЭ хаалттай.
    delete process.env.ADMIN_SECRET;
    check("код тохируулаагүй бол хаалттай", adminSecret() === null);
    check("код байхгүй үед юу ч таарахгүй", secretMatches("") === false);
    process.env.ADMIN_SECRET = "turshilt-admin-kod-123";

    const uniq = String(Date.now()).slice(-7);
    const slug = "admin-test-" + uniq;

    // Буруу утгууд.
    const bad1 = await createSchoolWithManager("Болд", {
      name: "Сургууль", slug, managerName: "Эрхлэгч", phone: "123",
    });
    check("утас 8 оронтой биш бол татгалзав", bad1.ok === false);
    const bad2 = await createSchoolWithManager("Болд", {
      name: "Сургууль", slug: "ZU", managerName: "Эрхлэгч", phone: "99" + uniq.slice(-6),
    });
    check("богино нэр буруу бол татгалзав", bad2.ok === false);
    const bad3 = await createSchoolWithManager("Болд", {
      name: "Сургууль", slug: "zulzaga", managerName: "Эрхлэгч", phone: "99" + uniq.slice(-6),
    });
    check("«zulzaga» slug хамгаалагдсан", bad3.ok === false);

    // Зөв үүсгэлт.
    const made = await createSchoolWithManager("Болд", {
      name: "Админ тестийн сургууль",
      slug,
      managerName: "Шалгалтын Эрхлэгч",
      phone: "99" + uniq.slice(-6),
    });
    check("сургууль үүсэв", made.ok === true);
    if (!made.ok) throw new Error("сургууль үүссэнгүй");
    check("PIN буцаав", /^\d{4}$/.test(made.pin ?? ""), made.pin ?? "алга");

    // Эрхлэгч нь жинхэнэ нэвтэрч чадах эсэх — PIN нь ажиллах ёстой.
    const signed = await signIn("99" + uniq.slice(-6), made.pin!);
    check("эрхлэгч нэвтэрч чадав", signed.ok === true);
    check("дүр нь эрхлэгч", signed.ok && signed.role === "ACADEMIC_MANAGER");

    // Үндсэн хичээлүүд орсон эсэх — эс бөгөөс багш даалгавар өгөхөд хоосон.
    const subs = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.schoolId, made.schoolId));
    check("үндсэн хичээлүүд орлоо", subs.length > 0, subs.length + " хичээл");

    // Давхар slug.
    const dup = await createSchoolWithManager("Болд", {
      name: "Өөр сургууль", slug, managerName: "Өөр хүн", phone: "98" + uniq.slice(-6),
    });
    check("давхар богино нэр татгалзав", dup.ok === false);

    // Жагсаалтад орсон эсэх.
    const listed = await listSchools();
    const row = listed.find((x) => x.slug === slug);
    check("жагсаалтад орлоо", row !== undefined);
    check("шинэ сургуульд даалгавар 0", row?.homework === 0);
    const seedRow = listed.find((x) => x.slug === "zulzaga");
    check("seed сургуулийн тоо гарч байна", (seedRow?.students ?? 0) > 0, seedRow?.students + " сурагч");

    await db.delete(schools).where(eq(schools.id, made.schoolId));
    await db.delete(users).where(eq(users.phone, "99" + uniq.slice(-6)));
  }

  console.log();
  console.log("51. Сургуулийн хүсэлт (холбоо барих)");
  {
    const uniq = String(Date.now()).slice(-6);
    const phone = "97" + uniq;
    await db.delete(leads).where(eq(leads.phone, phone));

    // Буруу утгууд — нэвтрэлтгүй зам тул сервер талд ЗААВАЛ шалгана.
    check("хоосон сургуулийн нэр татгалзав",
      (await submitLead({ schoolName: " ", contactName: "Болд", phone, note: "" })).ok === false);
    check("хоосон нэр татгалзав",
      (await submitLead({ schoolName: "Сургууль", contactName: "", phone, note: "" })).ok === false);
    check("богино утас татгалзав",
      (await submitLead({ schoolName: "Сургууль", contactName: "Болд", phone: "123", note: "" })).ok === false);

    const ok = await submitLead({
      schoolName: "Хүсэлтийн сургууль",
      contactName: "Сүхбаатарын Оюунчимэг",
      phone,
      note: "3 ангид туршмаар байна",
    });
    check("хүсэлт хүлээн авав", ok.ok === true);

    // Нэг дугаараас өдөрт нэг удаа — давхар дарснаас хамгаална.
    const again = await submitLead({
      schoolName: "Дахин", contactName: "Болд", phone, note: "",
    });
    check("давхар хүсэлт татгалзав", again.ok === false);

    const list = await listLeads();
    const mine = list.find((l) => l.phone === phone);
    check("жагсаалтад орлоо", mine !== undefined, mine?.schoolName);
    check("хариу өгөөгүй гэж эхэлнэ", mine?.handledAt === null);
    check("тэмдэглэл хадгалагдав", mine?.note?.includes("3 ангид") === true);

    const before = await unhandledLeadCount();
    await markLeadHandled(mine!.id);
    const after = await unhandledLeadCount();
    check("хариу өглөө гэж тэмдэглэв", after === before - 1, `${before} → ${after}`);

    // Хэт урт утгыг таслана — 1000 тэмдэгтээс дээш тэмдэглэл хадгалахгүй.
    const phone2 = "96" + uniq;
    await db.delete(leads).where(eq(leads.phone, phone2));
    await submitLead({
      schoolName: "Урт".repeat(200), contactName: "Болд", phone: phone2, note: "a".repeat(5000),
    });
    const [long] = (await listLeads()).filter((l) => l.phone === phone2);
    check("урт нэр таслагдав", (long?.schoolName.length ?? 0) <= 200);
    check("урт тэмдэглэл таслагдав", (long?.note?.length ?? 0) <= 1000);

    await db.delete(leads).where(eq(leads.phone, phone));
    await db.delete(leads).where(eq(leads.phone, phone2));
  }

  console.log();
  console.log("37. Профайл ба PIN солих");
  {
    const prof = await myProfile(s0);
    check("сурагч өөрийн нэрийг харав", prof.name === students[0].name, prof.name);
    check("сурагчид нэвтрэх код харагдав", Boolean(prof.loginCode), prof.loginCode ?? "алга");
    check("сурагчид утасны дугаар харагдахгүй", prof.phone === null);
    check("сурагчийн анги харагдав", prof.classes.length === 1, prof.classes[0]?.name);

    const parentProf = await myProfile({
      userId: link.parentId,
      schoolId: school.id,
      role: "PARENT",
    });
    check("эцэг эхэд хүүхэд нь харагдав", parentProf.children.some((c) => c.id === link.childId));
    check("эцэг эхэд нэвтрэх код харагдахгүй", parentProf.loginCode === null);
    check(
      "эцэг эхэд ӨӨРИЙН хүүхэд л харагдана",
      parentProf.children.every((c) => c.id === link.childId),
      `${parentProf.children.length} хүүхэд`,
    );

    const teacherProf = await myProfile(asTeacher);
    check("багшид хариуцсан анги харагдав", teacherProf.classes.length > 0);

    // PIN солих — буруу оролдлогууд юу ч өөрчлөх ёсгүй.
    const wrong = await changeOwnPin(s0, "0000", "5137");
    check("одоогийн PIN буруу бол татгалзав", !wrong.ok && wrong.reason === "ОДООГИЙН_БУРУУ");
    check("буруу оролдлогын дараа хуучин PIN хэвээр", (await signIn(prof.loginCode!, "2648")).ok);

    const weak = await changeOwnPin(s0, "2648", "1111");
    check("хэт амархан PIN татгалзав", !weak.ok && weak.reason === "ХЭТ_АМАРХАН");

    const same = await changeOwnPin(s0, "2648", "2648");
    check("ижил PIN татгалзав", !same.ok && same.reason === "ИЖИЛ");

    const short = await changeOwnPin(s0, "2648", "12");
    check("4 оронтой биш PIN татгалзав", !short.ok && short.reason === "ФОРМАТ");

    const ok = await changeOwnPin(s0, "2648", "5137");
    check("зөв PIN солигдов", ok.ok);
    check("шинэ PIN-ээр нэвтэрнэ", (await signIn(prof.loginCode!, "5137")).ok);
    check("хуучин PIN-ээр нэвтрэхгүй", !(await signIn(prof.loginCode!, "2648")).ok);

    // Seed-ийн PIN-д буцааж үлдээнэ — дараагийн тест, гараар шалгалт эндүүрэхгүйн тулд.
    await changeOwnPin(s0, "5137", "2648");
    check("seed-ийн PIN сэргэв", (await signIn(prof.loginCode!, "2648")).ok);
  }

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} зөв, ${failed} алдаа\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
