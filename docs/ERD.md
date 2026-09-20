# Өгөгдлийн загвар

> Phase 0. `DECISIONS.md`-д тулгуурлав. v1-ийн гогцоог бүрэн барих хэмжээний
> хүснэгтүүд, түүнээс илүүг оруулаагүй.

## Үндсэн зарчим

**1. Бүх мөр сургуульд харьяалагдана.** `school_id` нь бараг бүх хүснэгтэд
байна. Дараа нэмэх боломжгүй тул эхнээсээ.

**2. Хүн ≠ дүр.** Нэг `users` мөр, `memberships`-д олон мөр. Тэр сургуульд
багшилдаг, хүүхэд нь бас тэнд сурдаг ээж = хоёр мөр. `DECISIONS §12`-ийн
дүрийн сэлгүүр ингэж ажиллана.

**3. Эцэг эх ангид гишүүн БИШ.** Эцэг эх ангийн мэдээллийг **хүүхдээрээ
дамжуулан** харна (`guardians` → `class_members`). Ингэснээр `BRIEF §5`-ийн
«эцэг эх буруу ангид орох» асуудал бүтцийн хувьд боломжгүй болно.

**4. Сурагчид имэйл байхгүй.** `users.email` нь `NULL` байж болно. Сурагч
`student_credentials`-ийн код + PIN-ээр нэвтэрнэ.

---

## Хүснэгтүүд

### schools

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| name | text | «Зулзага сургууль» |
| slug | text unique | дэд домэйнд ашиглана |
| status | text | `ACTIVE` / `SUSPENDED` |
| created_at | timestamptz | |

### users

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| email | text **null** | сурагчид NULL |
| google_sub | text **null** | Google-ийн тогтмол ID |
| name | text | |
| avatar_url | text null | |
| created_at | timestamptz | |

- `unique (email) where email is not null`
- `unique (google_sub) where google_sub is not null`

### memberships

Хүн ↔ сургууль ↔ дүр.

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| user_id | uuid → users | |
| school_id | uuid → schools | |
| role | text | `ACADEMIC_MANAGER` / `TEACHER` / `PARENT` / `STUDENT` |
| status | text | `ACTIVE` / `INVITED` / `REMOVED` |
| created_at | timestamptz | |

- `unique (user_id, school_id, role)`
- index `(school_id, role)`, `(user_id)`

### student_credentials

Сурагчийн нэвтрэлт. Имэйл ч, Google ч байхгүй.

| багана | төрөл | тэмдэглэл |
|---|---|---|
| user_id | uuid pk → users | |
| login_code | text unique | богино, уншихад ойлгомжтой (жишээ `3A-K7QM`) |
| pin_hash | text | 4 оронтой PIN, hash хийгдсэн |
| failed_attempts | int | түгжих тоолуур |
| locked_until | timestamptz null | |
| last_login_at | timestamptz null | |

⚠️ Энэ замд **rate limit заавал**. Код богино учраас хамгаалалт хатуу байх ёстой.

### classes

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| school_id | uuid → schools | |
| name | text | «3А» |
| grade | int | 1–5 |
| academic_year | text | «2026-2027» |
| created_by | uuid → users | |
| archived_at | timestamptz null | |

- `unique (school_id, academic_year, name)`

### class_members

Зөвхөн **багш ба сурагч**. Эцэг эх энд байхгүй.

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| class_id | uuid → classes | |
| user_id | uuid → users | |
| role | text | `TEACHER` / `STUDENT` |
| status | text | `ACTIVE` / `REMOVED` |

- `unique (class_id, user_id, role)`
- index `(class_id, role)`, `(user_id)`

### guardians

Эцэг эх ↔ хүүхэд. **Хамгийн эмзэг хүснэгт.**

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| parent_user_id | uuid → users | |
| student_user_id | uuid → users | |
| relation | text | `MOTHER` / `FATHER` / `GUARDIAN` |
| status | text | `PENDING` / `ACTIVE` / `REJECTED` |
| verified_by | uuid → users null | багш баталгаажуулна |
| created_at | timestamptz | |

- `unique (parent_user_id, student_user_id)`
- ⚠️ `ACTIVE` болохын тулд **багшийн баталгаа** шаардлагатай

### invitations

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| school_id | uuid → schools | |
| class_id | uuid null → classes | |
| kind | text | `TEACHER` / `PARENT` / `STUDENT` |
| token_hash | text unique | ⚠️ токеныг **hash**-аар хадгална |
| target_student_id | uuid null → users | эцэг эхийн урилга тодорхой хүүхдэд заана |
| created_by | uuid → users | |
| expires_at | timestamptz | |
| max_uses | int | |
| used_count | int | |
| revoked_at | timestamptz null | |

### subjects

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| school_id | uuid → schools | сургууль бүрт өөрийн жагсаалт, үндсэн багц seed |
| name | text | «Математик» |
| sort_order | int | |

### homework

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| school_id | uuid → schools | |
| class_id | uuid → classes | |
| subject_id | uuid → subjects | |
| created_by | uuid → users | багш |
| title | text | |
| description | text null | |
| due_at | timestamptz | |
| published_at | timestamptz null | ноорог ↔ илгээсэн |
| created_at | timestamptz | |

- index `(class_id, due_at)`

### homework_submissions

Даалгавар **нийтлэгдэх үед** сурагч бүрд нэг мөр үүснэ. Ингэснээр «18/24»
нь энгийн `count`, «хэн хийгээгүй» нь энгийн `where`.

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| homework_id | uuid → homework | |
| student_user_id | uuid → users | |
| status | text | `ASSIGNED` / `DONE` / `CHECKED` |
| marked_done_at | timestamptz null | |
| checked_at | timestamptz null | |
| checked_by | uuid null → users | |
| teacher_note | text null | |

- `unique (homework_id, student_user_id)`
- index `(homework_id, status)`, `(student_user_id, status)`

### files

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| school_id | uuid → schools | |
| uploader_id | uuid → users | |
| storage_key | text | |
| mime | text | |
| size_bytes | int | |
| created_at | timestamptz | |

Холбогч хүснэгтүүд: `homework_attachments (homework_id, file_id)`,
`submission_attachments (submission_id, file_id)`.

### announcements

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| school_id | uuid → schools | |
| class_id | uuid null → classes | NULL = сургууль даяар |
| created_by | uuid → users | |
| body | text | |
| audience | text | `ALL` / `PARENTS` / `STUDENTS` |
| created_at | timestamptz | |

### notifications

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| user_id | uuid → users | |
| school_id | uuid → schools | |
| kind | text | `HOMEWORK_NEW` / `HOMEWORK_DUE` / `ANNOUNCEMENT` … |
| payload | jsonb | |
| read_at | timestamptz null | |
| created_at | timestamptz | |

- index `(user_id, read_at)`

### push_subscriptions

Web push. iOS дээр «дэлгэцэн дээрээ нэмсэн» үед л үүснэ.

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | uuid pk | |
| user_id | uuid → users | |
| endpoint | text unique | |
| p256dh | text | |
| auth | text | |
| last_seen_at | timestamptz | |

### audit_log

Хүүхдийн өгөгдөлтэй ажиллаж байгаа тул заавал.

| багана | төрөл | тэмдэглэл |
|---|---|---|
| id | bigserial pk | |
| school_id | uuid → schools | |
| actor_user_id | uuid null → users | |
| action | text | `INVITE_CREATED`, `GUARDIAN_VERIFIED`, `STUDENT_REMOVED` … |
| target_type | text | |
| target_id | text | |
| meta | jsonb | |
| created_at | timestamptz | |

---

## Хамаарлын зураг

```
schools ──┬── memberships ──── users ──┬── student_credentials
          │                            │
          ├── classes ── class_members ─┘
          │      │
          │      ├── homework ── homework_submissions
          │      │                    └── submission_attachments ── files
          │      │        └── homework_attachments ── files
          │      └── announcements
          │
          ├── subjects
          ├── invitations
          └── audit_log

guardians: users(эцэг эх) ──< >── users(сурагч)   [багш баталгаажуулна]
```

**Эцэг эх даалгаврыг ингэж харна:**

```
эцэг эх → guardians(ACTIVE) → хүүхэд → class_members → class → homework
```

Ангид шууд холбогдохгүй тул буруу ангийн мэдээлэл харах зам байхгүй.

---

## Техникийн сонголт

**ORM: Drizzle.** Шалтгаан:

- Схем нь SQL шиг уншигддаг — энэ баримттай нэг мөр
- Serverless дээр хөнгөн, Neon-той сайн нийцдэг
- Migration нь ил SQL — юу болж байгааг нуухгүй

**Хугацаа:** бүх `timestamptz`, серверт UTC. Улаанбаатарын цаг (`+08`) зөвхөн
харуулах үед хөрвүүлнэ. Даалгаврын эцсийн хугацаа буруу цагаар харагдвал
багш итгэхээ болино.
