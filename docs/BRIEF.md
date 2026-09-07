# ZULZAGA EDU V2 — Product & Development Master Brief

> Эх хувь. Zulzaga-гаас 2026-09-08-нд өгсөн. Өөрчлөхгүй хадгална.
> Шийдвэр/тодруулга нь `docs/DECISIONS.md` дотор бичигдэнэ.

## 1. PROJECT OVERVIEW

Zulzaga EDU is a comprehensive education platform designed primarily for students in grades 1–5.

The platform connects three main user groups:

1. Student
2. Parent
3. Teacher

The goal is to create one connected ecosystem where learning, homework, communication, rewards, progress tracking, AI assistance, and parent involvement are managed in one application.

This is a V2 rebuild.

There is an older Zulzaga EDU project built previously in Replit. That project is approximately 90% complete, but it was built while the developer was still learning Replit and therefore contains technical debt, unclear structures, inconsistent implementations, and many small issues.

DO NOT treat the old project as the new codebase.

The old project should be considered a reference for:

- product ideas
- UI ideas
- existing features
- content structure
- business logic
- design inspiration

The new Zulzaga EDU V2 must be built from a clean architecture.

## 2. CORE PRODUCT PRINCIPLE

Zulzaga EDU should be:

- Simple for children
- Easy for parents
- Powerful for teachers
- Safe
- Mobile-first
- Modern
- Gamified
- AI-assisted
- Scalable
- Modular
- Easy to maintain

The application should not feel like a complicated school administration system.

For students, it should feel engaging and friendly.
For parents, it should feel clear and trustworthy.
For teachers, it should save time.

## 3. TARGET USERS

STUDENT

Primary target:

- Grade 1–5 students

Students should be able to:

- view classes
- view homework
- complete homework
- mark tasks as completed
- view schedule
- take quizzes/tests
- earn points
- receive gifts
- give points to friends
- give birthday gifts
- give gifts to teachers
- spend points
- communicate with parents
- communicate with teachers
- participate in class group chat
- use AI chat
- learn foreign languages

## 4. TEACHER

Teacher onboarding

Teacher downloads the Zulzaga EDU application.
Teacher signs in using Google/Gmail.

Teacher provides:

- school information
- grade/class information
- required verification information

Teacher can then create a class.

Example:

School: Zulzaga School
Class: 3A
Teacher: Teacher Name

## 5. CLASS MANAGEMENT

Teacher can:

- create class
- edit class
- remove class
- invite students
- remove students
- invite parents
- remove parents
- manage class members

QR-based invitation is a core feature.

Teacher should be able to generate a QR invitation.
The QR invitation should contain the necessary secure invitation information.

Parents should not accidentally join another class.
Students should not accidentally join another class.

Invitation tokens must be secure, expire when appropriate, and be validated by the backend.

## 6. PARENT INVITATION FLOW

Parent downloads Zulzaga EDU.
Parent receives a QR code from the teacher.
Parent scans the QR code.
The app recognizes the invitation.
Parent creates/signs into an account.

The invitation should automatically connect the parent to the correct:

- school
- class
- teacher
- child relationship where applicable

A parent may have multiple children.

Maximum initial target: 1–3 children.

A parent can therefore belong to multiple classes if they have children in different classes.

## 7. PARENT → CHILD INVITATION

Parents should also be able to generate a QR code to invite/connect their child.

The invitation should contain:

- child name
- class
- required relationship information

The system must prevent unauthorized users from connecting to a child.

Teacher approval may be required depending on the relationship flow.

## 8. STUDENT ONBOARDING

Student receives a QR invitation from a parent.
Student downloads the app.
Student creates/signs into their own account.

When the teacher has invited/approved the student into a class, the student can access that class.

Student should only see classes they are authorized to access.

Class group chat access may require teacher approval.

## 9. TEACHER FEATURES

Teacher dashboard should include:

### Class

- class overview
- students
- parents
- attendance/progress where implemented
- class statistics

### Schedule

Teacher can:

- create schedule
- edit schedule
- assign subjects
- assign time
- assign day

Students and parents can view the schedule.

### Homework

Teacher can:

- create homework
- edit homework
- delete homework
- assign homework
- add description
- add attachments
- set deadline
- review submissions
- mark/check submissions
- give points

### Announcements

Teacher can send information to:

- entire class
- students
- parents

### Chat

Teacher can:

- manage class group chat
- communicate with parents privately
- communicate with students according to permissions

Chat should support:

- text
- images
- voice messages
- voice call where technically appropriate

### AI

Teacher has access to AI assistance.

Possible AI features:

- create homework
- generate quiz questions
- explain lesson concepts
- create educational material
- summarize student/class progress
- assist with grading
- suggest activities

AI should assist teachers, not replace them.

## 10. PARENT FEATURES

Parent dashboard should show:

- children
- school
- class
- teacher
- homework
- schedule
- progress
- points
- notifications
- communication

Parent should be able to:

### Child monitoring

- view child's learning progress
- view homework
- view completed tasks
- view points
- view class information

### Location

Parent may have a child location feature.

This must be designed with:

- explicit consent
- strong privacy
- secure access
- clear indication when location sharing is active

### Device usage

Parent may eventually be able to:

- monitor phone usage
- set usage limits
- create schedules
- restrict usage during study hours

This should be treated as a later/advanced feature unless the MVP requires it.

### Chat

Parent can communicate with:

- child
- teacher

Supported:

- text
- image
- voice message
- voice call where technically appropriate

### AI

Parent has an AI assistant.

Possible uses:

- understand child's progress
- ask about homework
- receive learning suggestions
- receive parent guidance
- understand school announcements

## 11. STUDENT FEATURES

Student dashboard should be extremely simple.

Primary sections:

- Home
- Classes
- Homework
- Schedule
- Points
- Rewards
- Chat
- AI
- Language Learning
- Profile

Student can:

### Homework

- view homework
- open homework
- complete homework
- mark completion
- submit work
- view result
- receive points

### Schedule

View:

- today's classes
- weekly schedule
- subject
- teacher
- time

### Quizzes/tests

Student can:

- take quizzes
- submit answers
- receive results
- earn points

## 12. GAMIFICATION / POINT SYSTEM

Points are a major part of Zulzaga EDU.

Students can earn points for:

- completing homework
- writing essays
- completing lessons
- taking tests
- completing assignments
- positive learning activity
- teacher rewards

Points should be automatically added when qualifying events happen.

Every point transaction must be recorded.

Do NOT simply modify a balance without creating a transaction record.

Recommended conceptual model:

Wallet:

- current balance

Transactions:

- earn
- spend
- gift
- receive
- teacher award
- parent gift
- adjustment

Every transaction should contain:

- amount
- reason
- sender
- receiver
- timestamp
- related activity if applicable

## 13. TEACHER MONTHLY POINTS

Teachers may receive: 5,000 points automatically every month.

These points can be used to reward students.

This should be implemented as a scheduled backend process.

The system must prevent:

- duplicate monthly rewards
- accidental repeated execution
- unauthorized point creation

Every monthly allocation must be logged.

## 14. POINT GIFTS

Students can give points to friends.
Students can give birthday gifts.
Students may give points to teachers.

Parents can:

- purchase points
- give points to children
- give points to teachers

Important:

Point transfers must use secure backend transactions.
Never trust the client to directly modify another user's balance.

## 15. POINT MARKETPLACE

Students should eventually be able to spend points.

Possible uses:

- rewards
- digital items
- educational content
- badges
- special activities
- products

The system should be designed so that a marketplace can be added later without rebuilding the point system.

## 16. QR PAYMENT / POINT PURCHASE

Future feature:

Points may be used through QR scanning for purchases.

Parent/student scans a merchant QR code.

The system validates:

- user
- merchant
- balance
- amount
- transaction

Then performs a secure point transaction.

This is NOT necessarily MVP.

Design the architecture so it can be added later.

## 17. LANGUAGE LEARNING MODULE

Zulzaga EDU should include a foreign-language learning module.

Initial portion: free
Advanced content: paid

Potential payment:

- real money
- points

The module should be independent from the core classroom system.

Potential future languages:

- English
- Chinese
- Korean
- Japanese
- other languages

Possible features:

- vocabulary
- pronunciation
- listening
- speaking
- reading
- quizzes
- progress tracking
- AI conversation

## 18. AI SYSTEM

AI is an important part of Zulzaga EDU.

There should be different AI experiences for:

### Student AI

Child-friendly AI tutor.

It should:

- explain concepts
- help with homework
- ask guiding questions
- encourage learning
- avoid simply giving answers when learning would benefit from explanation

### Parent AI

Parent learning assistant.

It should:

- explain progress
- summarize learning
- suggest support strategies

### Teacher AI

Teacher assistant.

It should:

- create assignments
- create quizzes
- help prepare lessons
- summarize performance
- assist with educational content

The AI architecture should be provider-independent.

Do not tightly couple the whole application to one AI provider.

Use an AI service abstraction so providers can be changed later.

## 19. CHAT SYSTEM

Chat is a major feature.

Types:

1. Class group chat
2. Teacher ↔ Parent
3. Parent ↔ Child
4. Student ↔ Student where permitted
5. AI chat

Message types:

- text
- image
- voice message
- system message

Potential future:

- video call
- voice call
- file sharing

Child safety and permissions are critical.

The backend must enforce who can communicate with whom.

## 20. NOTIFICATIONS

System should support:

- homework notification
- homework deadline
- teacher announcement
- new message
- points received
- reward
- class invitation
- parent/student connection
- important school announcements

Design notifications as a reusable system.

## 21. ROLES & PERMISSIONS

Core roles:

- TEACHER
- PARENT
- STUDENT

Potential future roles:

- SCHOOL_ADMIN
- SUPER_ADMIN

Never rely only on frontend role checks.

All important permissions must be validated on the server.

## 22. DATABASE

Preferred database: PostgreSQL
Preferred platform: Neon

The database should be relational and designed for scalability.

Initial conceptual entities:

users, schools, classes, class_members, parent_children, teacher_profiles,
student_profiles, parent_profiles, homework, homework_submissions, subjects,
schedules, quizzes, quiz_questions, quiz_attempts, chats, chat_members,
messages, point_wallets, point_transactions, rewards, notifications,
invitations, ai_conversations, ai_messages, language_courses, language_lessons,
language_progress

Additional tables may be proposed when needed.

Do not blindly create all tables before understanding relationships.

First design the ERD/data model.

## 23. AUTHENTICATION

Preferred initial authentication: Google/Gmail authentication.

Architecture should allow future:

- email/password
- phone authentication
- other OAuth providers

Authentication and authorization must be separate concepts.

## 24. TECHNOLOGY

Preferred stack:

Frontend:
- Next.js
- React
- TypeScript

UI:
- Tailwind CSS
- shadcn/ui

Backend:
- Next.js server-side APIs/server actions initially

Database:
- PostgreSQL
- Neon

Hosting:
- Vercel for Next.js

Additional backend/worker infrastructure:
- Railway when required

Version control:
- GitHub

Development:
- VS Code
- Claude Code

## 25. ARCHITECTURE PRINCIPLE

Do NOT create a giant monolithic page.

Use modular architecture.

Suggested conceptual structure:

```
src/
  app/
  components/
  features/
    auth/
    students/
    parents/
    teachers/
    classes/
    homework/
    schedule/
    chat/
    points/
    rewards/
    ai/
    language/
    notifications/
  lib/
  server/
  db/
  types/
  validations/
```

The exact architecture may be improved after analysis.

Do not blindly follow this structure if a better architecture is justified.

## 26. SECURITY PRINCIPLES

This application involves children.

Security and privacy are critical.

Must consider:

- role-based authorization
- secure invitation tokens
- QR expiration
- server-side validation
- database access control
- rate limiting
- secure file uploads
- message permissions
- location privacy
- parent-child relationship verification
- audit logs
- protection against unauthorized point manipulation

Never expose secret API keys in the frontend.

Never trust client-provided:

- role
- user ID
- point balance
- permissions
- invitation ownership

## 27. MOBILE-FIRST

The main target is mobile users.

The UI must work extremely well on:

- Android phones
- iPhones
- tablets
- desktop browsers

Student UI should be especially simple.

Buttons should be large enough for children.

Navigation should be understandable without technical knowledge.

## 28. DESIGN DIRECTION

Zulzaga EDU should feel:

- friendly
- modern
- colorful but not chaotic
- educational
- trustworthy
- playful for children
- professional for teachers
- reassuring for parents

Do not create excessive animations.
Do not overload screens with information.
Use clear hierarchy.

## 29. DEVELOPMENT RULE

IMPORTANT:

Do not start by generating the entire application.

First:

1. Analyze this specification.
2. Identify missing requirements.
3. Identify contradictions.
4. Propose architecture.
5. Propose database schema.
6. Propose authentication/authorization model.
7. Propose folder structure.
8. Propose MVP scope.
9. Identify technical risks.
10. Create implementation phases.

ONLY AFTER APPROVAL should implementation begin.

## 30. DEVELOPMENT PHASES

**Phase 0 — Architecture** (no major UI implementation)

Deliver: architecture proposal, ERD, database schema proposal, API design,
role/permission matrix, folder structure, security model.

**Phase 1 — Foundation**

Next.js, TypeScript, Tailwind, shadcn/ui, authentication, database connection,
basic user profiles, roles, protected routes, basic navigation.

**Phase 2 — School/Class**

school, teacher, class creation, student membership, parent membership,
QR invitations, invitation validation.

**Phase 3 — Learning**

subjects, schedule, homework, submissions, quizzes, progress.

**Phase 4 — Points**

wallet, transactions, earning, awarding, gifting, monthly teacher points.

**Phase 5 — Communication**

class chat, parent-teacher chat, parent-child chat, image, voice messages,
notifications.

**Phase 6 — AI**

AI abstraction and role-specific AI experiences.

**Phase 7 — Language Learning**

Independent language-learning module.

**Phase 8 — Advanced Features**

location, device usage controls, marketplace, QR point purchases,
voice/video calls, advanced analytics, school administration.

## 31. MVP

The first production MVP should NOT contain every feature.

Recommended MVP:

1. Google authentication
2. Teacher account
3. Parent account
4. Student account
5. School/class creation
6. QR invitations
7. Student/parent membership
8. Homework
9. Schedule
10. Basic points
11. Basic class communication
12. Notifications
13. Basic AI tutor

Everything else can follow after the core learning loop works.

## 32. CORE USER JOURNEY

The most important flow is:

```
Teacher signs up
↓
Teacher creates school/class
↓
Teacher generates QR
↓
Parent scans QR
↓
Parent joins class
↓
Parent connects child
↓
Student joins
↓
Teacher assigns homework
↓
Student completes homework
↓
Teacher checks
↓
Student receives points
↓
Parent sees progress
↓
Student continues learning
```

This flow must work smoothly before advanced features are built.

## 33. CODE QUALITY

Claude Code must:

- use TypeScript properly
- avoid unnecessary duplication
- avoid giant files
- create reusable components
- create reusable services
- validate server inputs
- use meaningful names
- keep business logic out of UI components
- handle loading states
- handle errors
- handle empty states
- create tests for important business logic

Do not add libraries without a reason.
Prefer simple solutions.

## 34. GITHUB WORKFLOW

Use GitHub as the source of truth.

Recommended branches: `main`, `develop`, `feature/*`

Every meaningful feature should be committed separately.
Commit messages should describe the actual change.
Do not make massive unreviewable commits.

## 35. VERCEL / RAILWAY / NEON

Initial architecture:

```
GitHub → Vercel → Next.js application → Neon PostgreSQL
```

When background jobs, workers, long-running processes, or separate backend
services become necessary:

```
GitHub → Railway → Backend / Worker services
```

Do not introduce Railway complexity before it is actually needed.

## 36. OLD REPLIT PROJECT

The old project is valuable. However: DO NOT blindly copy its architecture.

Use it as a reference.

When migrating something from the old project:

1. Understand what it does.
2. Determine whether the feature belongs in V2.
3. Extract useful logic/design.
4. Reimplement it according to V2 architecture.
5. Test it.
6. Commit it.

The old project should remain untouched as a historical/reference version.

## 37. IMPORTANT PRODUCT PHILOSOPHY

Zulzaga EDU is not just another LMS.

The long-term vision is a connected ecosystem:

Learning + Teacher + Student + Parent + AI + Communication + Gamification +
Rewards + Language learning

The system should be designed so these modules can grow independently while
remaining connected.

## 38. FIRST TASK

DO NOT WRITE THE APPLICATION YET.

First, act as: Senior software architect, Product architect, Security architect,
Database architect, UX architect.

Analyze this entire specification. Then produce:

- **A.** Requirement analysis — clear / ambiguous / missing / contradictory
- **B.** Recommended architecture — frontend, backend, database, authentication,
  authorization, file storage, chat, notifications, AI, QR invitations
- **C.** Database design — ERD, tables, relationships, indexes, constraints
- **D.** Permission model — matrix for student, parent, teacher, future admin
- **E.** MVP — MUST HAVE / SHOULD HAVE / LATER
- **F.** Security — children, QR invitations, location, chat, points,
  authentication, file uploads
- **G.** Implementation roadmap — small tasks executable and testable one at a time
- **H.** Questions — only what is genuinely necessary for architectural decisions

Do NOT begin large-scale coding until this analysis is complete.

The goal is to build Zulzaga EDU V2 as a clean, maintainable, scalable
production application rather than repeating the architecture mistakes of the
old Replit project.
