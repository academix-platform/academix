# Exam System — Engineering Specification v2
> Production-grade specification — fully updated with all implementation decisions.
> Stack: Next.js App Router · Prisma · PostgreSQL (Docker) · Clerk · SSE
> Status: Implementation complete — Pusher + Visibility API deferred to Phase 2

---

# 1. Project Overview

## Purpose
Build a complete, secure, production-grade exam workflow integrated into the existing **Academix** school management platform. The system enables teachers/admins to create structured exams with configurable settings, and students to submit answers under controlled, monitored, and anti-cheat conditions.

## System Responsibilities
- Exam creation with per-exam configurable feature toggles
- Multi-type question support: `TRUE_FALSE`, `MCQ`, `TEXT`, `FILE`
- Real-time server-authoritative timer via Server-Sent Events (SSE)
- Auto-save answers via Debounce (1s) + `sendBeacon` fallback on tab close
- Network disconnection detection with screen freeze (3s grace period)
- Server-side pagination — students never receive questions beyond current page
- Navigation control — server enforces `allowNavigation` rules
- Auto-submit via dual-layer: client SSE + Cron Job backup
- Auto-grading for `TRUE_FALSE` and `MCQ` — manual grading for `TEXT` and `FILE`
- Teacher time extension per student
- Disconnection event logging for teacher audit

## System Goals
- **Server is the single source of truth** for time, scores, submission status
- **Client only renders** — zero computation authority
- **Anti-cheat by design**: screen freeze, server-side pagination, `lastSyncedAt` validation, `savedAt` set server-side only
- **Graceful degradation**: `sendBeacon` fallback, Cron Job auto-submit backup
- **Every feature is a Boolean toggle** — configurable per exam

---

# 2. Extracted Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
│                                                              │
│   Teacher UI                    Student UI                   │
│   /list/exams/create-workflow   /list/exams/[id]/take        │
│   /list/exams/[id]/grade        /list/exams                  │
└───────────┬────────────────────────────┬─────────────────────┘
            │                            │
    Server Actions                  API Routes
    /lib/actions/                   /api/save-answer
    examWorkflow.actions.ts         /api/exam-timer/[submissionId]
    (primary data layer)            /api/cron/auto-submit
            │                            │
            └──────────────┬─────────────┘
                           │
                   ┌───────▼────────┐
                   │   Prisma ORM   │
                   └───────┬────────┘
                           │
                   ┌───────▼──────────────┐
                   │  PostgreSQL (Docker)  │
                   └──────────────────────┘

Real-time:
  SSE (/api/exam-timer) → Timer stream server→client every 1s

Auth:
  Clerk → auth() in Server Actions AND API Routes (identical API)

File Storage:
  Phase 1 → /public/uploads/{examId}/{studentId}/{filename}
  Phase 2 → Cloudinary (already in project) — swap lib/storage.ts only

Deferred (Phase 2):
  Pusher → Live teacher monitoring dashboard
  Visibility API → Tab-switch tracking
  Cron Job → Vercel Cron (pending deployment confirmation)
```

## Data Flow — Student Takes Exam

```
Student opens /list/exams/[id]/take
        ↓
startExam() Server Action
  → find or create Submission (IN_PROGRESS)
  → return: questions page 1 + saved answers + exam settings + examEndsAt
        ↓
SSE connection opens → /api/exam-timer/[submissionId]
  → server streams { timeRemaining } every 1 second
  → server re-reads extraTime from DB each tick (handles teacher extensions)
        ↓
Student answers
  → Debounce 1s → saveAnswer() Server Action
  → upsert Answer in DB
  → update submission.lastSyncedAt
        ↓
Student changes page
  → flush debounce → immediate saveAnswer()
  → getExamPage() → server validates navigation rules → returns next questions
        ↓
Student submits OR timeRemaining = 0
  → submitExam() Server Action
  → autoGrade() runs immediately
        ↓
Teacher grades TEXT/FILE manually
  → gradeAnswer() → finalizeGrade()
```

## Data Flow — Network Disconnection

```
Network goes offline
        ↓
window 'offline' event fires
        ↓
3-second grace timer starts
        ↓
Grace expired → freezeExam() (UI locked)
disconnectedAt = Date.now()
        ↓
Timer continues on server (SSE connection already dropped)
        ↓
Network restores
        ↓
window 'online' event fires
        ↓
unfreezeExam()
recordDisconnection(offlineSeconds) → Server Action
        ↓
SSE reconnects → timer resumes display
```

---

# 3. Confirmed Engineering Decisions

## 3.1 Database — PostgreSQL via Docker

| Field | Detail |
|-------|--------|
| **Provider** | PostgreSQL |
| **Runtime** | Docker container |
| **ORM** | Prisma |
| **Connection** | Single `DATABASE_URL` — no `directUrl` needed (Docker is not serverless) |
| **Rejected** | Neon (previously considered — dropped in favor of Docker) |

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/academix"
```

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // No directUrl — Docker does not use connection pooling proxy
}
```

---

## 3.2 Authentication — Clerk

| Field | Detail |
|-------|--------|
| **Provider** | Clerk |
| **Usage** | `auth()` works identically in Server Actions and API Routes |
| **Role source** | `sessionClaims.metadata.role` |
| **School resolution** | DB lookup via `prisma.student/teacher/admin.findUnique({ where: { id: userId } })` |
| **Student ID type** | `String` (Clerk user ID) |

---

## 3.3 Timer — Server-Side SSE

| Field | Detail |
|-------|--------|
| **Architecture** | Server computes `timeRemaining` every second, streams via SSE |
| **Formula** | `examEndsAt = startedAt + (duration + extraTime) * 60000` |
| **Client role** | Display only — zero computation |
| **extraTime refresh** | Server re-reads `submission.extraTime` from DB on every tick → teacher extensions reflected automatically |
| **Rejected** | Client-side countdown, polling every 30s, WebSocket (not compatible with Next.js Serverless pattern), Pusher (deferred) |

**Why SSE over polling:**
- Prevents all client-side time manipulation (device clock change, JS pause)
- One persistent connection vs. N requests per minute
- Native support in Next.js App Router Route Handlers

---

## 3.4 Auto-Save — Debounce + sendBeacon

| Field | Detail |
|-------|--------|
| **Primary** | Debounce 1s → `saveAnswer()` Server Action → `upsert` in DB |
| **Tab-close fallback** | `navigator.sendBeacon('/api/save-answer', data)` |
| **Why sendBeacon** | Browser guarantees delivery during page unload — fetch/Server Actions do not |
| **Why not localStorage** | Eliminates client-side tampering surface entirely |
| **savedAt** | Always set by server via `new Date()` — never trusted from client |
| **lastSyncedAt** | Updated on every successful `saveAnswer` — used as anti-cheat signal |

---

## 3.5 Answer Storage — upsert

| Field | Detail |
|-------|--------|
| **Operation** | Prisma `upsert` on `@@unique([submissionId, questionId])` |
| **Why not update** | First answer has no existing record — throws error |
| **Why not insert** | Creates duplicates on re-answer |
| **Debounce behavior** | Always captures last value — rapid changes handled correctly |
| **MCQ multi-answer** | Stored as comma-separated string: `"optionA,optionC"` |

---

## 3.6 Network Disconnection — Screen Freeze

| Field | Detail |
|-------|--------|
| **Detection** | `window.addEventListener('offline')` browser event |
| **Grace period** | 3 seconds before freeze — avoids false positives on momentary blips |
| **Response** | UI locked — no input accepted |
| **Timer** | Continues server-side regardless |
| **Anti-cheat** | `saveAnswer()` validates `lastSyncedAt` gap — rejects if > 60s |
| **DevTools bypass** | Even if student removes freeze overlay, `saveAnswer` server validation rejects stale sessions |
| **Reconnect** | `window.addEventListener('online')` → unfreeze → `recordDisconnection()` |

---

## 3.7 File Storage — Server-Side (Phase 1)

| Field | Detail |
|-------|--------|
| **Phase 1** | `/public/uploads/{examId}/{studentId}/{timestamp}_{filename}` |
| **Phase 2** | Cloudinary (already configured in project) |
| **Abstraction** | `lib/storage.ts` exports `uploadFile()`, `deleteFile()`, `validateFile()` |
| **Migration cost** | Zero — swap internals of `uploadFile()` only |
| **Allowed types** | PDF, JPEG, PNG, JPG, DOC, DOCX |
| **Max size** | 10MB |

---

## 3.8 MCQ — Multiple Correct Answers Support

| Field | Detail |
|-------|--------|
| **Storage** | `correctAnswer String[]` (Prisma array) |
| **`allowMultiple: false`** | Radio button UI — single correct answer |
| **`allowMultiple: true`** | Checkbox UI — multiple correct answers |
| **Grading** | Sort both arrays → `JSON.stringify` comparison |
| **Student answer storage** | Comma-separated in `textAnswer`: `"optionA,optionB"` |

---

## 3.9 Grading Strategy

| Type | Method | Trigger |
|------|--------|---------|
| `TRUE_FALSE` | Auto — exact match | Immediately after `submitExam` |
| `MCQ` | Auto — sorted array match | Immediately after `submitExam` |
| `TEXT` | Manual — teacher | Teacher grading dashboard |
| `FILE` | Manual — teacher | Teacher grading dashboard |
| `finalizeGrade` | Auto-triggered after each `gradeAnswer` | Only runs if ALL answers have scores |

---

## 3.10 Auto-Submit — Dual Layer

| Layer | Trigger | Mechanism |
|-------|---------|-----------|
| **Client** | `timeRemaining === 0` from SSE | Calls `submitExam()` immediately |
| **Server (Cron)** | Expired `IN_PROGRESS` submissions | Vercel Cron Job every 1 min *(pending confirmation)* |
| **Grace period** | 30 seconds after `examEndsAt` | Server accepts late submissions within grace |

---

## 3.11 Feature Toggles — All Per-Exam

```prisma
model Exam {
  enableTimer      Boolean @default(true)   // show/hide timer
  duration         Int?                      // minutes — required if enableTimer
  enableNavigation Boolean @default(true)   // allow prev page navigation
  enableAutoSave   Boolean @default(true)   // auto-save answers
  autoSaveInterval Int     @default(30)     // seconds between saves
  enableAutoSubmit Boolean @default(true)   // cron auto-submit
  questionsPerPage Int     @default(1)      // pagination size
}
```

---

## 3.12 Server-Side Pagination

| Field | Detail |
|-------|--------|
| **Why server-side** | Client must NEVER receive future page questions |
| **Formula** | `SKIP = (page-1) * questionsPerPage · TAKE = questionsPerPage` |
| **Returns** | Questions for page + student's saved answers for those questions |
| **Side effect** | Updates `submission.currentPage` on forward navigation |
| **allowNavigation = false** | Server rejects `requestedPage < currentPage` AND `requestedPage > currentPage + 1` |
| **After browser reopen** | `startExam()` restores `currentPage` from DB — navigation rules still enforced |

---

# 4. Prisma Schema — Complete

```prisma
// ===== ADDITIONS TO datasource =====
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // No directUrl needed — Docker PostgreSQL
}

// ===== NEW ENUMS =====
enum QuestionType {
  TRUE_FALSE
  MCQ
  TEXT
  FILE
}

enum SubmissionStatus {
  IN_PROGRESS
  SUBMITTED
  GRADED
}

// ===== EXAM — extend existing model =====
model Exam {
  // All existing fields unchanged
  id             Int          @id @default(autoincrement())
  schoolId       Int
  school         School       @relation(fields: [schoolId], references: [id])
  title          String
  startTime      DateTime
  endTime        DateTime
  classId        Int?
  class          Class?       @relation(fields: [classId], references: [id])
  subjectId      Int?
  subject        Subject?     @relation(fields: [subjectId], references: [id])
  lessonId       Int
  lesson         Lesson       @relation(fields: [lessonId], references: [id])
  academicYearId Int
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  results        Result[]

  // NEW — feature toggles
  enableTimer      Boolean @default(true)
  duration         Int?
  enableNavigation Boolean @default(true)
  enableAutoSave   Boolean @default(true)
  autoSaveInterval Int     @default(30)
  enableAutoSubmit Boolean @default(true)
  questionsPerPage Int     @default(1)

  // NEW — relations
  questions   Question[]
  submissions Submission[]

  @@index([schoolId])
}

// ===== QUESTION =====
model Question {
  id            Int          @id @default(autoincrement())
  schoolId      Int
  school        School       @relation(fields: [schoolId], references: [id])
  examId        Int
  exam          Exam         @relation(fields: [examId], references: [id], onDelete: Cascade)
  text          String
  type          QuestionType
  points        Int          @default(1)
  order         Int
  options       Json?        // MCQ only: string[]
  correctAnswer String[]     // T/F and MCQ — array supports multiple correct
  allowMultiple Boolean      @default(false)
  answers       Answer[]

  @@index([schoolId])
  @@index([examId])
}

// ===== SUBMISSION =====
model Submission {
  id               Int              @id @default(autoincrement())
  schoolId         Int
  school           School           @relation(fields: [schoolId], references: [id])
  examId           Int
  exam             Exam             @relation(fields: [examId], references: [id])
  studentId        String
  student          Student          @relation(fields: [studentId], references: [id])
  status           SubmissionStatus @default(IN_PROGRESS)
  currentPage      Int              @default(1)
  startedAt        DateTime         @default(now())
  submittedAt      DateTime?
  autoSubmitted    Boolean          @default(false)
  lastSyncedAt     DateTime?        // Anti-cheat: updated on every saveAnswer
  totalScore       Float?
  extraTime        Int?             // Additional minutes from teacher
  extendedBy       String?          // Teacher Clerk ID
  extendedAt       DateTime?
  disconnectedAt   DateTime?        // Logged on reconnection
  reconnectedAt    DateTime?
  totalOfflineTime Int?             // Seconds — computed server-side
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  answers          Answer[]

  @@unique([examId, studentId])    // One submission per student per exam
  @@index([schoolId])
  @@index([examId])
  @@index([studentId])
}

// ===== ANSWER =====
model Answer {
  id           Int        @id @default(autoincrement())
  schoolId     Int
  school       School     @relation(fields: [schoolId], references: [id])
  submissionId Int
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  questionId   Int
  question     Question   @relation(fields: [questionId], references: [id])
  textAnswer   String?    // T/F, MCQ (comma-separated for multi), TEXT
  fileUrl      String?    // FILE — relative path or URL
  isDraft      Boolean    @default(true)   // false after submitExam
  savedAt      DateTime   @default(now())  // ALWAYS set by server
  score        Float?     // null until graded

  @@unique([submissionId, questionId])
  @@index([schoolId])
  @@index([submissionId])
}

// ===== ADDITIONS TO EXISTING MODELS =====
// model School  → add: questions Question[], submissions Submission[], answers Answer[]
// model Student → add: submissions Submission[]
```

---

# 5. Features & Functional Logic

## 5.1 createExamWorkflow

**Purpose:** Teacher creates exam + questions in one transaction.

**Validation:**
- `duration` required if `enableTimer = true`
- MCQ questions: `options.length >= 2`
- T/F + MCQ: `correctAnswer.length >= 1`
- `correctAnswer` values must exist in `options` for MCQ
- Lessons must exist for selected subject + class combinations
- If role = teacher: lessons must belong to that teacher

**Flow:**
```
Teacher submits form
        ↓
Validate with createExamWorkflowSchema (Zod)
        ↓
Find matching lessons in current academicYear
        ↓
prisma.$transaction → create one Exam per lesson/class
  each Exam includes nested questions.createMany
        ↓
successResult(["/list/exams"])
```

---

## 5.2 startExam

**Purpose:** Student opens exam — creates or resumes Submission.

**Validations:**
- `exam.startTime <= now() <= exam.endTime`
- Student belongs to exam's class
- Existing SUBMITTED/GRADED submission → reject

**Returns:**
- `exam` settings (all toggles)
- `submission` (new or existing)
- `questions` for `currentPage`
- `savedAnswers` for those questions
- `examEndsAt` computed server-side
- Total page count

---

## 5.3 getExamPage

**Purpose:** Fetch questions for a specific page with navigation enforcement.

**Validations:**
- Submission belongs to current student
- `status === IN_PROGRESS`
- `now() < examEndsAt`
- `allowNavigation = false`: rejects `page < currentPage` AND `page > currentPage + 1`
- Page within bounds: `1 <= page <= totalPages`

**Side effect:** `submission.currentPage = page` when moving forward.

---

## 5.4 saveAnswer

**Purpose:** Auto-save single answer — primary path via Debounce.

**Validations:**
```
1. submission.studentId === currentUserId
2. submission.schoolId === student.schoolId
3. submission.status === IN_PROGRESS
4. now() < examEndsAt (with extraTime)
5. question.examId === submission.examId
6. lastSyncedAt gap < 60 seconds (anti-cheat: rejects offline students)
```

**Operation:** `upsert` on `@@unique([submissionId, questionId])`
**Side effect:** `submission.lastSyncedAt = new Date()` (server time)

---

## 5.5 /api/save-answer (sendBeacon)

**Purpose:** Identical to `saveAnswer` but via API Route for `beforeunload` compatibility.

**Auth:** `auth()` from Clerk — same as Server Actions.
**Validation:** Identical to `saveAnswer`.
**Why separate:** `navigator.sendBeacon` sends `text/plain` or `application/x-www-form-urlencoded` — incompatible with Server Action format.

---

## 5.6 SSE Timer — /api/exam-timer/[submissionId]

**Purpose:** Stream server-computed `timeRemaining` to student every second.

**Key behaviors:**
- Re-reads `submission.extraTime` from DB on every tick — teacher extensions reflected automatically without reconnect
- Closes stream and sends `timeRemaining: 0` when expired
- Cleans up interval on `req.signal` abort (student disconnects)
- Client calls `submitExam()` when `timeRemaining === 0`

**Anti-cheat:** Client cannot influence this value under any circumstance.

---

## 5.7 submitExam

**Purpose:** Finalize submission — manual or client-triggered.

**Validations:**
- `status === IN_PROGRESS` (rejects duplicates)
- `now() < examEndsAt + 30s grace period`

**Operations (transaction):**
1. `answer.updateMany({ isDraft: true → false })`
2. `submission.update({ status: SUBMITTED, submittedAt: now() })`
3. Triggers `autoGrade(submissionId)`

---

## 5.8 autoGrade

**Purpose:** Score `TRUE_FALSE` and `MCQ` answers immediately post-submit.

**Logic:**
```
for each answer:
  if type IN [TRUE_FALSE, MCQ]:
    studentAnswers = textAnswer.split(",").sort()
    correctAnswers = question.correctAnswer.sort()
    score = arraysEqual ? question.points : 0
  else:
    score = null  // awaits manual grading

totalScore = sum of non-null scores
if all scores !== null → status = GRADED
else → status remains SUBMITTED
```

---

## 5.9 gradeAnswer + finalizeGrade

**Purpose:** Teacher manually scores `TEXT` and `FILE` answers.

**gradeAnswer validations:**
- Teacher owns exam (`lesson.teacherId === currentUserId`) OR admin
- `0 <= score <= question.points`
- Submission exists and belongs to this exam

**finalizeGrade:**
- Called after every `gradeAnswer`
- Only updates if ALL answers have non-null scores
- Computes `totalScore` and sets `status = GRADED`

---

## 5.10 extendTime

**Purpose:** Teacher grants additional minutes to specific student.

**Validations:**
- Teacher owns exam OR admin
- `submission.status === IN_PROGRESS`
- `extraMinutes >= 1`

**Side effect:** SSE timer picks up new `examEndsAt` on next tick automatically.

---

## 5.11 recordDisconnection

**Purpose:** Log network event for teacher audit trail.

**Behavior:** Fire-and-forget — errors silently swallowed (non-critical path).

**Stores:** `disconnectedAt`, `reconnectedAt`, `totalOfflineTime` (seconds).

---

## 5.12 autoSubmitExpired (Cron Job)

**Purpose:** Server-side backstop for expired IN_PROGRESS submissions.

**Query:**
```sql
WHERE status = 'IN_PROGRESS'
  AND (startedAt + (duration + COALESCE(extraTime, 0)) * interval '1 minute') < NOW()
  AND exam.enableAutoSubmit = true
```

**Operations:**
1. `answer.updateMany({ isDraft: false })`
2. `submission.update({ status: SUBMITTED, autoSubmitted: true, submittedAt: now() })`
3. Triggers `autoGrade()`

---

# 6. Frontend / UX Logic

## 6.1 ExamClient Component States

```
LOADING      → startExam() in progress
ACTIVE       → exam running, SSE connected
FROZEN       → network offline (after 3s grace)
SUBMITTING   → submitExam() in progress
SUBMITTED    → exam complete → redirect to /list/exams
ERROR        → unrecoverable — shows message
```

## 6.2 Answer Change Flow

```javascript
// On every answer change:
setAnswers(prev => ({ ...prev, [questionId]: value }))  // React state — instant UI
pendingAnswersRef.current[questionId] = value             // For sendBeacon
debouncedSave(questionId, value)                          // 1s debounce → saveAnswer()
```

## 6.3 Page Navigation Flow

```javascript
// On page change:
debouncedSave.flush()                    // Cancel pending debounce
await saveAnswer(pendingAnswers)          // Immediate save before leaving
pendingAnswersRef.current = {}           // Clear pending
const result = await getExamPage(page)   // Fetch next page from server
setQuestions(result.questions)
setAnswers(merge(current, result.savedAnswers))
setCurrentPage(page)
window.scrollTo({ top: 0 })
```

## 6.4 Network Detection

```javascript
// Offline: 3s grace before freeze
window.addEventListener('offline', () => {
  freezeTimer = setTimeout(() => {
    setIsFrozen(true)
    disconnectedAt = Date.now()
  }, 3000)
})

// Online: unfreeze + log
window.addEventListener('online', async () => {
  clearTimeout(freezeTimer)
  if (isFrozen) {
    setIsFrozen(false)
    await recordDisconnection(
      submissionId,
      Math.floor((Date.now() - disconnectedAt) / 1000),
      new Date(disconnectedAt)
    )
  }
})
```

## 6.5 beforeunload

```javascript
window.addEventListener('beforeunload', () => {
  for (const [qId, answer] of Object.entries(pendingAnswersRef.current)) {
    navigator.sendBeacon('/api/save-answer', JSON.stringify({
      submissionId,
      questionId: parseInt(qId),
      textAnswer: answer
    }))
  }
})
```

## 6.6 Timer Display

```javascript
const sse = new EventSource(`/api/exam-timer/${submissionId}`)
sse.onmessage = (e) => {
  const { timeRemaining } = JSON.parse(e.data)
  setTimeRemaining(timeRemaining)
  if (timeRemaining === 0) { sse.close(); submitExam() }
}
// Warning states: < 5min = orange, < 1min = red + pulse
```

## 6.7 MCQ Rendering Rule

```
question.allowMultiple = false → <input type="radio">
question.allowMultiple = true  → <input type="checkbox">
Multi-answer storage: "optionA,optionB" (comma-separated)
```

## 6.8 Save Status Indicator

```
"saving..."  → debounce timer active or request in-flight
"✓ Saved"    → last saveAnswer succeeded
"⚠ Failed"   → last saveAnswer failed (show retry hint)
```

---

# 7. Folder & Module Structure

```
src/
├── app/
│   ├── api/
│   │   ├── save-answer/
│   │   │   └── route.ts              # sendBeacon endpoint (POST)
│   │   ├── exam-timer/
│   │   │   └── [submissionId]/
│   │   │       └── route.ts          # SSE timer stream (GET)
│   │   └── cron/
│   │       └── auto-submit/
│   │           └── route.ts          # Vercel Cron Job (GET) [Phase 2]
│   │
│   └── (dashboard)/
│       └── list/
│           └── exams/
│               ├── page.tsx          # Exam list (existing — add "New Exam" button)
│               ├── create-workflow/
│               │   └── page.tsx      # Server component — fetch relatedData
│               └── [examId]/
│                   ├── take/
│                   │   └── page.tsx  # Student exam page (server → ExamClient)
│                   └── grade/
│                       └── page.tsx  # Teacher manual grading [Phase 2 UI]
│
├── components/
│   ├── exam/
│   │   ├── ExamClient.tsx            # Main orchestrator (client component)
│   │   ├── ExamTimer.tsx             # SSE consumer + display
│   │   ├── QuestionRenderer.tsx      # Renders by QuestionType
│   │   └── FreezeOverlay.tsx         # Network disconnect UI
│   └── forms/
│       └── ExamWorkflowForm.tsx      # Create exam with questions
│
├── lib/
│   ├── actions/
│   │   ├── examWorkflow.actions.ts   # All exam workflow Server Actions
│   │   └── index.ts                  # Re-export everything (existing pattern)
│   ├── storage.ts                    # uploadFile / deleteFile abstraction
│   ├── prisma.ts                     # Prisma client singleton (existing)
│   ├── auth.ts                       # requireActionAccess helper (existing)
│   ├── utils.ts                      # Add: debounce utility
│   └── formValidationSchemas.ts      # Add: exam workflow Zod schemas
│
└── prisma/
    └── schema.prisma                 # Extended with new models
```

---

# 8. Technical Constraints

## Security Requirements
| Rule | Implementation |
|------|----------------|
| Server owns all timestamps | `savedAt`, `lastSyncedAt`, `submittedAt` always `new Date()` server-side |
| Client never provides time | SSE streams `timeRemaining` — client displays only |
| `lastSyncedAt` anti-cheat | `saveAnswer` rejects if gap > 60s (offline student) |
| Ownership validation | Every action validates `submission.studentId === currentUserId` |
| Question access control | Server-side pagination — client never receives future pages |
| Duplicate submission prevention | `@@unique([examId, studentId])` at DB level |
| Grade authority | Only exam owner (teacher) or admin can call `gradeAnswer` |
| Score bounds | `gradeAnswer` rejects `score > question.points` or `score < 0` |

## Performance Constraints
| Concern | Rule |
|---------|------|
| SSE connections | One persistent connection per active student — acceptable for school scale |
| Debounce | 1s — reduces save calls significantly vs. per-keystroke |
| Pagination | `questionsPerPage` fetches — never load entire exam at once |
| DB indexes | `@@index` on all FKs and frequently queried fields |
| Transaction | `createExamWorkflow` uses `prisma.$transaction` for atomic multi-class creation |

## Forbidden Patterns
```
❌ Client-side timer computation of any kind
❌ localStorage for answer persistence
❌ Client-provided savedAt, submittedAt, or any timestamp
❌ insert instead of upsert for Answer records
❌ Trusting client for submission status changes
❌ Skipping lastSyncedAt validation in saveAnswer
❌ Fetching all exam questions in one query (bypass pagination)
❌ WebSocket (not compatible with Next.js Serverless)
```

## Required Libraries
```
prisma              ORM
@clerk/nextjs       Auth
react-hook-form     Form management
@hookform/resolvers Zod integration
zod                 Schema validation
react-toastify      User feedback
lucide-react        Icons
```

## Coding Standards
- Follow existing project patterns: `requireActionAccess`, `successResult`, `errorResult`, `CurrentState`
- Every new model must include `schoolId Int` + `@@index([schoolId])`
- All IDs: `Int @id @default(autoincrement())` except User IDs (`String` from Clerk)
- Forms use `react-hook-form` + `zodResolver`
- Server Actions return `CurrentState` compatible objects
- API Routes use `auth()` from Clerk directly

---

# 9. AI Coding Agent Instructions

1. **Never compute time on the client** — SSE stream from `/api/exam-timer` is the only time source
2. **Always use `upsert`** for Answer records — never `update` or plain `create`
3. **Always set `savedAt = new Date()`** server-side — never accept from client payload
4. **Always validate `lastSyncedAt`** in `saveAnswer` — reject if gap > 60 seconds
5. **Always validate question ownership** — `question.examId === submission.examId`
6. **`/api/save-answer` must authenticate with Clerk** via `auth()` — same as Server Actions
7. **SSE route must re-read `extraTime` from DB each tick** — not cached from connection open
8. **`autoGrade` runs synchronously after `submitExam`** — do not defer or queue
9. **`finalizeGrade` checks ALL answers scored** before updating status to GRADED
10. **Follow existing schema conventions** — `schoolId` on every model, `@@index([schoolId])`
11. **Do not add WebSocket** — SSE + Server Actions is the confirmed architecture
12. **Do not implement Pusher or Visibility API** in Phase 1
13. **`lib/storage.ts` must remain the only file changed** when migrating to Cloudinary Phase 2
14. **`prisma.$transaction`** required for `createExamWorkflow` — atomic per-class exam creation
15. **`debounce` utility in `lib/utils.ts`** must expose `.flush()` for immediate save on page change

---

# 10. Code Quality & Engineering Standards

## Principles Applied
- **Single Responsibility**: each Server Action does one thing — validate, operate, return
- **Separation of Concerns**: storage abstraction in `lib/storage.ts`, auth in `lib/auth.ts`, validation in `formValidationSchemas.ts`
- **Composition**: `ExamClient` composes `ExamTimer`, `QuestionRenderer`, `FreezeOverlay`
- **Strong Typing**: all Server Actions typed with Zod-inferred types, Prisma-generated types used throughout
- **Error Boundaries**: every Server Action wrapped in try/catch, API Routes return proper HTTP status codes
- **No Premature Abstraction**: storage abstraction exists because Phase 2 migration is confirmed — not speculative
- **Meaningful Comments**: only where non-obvious logic exists (e.g., `lastSyncedAt` anti-cheat check)

## Naming Conventions
```
Server Actions    → camelCase verb+noun: createExamWorkflow, startExam, saveAnswer
API Routes        → kebab-case directories: /api/save-answer, /api/exam-timer
Components        → PascalCase: ExamClient, ExamTimer, FreezeOverlay
Prisma models     → PascalCase: Exam, Question, Submission, Answer
DB fields         → camelCase: startedAt, lastSyncedAt, autoSubmitted
Zod schemas       → camelCase + Schema suffix: createExamWorkflowSchema
Zod types         → PascalCase + Schema suffix: CreateExamWorkflowSchema
```

---

# 11. Missing / Ambiguous Areas

## Needs Clarification
- **Cron Job platform**: Is the project deploying to Vercel? Required for `autoSubmitExpired` Cron Job. Alternative: Neon Scheduled Queries or pg_cron.
- **FILE answer upload flow**: `QuestionRenderer` currently captures file name only — full `uploadFile()` integration in `saveAnswer` not yet wired. Needs a dedicated file upload handler before `saveAnswer` is called.

## Undefined Edge Cases
- **Teacher deletes exam with active submissions**: `onDelete: Cascade` on `Question` will delete questions but `Submission`/`Answer` may orphan. Recommendation: prevent deletion if active `IN_PROGRESS` submissions exist.
- **Student in multiple classes**: If student is enrolled in two classes that both have the same exam, they may have two submissions. Currently `@@unique([examId, studentId])` prevents this — but exam is created per class (multiple Exam rows). Behavior is correct but should be documented.
- **MCQ correctAnswer validation**: `correctAnswer` values must be a subset of `options`. Currently validated in Zod schema but not re-validated server-side in `autoGrade`. Add server-side check.

## Unconfirmed Architecture Decisions
- Vercel Cron Jobs availability for `autoSubmitExpired`
- Whether `Super Admin` role (mentioned as future) needs visibility into all school exams

---

# 12. Recommended Implementation Order

```
Phase 1 — Foundation
  [x] 1.  Add QuestionType, SubmissionStatus enums to schema.prisma
  [x] 2.  Extend Exam model (toggle fields + relations)
  [x] 3.  Add Question, Submission, Answer models
  [x] 4.  Add relations to School and Student
  [x] 5.  npx prisma migrate dev --name exam-workflow
  [ ] 6.  Verify tables in Prisma Studio

Phase 2 — Validation Layer
  [x] 7.  Add questionSchema, createExamWorkflowSchema to formValidationSchemas.ts
  [x] 8.  Add saveAnswerSchema, gradeAnswerSchema, extendTimeSchema

Phase 3 — Server Actions
  [x] 9.  createExamWorkflow
  [x] 10. startExam
  [x] 11. getExamPage
  [x] 12. saveAnswer (with lastSyncedAt validation)
  [x] 13. submitExam (with grace period)
  [x] 14. autoGrade
  [x] 15. gradeAnswer + finalizeGrade
  [x] 16. extendTime
  [x] 17. recordDisconnection
  [x] 18. Export all from actions/index.ts

Phase 4 — API Routes
  [x] 19. /api/save-answer (sendBeacon — POST)
  [x] 20. /api/exam-timer/[submissionId] (SSE — GET)
  [ ] 21. /api/cron/auto-submit (Vercel Cron — pending confirmation)

Phase 5 — Utilities
  [x] 22. lib/storage.ts (uploadFile, deleteFile, validateFile)
  [x] 23. lib/utils.ts — add debounce with .flush()

Phase 6 — UI Components
  [x] 24. ExamTimer.tsx (SSE consumer)
  [x] 25. FreezeOverlay.tsx (network disconnect)
  [x] 26. QuestionRenderer.tsx (all 4 question types)
  [x] 27. ExamClient.tsx (main orchestrator)
  [x] 28. ExamWorkflowForm.tsx (create exam with questions)

Phase 7 — Pages
  [x] 29. /list/exams/create-workflow/page.tsx (teacher)
  [x] 30. /list/exams/[examId]/take/page.tsx (student)
  [ ] 31. /list/exams/[examId]/grade/page.tsx (teacher manual grading — Phase 2)

Phase 8 — Integration & Testing
  [ ] 32. Seed script: create test exam with all 4 question types
  [ ] 33. Test all Server Actions with real data
  [ ] 34. Test network disconnect → reconnect flow
  [ ] 35. Test timer with teacher time extension
  [ ] 36. Test sendBeacon on tab close
  [ ] 37. Add "New Exam" button to /list/exams/page.tsx
  [ ] 38. Add "Take Exam" button for student role in exam list

Phase 9 — Deferred (Phase 2)
  [ ] Pusher live monitoring dashboard
  [ ] Visibility API tab-switch tracking
  [ ] Cloudinary file upload migration
  [ ] Auto-submit Cron Job deployment
  [ ] Teacher grading page UI
```

---

# 13. Testing & Validation

## Unit Tests

| Target | Test Cases |
|--------|-----------|
| `autoGrade` | T/F correct, T/F wrong, MCQ single correct, MCQ multi correct, MCQ partial → 0 |
| `finalizeGrade` | Skips if any null score, runs if all scored, correct totalScore |
| `getExamPage` | SKIP/TAKE math, rejects page < currentPage when !allowNavigation, rejects page skip |
| `saveAnswer` | Rejects lastSyncedAt > 60s, rejects wrong exam's question, upsert creates then updates |
| `extendTime` | SSE reflects new examEndsAt, rejects SUBMITTED submission |
| `debounce` | Fires once on rapid calls, flush() triggers immediately |

## Integration Tests

| Scenario | Expected |
|----------|---------|
| Full exam flow | create → start → answer all → submit → GRADED |
| Student A accesses Student B submission | 401 Unauthorized |
| Teacher grades another teacher's exam | 401 Unauthorized |
| Double submission | DB unique constraint error → graceful rejection |
| Submit after grace period | 400 Submission window closed |
| MCQ with partial correct answer | score = 0 |
| All auto-gradeable questions | status = GRADED immediately |
| Mixed question types | status = SUBMITTED until teacher grades TEXT/FILE |

## Edge Case Tests

| Case | Expected |
|------|---------|
| `beforeunload` fires mid-debounce | sendBeacon delivers latest answer |
| Teacher extends time while student is on exam | SSE reflects new endTime within 1 second |
| Student opens exam from two tabs | Second tab finds existing `IN_PROGRESS` submission and resumes |
| Network cuts mid-answer | Freeze after 3s, answer not lost (already debounced to server) |
| Network cuts before first debounce | Answer in pendingAnswersRef → sendBeacon on freeze/close |
| `questionsPerPage` = 0 or negative | Zod validation rejects at form level |

## Security Tests

| Attack | Defense |
|--------|---------|
| Client sends fake `savedAt` | Server ignores — always uses `new Date()` |
| Student modifies `submissionId` in request | Ownership check: `submission.studentId !== userId` → reject |
| Student requests page 5 when currentPage = 2, allowNavigation = false | Server rejects |
| Student removes FreezeOverlay from DevTools | `saveAnswer` rejects: `lastSyncedAt` gap > 60s |
| Score > question.points submitted | `gradeAnswer` rejects |
| Timer manipulation (device clock change) | Timer computed server-side — unaffected |

---

# 14. Final Engineering Notes

1. **The SSE timer is the cornerstone of exam integrity** — any degradation here affects fairness for all students
2. **`lastSyncedAt` is the anti-cheat backbone** — validated on every `saveAnswer`; without it, screen freeze is cosmetic only
3. **`upsert` is non-negotiable** — any other pattern risks data loss on first answer or duplicates on re-answer
4. **`sendBeacon` is a safety net, not primary** — Debounce handles 99% of saves; `sendBeacon` handles the tab-close edge case
5. **`lib/storage.ts` abstraction is a hard requirement** — Phase 2 Cloudinary migration must require zero changes outside this file
6. **Server Actions are the default** — API Routes exist only where technically forced (SSE streaming, sendBeacon format)
7. **Cron Job is backup layer** — client SSE auto-submits in normal flow; Cron handles disconnected/closed browser cases
8. **Schema follows existing project conventions without exception** — `schoolId` on every model, `Int` IDs, `String` user IDs
9. **Docker removes the `directUrl` requirement** — simpler connection config than Neon
10. **Phase 2 items (Pusher, Visibility API, Cron, Cloudinary) are architecturally non-breaking** — Phase 1 is designed to accommodate them without refactoring
