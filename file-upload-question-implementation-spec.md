# File Upload Question — Agent Execution Specification

**Stack:** Next.js 15 · TypeScript · Prisma · PostgreSQL · Cloudinary · Docker · Clerk Auth  
**Status:** Ready for implementation

---

## 1. Feature Summary

Add a `FILE` question type to the exam system that allows instructors to create questions requiring students to upload a single file as their answer. Files are stored in Cloudinary using **private delivery type** — they are never publicly accessible. Instructors download submitted files through a server-generated signed URL (1-hour validity). A daily cron job auto-submits abandoned exams and cleans up orphaned files.

---

## 2. Implementation Goal

When implementation is complete, the following must exist and function end-to-end:

1. Instructors can create/edit FILE questions with configurable constraints stored in `Question.options`.
2. Students can upload a single file per FILE question directly to Cloudinary using server-signed credentials. Upload progress is shown. Files are saved to the `Answer` record immediately on completion.
3. Students can replace or remove uploaded files. Replacing deletes the old file from Cloudinary immediately.
4. Exam timer expiry aborts any in-progress file upload and submits the exam with whatever is saved.
5. Instructors can download student-uploaded files from the grading view via a 302-redirect to a 1-hour signed Cloudinary URL.
6. A Docker-based cron job runs daily, auto-submits abandoned exams that have saved answers, and deletes orphaned Cloudinary files.
7. When a teacher opens the submissions list page, expired `IN_PROGRESS` submissions are auto-submitted before the page renders.
8. Editing questions is locked once an exam has started AND has at least one submission. Exam-level settings (title, timing, toggles) remain editable.

---

## 3. Existing System Context

### What Already Exists — Do Not Recreate

| Artifact | Path | Notes |
|---|---|---|
| `QuestionType.FILE` enum | `prisma/schema.prisma` | Already exists. No enum migration needed. |
| `Answer.fileUrl String?` | `prisma/schema.prisma` | Already exists. Four companion fields must be added. |
| `Submission.autoSubmitted Boolean` | `prisma/schema.prisma` | Already exists. Used by auto-submit logic. |
| `cloudinary.ts` | `src/lib/cloudinary.ts` | Configured with `cloudinary` npm package. Must be extended. |
| `storage.ts` | `src/lib/storage.ts` | Contains `validateFileUrl`. Must be updated. |
| `QuestionRenderer.tsx` | `src/components/exam/QuestionRenderer.tsx` | Has a FILE stub with fake `setTimeout` upload. Must be fully replaced. |
| `ExamClient.tsx` | `src/components/exam/ExamClient.tsx` | Manages exam state. Must be extended for upload tracking. |
| `ExamTimer.tsx` | `src/components/exam/ExamTimer.tsx` | Calls `onSubmit` when time expires. Already correct — `ExamClient.handleAutoSubmit` must abort uploads before calling `submitExam`. |
| `ExamWorkflowForm.tsx` | `src/components/forms/ExamWorkflowForm.tsx` | Has FILE in the type dropdown but no config panel. Must be extended. |
| `GradeClient.tsx` | `src/app/(dashboard)/list/exams/[examId]/submissions/[submissionId]/GradeClient.tsx` | Has a basic `<a href={answer.fileUrl}>` link. Must be replaced with secure download. |
| `examWorkflow.actions.ts` | `src/lib/actions/examWorkflow.actions.ts` | Contains `saveAnswer`, `submitExam`, `updateExamWorkflow`. Must be extended. |
| `formValidationSchemas.ts` | `src/lib/formValidationSchemas.ts` | Contains `saveAnswerSchema`, `questionSchema`. Must be extended. |
| `/api/save-answer` | `src/app/api/save-answer/route.ts` | Accepts JSON/form-urlencoded. Calls `saveAnswer` server action. No changes to the route file itself — only the schema and action. |
| `submissions/page.tsx` | `src/app/(dashboard)/list/exams/[examId]/submissions/page.tsx` | Must call `autoSubmitExpiredSubmissions` before querying submissions. |

### Existing Patterns to Follow

- **Server actions** use `requireActionAccess(roles)` from `src/lib/actions/helpers.ts` for auth.
- **API routes** use `getAuthUser()` from `src/lib/auth.ts`.
- **Error results** use `errorResult(err)` and `successResult(paths?)` from helpers.
- **Zod schemas** are defined in `formValidationSchemas.ts` and imported by both forms and server actions.
- **Cloudinary** is imported as `import cloudinary from "@/lib/cloudinary"` (default export, already configured).
- **Prisma** is imported as `import prisma from "@/lib/prisma"`.
- Tailwind class `academixPurpleDark` and `academixPurpleLight` are the brand colors.
- **Lucide React** is the icon library (`lucide-react` package exists in dependencies).

---

## 4. Functional Requirements

### Instructor

- FR-01: Instructor can create a FILE question. The question form shows a dedicated config panel with: allowed extensions (free-text, comma-separated), min file size (MB), max file size (MB), and instructions (plain text).
- FR-02: The FILE config panel hides the MCQ options builder, correct answer field, and model answer textarea.
- FR-03: The `points` field remains visible and editable for FILE questions.
- FR-04: `fileConfig` is serialized into `Question.options Json?` when `type === "FILE"`. For all other types, `options` stores the MCQ options array as before.
- FR-05: Empty `allowedExtensions` means all types are accepted (subject to server-side blocked list).
- FR-06: If instructor does not set min/max, defaults are: `minFileSizeMb = 0`, `maxFileSizeMb = 10`.

### Edit Lock Rules

- FR-07: Before `Exam.startTime` **OR** when zero submissions exist → full edit allowed (questions + settings).
- FR-08: After `Exam.startTime` AND at least one submission exists → only exam-level settings editable (title, startTime, endTime, enableTimer, duration, enableNavigation, enableAutoSave, autoSaveInterval, enableAutoSubmit, questionsPerPage). Questions array must NOT be updated.

### Student

- FR-09: Student sees FILE question with instructions text, accepted types, and max/min size.
- FR-10: File upload begins immediately on file selection (not on Submit).
- FR-11: Uploaded file URL and all metadata are saved to the `Answer` record immediately after successful upload via `POST /api/save-answer`.
- FR-12: Student can replace an uploaded file. Old Cloudinary file is deleted **immediately** before confirming the new file.
- FR-13: Student can remove an uploaded file. Cloudinary file is deleted immediately. `Answer` file fields are cleared.
- FR-14: On page reload, the previously uploaded file is shown as uploaded (state recovered from `Answer` record).
- FR-15: When exam timer expires, any in-progress upload is **aborted** and the exam is submitted with whatever is in the database.
- FR-16: Only one file per FILE question (v1).

### Grading

- FR-17: In grading view, FILE answers show: original filename, file size, MIME type, upload timestamp.
- FR-18: "Download File" button generates a 302 redirect to a 1-hour Cloudinary signed URL. The file downloads directly from Cloudinary to the teacher's device.
- FR-19: If student uploaded no file: show "No file submitted" — no download button.
- FR-20: FILE questions have no auto-grading. Score field is always null until teacher grades manually.

### Cleanup

- FR-21: A daily cron job (Docker service) processes all exams where `endTime + 24h < now` and status is `IN_PROGRESS`.
- FR-22: If abandoned submission has any saved answer (text or file), it is auto-submitted: `status = SUBMITTED`, `autoSubmitted = true`, `submittedAt = now`.
- FR-23: If abandoned submission has no content, its Cloudinary files are deleted and Answer records are cleared.
- FR-24: When teacher opens `/list/exams/[examId]/submissions`, the page server component calls `autoSubmitExpiredSubmissions(examId)` before querying submissions.

---

## 5. Non-Functional Requirements

- NFR-01: File bytes must **never** pass through the Next.js server. All uploads are browser → Cloudinary direct.
- NFR-02: All exam files use Cloudinary `type: "private"`. Direct URL access returns 404.
- NFR-03: Teacher file access uses 1-hour signed Cloudinary URLs generated server-side only.
- NFR-04: Upload signing tokens are valid for 5 minutes.
- NFR-05: System-wide maximum file size is 10 MB (defined as constant `EXAM_FILE_MAX_SIZE_MB = 10` in `formValidationSchemas.ts`).
- NFR-06: Exam file uploads use folder prefix `/exams/`. Assignment uploads are untouched.
- NFR-07: The cron cleanup job runs as a separate Docker service using `node-cron`.
- NFR-08: Rate limit: max 10 signing requests per `(studentId, examId)` per hour on `/api/exam-upload-signature`.

---

## 6. User Flows

### 6.1 Instructor Flow — Creating a FILE Question

```
Open Exam Creation → Add Question → Set type = "FILE"
  → FILE config panel appears:
      Allowed Extensions (text input, comma-separated, optional)
      Min File Size MB (number, default 0)
      Max File Size MB (number, default 10)
      Instructions (textarea, optional)
      Points (number, required)
  → MCQ options builder hidden
  → Correct answer field hidden
  → Save exam → fileConfig serialized into Question.options JSON
```

### 6.2 Student Flow — Answering a FILE Question

```
Student opens exam page → sees FILE question
  → Instructions shown (if provided)
  → Accepted types + max size shown
  → "Choose File" button (idle state)
      ↓ student selects file
  → Client-side validation (extension, size)
      ↓ valid
  → POST /api/exam-upload-signature
      ↓ receives { signature, timestamp, folder, apiKey, cloudName }
  → Upload to Cloudinary via XMLHttpRequest (progress bar shown)
      ↓ upload complete
  → POST /api/save-answer with file metadata
      ↓ saved
  → Uploaded state: filename, size, type, Replace + Remove buttons

  REPLACE:
    → New file selected → upload new file
    → On new file saved in DB → deleteExamFile(answerId) for old file
    → Update UI

  REMOVE:
    → deleteExamFile(answerId)
    → Clear UI → idle state

  TIMER EXPIRY during upload:
    → AbortController.abort()
    → submitExam() called immediately with saved state
```

### 6.3 Submission Flow

```
1. Student selects file → client validates
2. POST /api/exam-upload-signature → server validates, returns creds
3. XHR upload → Cloudinary → receives { secure_url, public_id, original_filename, format, bytes }
4. POST /api/save-answer → { submissionId, questionId, fileUrl, filePublicId, fileOriginalName, fileMimeType, fileSizeBytes }
5. Server upserts Answer record (all 5 file fields + savedAt)
6. If save fails: retry ×3 with 1s/2s/3s backoff → store pending in localStorage
7. On final submit: submitExam() → Answer.isDraft = false, Submission.status = SUBMITTED
```

### 6.4 Review Flow

```
Teacher opens /list/exams/[examId]/submissions
  → Server calls autoSubmitExpiredSubmissions(examId) first
  → Page renders with updated submission statuses

Teacher opens /list/exams/[examId]/submissions/[submissionId]
  → GradeClient shows FILE answer card:
      filename, size, MIME, upload time
      "Download File" button
  → Teacher clicks Download → GET /api/exam-files/[answerId]
  → Server validates teacher ownership
  → Server generates 1-hour signed URL
  → 302 redirect → file downloads directly from Cloudinary
  → Teacher enters score manually → gradeAnswer action
```

---

## 7. UI Requirements

### 7.1 Exam Creation Page — `ExamWorkflowForm.tsx`

**Component to add:** FILE config panel inside `QuestionEditor` component, rendered when `qType === "FILE"`.

**Panel contents:**
```
┌─────────────────────────────────────────────────────┐
│ 📎 File Upload Settings                              │
│                                                     │
│ Allowed File Extensions                             │
│ [text input — comma-separated, e.g. pdf, docx, jpg] │
│ "Leave empty to accept all file types"              │
│                                                     │
│ Min File Size (MB) [number]  Max File Size (MB) [number] │
│                              "System max: 10 MB"   │
│                                                     │
│ Instructions for Student (optional)                 │
│ [textarea, 3 rows]                                  │
│                                                     │
│ ℹ️ FILE questions are graded manually.              │
└─────────────────────────────────────────────────────┘
```

**Hidden when `qType === "FILE"`:**
- MCQ options builder
- Correct answer selector (radio/checkbox)
- Model answer textarea (TEXT type)

**Validation:**
- `minFileSizeMb` must be ≥ 0
- `maxFileSizeMb` must be ≥ 1 and ≤ 10
- `minFileSizeMb` must not exceed `maxFileSizeMb` (validated in `questionSchema.superRefine`)
- `allowedExtensions` stored as array: split by comma, trim, lowercase, strip leading dot

**Form registration pattern** (using existing `register` from `react-hook-form`):
```tsx
{...register(`questions.${index}.fileConfig.allowedExtensions`, {
  setValueAs: (v: string) =>
    typeof v === "string"
      ? v.split(",").map(s => s.trim().toLowerCase().replace(/^\./, "")).filter(Boolean)
      : [],
})}
```

### 7.2 Student Exam Page — `FileUploadRenderer.tsx` (new component)

**Location:** `src/components/exam/FileUploadRenderer.tsx`

**States:**

| State | UI |
|---|---|
| `idle` | Dashed border upload area with "Choose File" label + hidden `<input type="file">` |
| `uploading` | Filename + animated progress bar (0–100%) + "Uploading..." text |
| `uploaded` | Green card: ✅ filename, size, type + "Replace" label-button + "Remove" button |
| `removing` | "Removing file..." text with pulse animation |
| `error` | Red card: ❌ error message + "Try again" button → resets to idle |

**Props interface:**
```typescript
interface FileUploadRendererProps {
  answerId: number | null;           // null when Answer not yet created
  submissionId: number;
  examId: number;
  questionId: number;
  question: { id: number; options: unknown };
  initialFileUrl: string | null;
  initialFilePublicId: string | null;
  initialFileOriginalName: string | null;
  initialFileMimeType: string | null;
  initialFileSizeBytes: number | null;
  disabled?: boolean;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  onFileMetaSaved?: (meta: UploadedFile & { questionId: number }) => void;
}
```

**DOM attribute for upload abort:** The root `<div>` must have `data-file-upload-question={questionId}` and `(el as any).__abortUpload` must be set to a function that calls `abortController.abort()`. `ExamClient.handleAutoSubmit` queries these attributes to abort all in-progress uploads before calling `submitExam`.

**Upload uses `XMLHttpRequest`** (not `fetch`) because `fetch` does not expose upload progress events.

**Retry on DB save failure:** If `POST /api/save-answer` fails after a successful Cloudinary upload, retry ×3 with 1s/2s/3s delay. If all retries fail, store the file metadata in `localStorage` under key `exam_pending_file_{submissionId}_{questionId}` and show an error state.

### 7.3 Submission Review Page — `GradeClient.tsx`

**Current:** FILE answer renders `<a href={answer.fileUrl}>View uploaded file</a>`. This is insecure (public URL) and must be replaced.

**Required:** Replace the FILE answer section with:

```
┌─────────────────────────────────────────────────────┐
│ 📄 essay_final.pdf                                  │
│    Size: 2.3 MB  │  Type: PDF                       │
│    Uploaded: May 30, 2026 at 14:32                  │
│                                                     │
│ [⬇ Download File]                                   │
└─────────────────────────────────────────────────────┘
```

- "Download File" button → `href="/api/exam-files/{answer.id}"` → opens in new tab (browser follows 302 to signed URL, downloads file).
- If `answer.fileUrl` is null: show "No file submitted for this question." (no download button).
- `fileOriginalName`, `fileSizeBytes`, `fileMimeType`, `savedAt` come from the `Answer` record passed to `GradeClient`.

**`GradeClient` receives `Answer` records which now have the new file fields. The `Answer` type from Prisma will include them after migration.**

---

## 8. Data Model

### 8.1 Updated Entity: `Answer`

**Purpose:** Stores a student's response to one exam question. For FILE questions, stores Cloudinary file metadata.

**New fields to add (migration required):**

| Field | Type | Nullable | Purpose |
|---|---|---|---|
| `filePublicId` | `String?` | Yes | Cloudinary `public_id`. Required for deletion via API. |
| `fileOriginalName` | `String?` | Yes | Student's original filename (e.g. `essay.pdf`). Displayed in grading UI. |
| `fileMimeType` | `String?` | Yes | MIME type from Cloudinary (e.g. `raw/pdf`). Used to derive download format. |
| `fileSizeBytes` | `Int?` | Yes | File size in bytes. Displayed in grading UI. |

**Existing fields (unchanged):**

| Field | Notes |
|---|---|
| `fileUrl String?` | Now stores Cloudinary `secure_url` (private). Was previously local path. |
| `isDraft Boolean` | `true` until `submitExam` finalizes. Unchanged. |
| `savedAt DateTime` | Always set server-side. Unchanged. |

**Prisma schema diff:**
```prisma
model Answer {
  // ... all existing fields unchanged ...
  fileUrl          String?
  filePublicId     String?    // NEW
  fileOriginalName String?    // NEW
  fileMimeType     String?    // NEW
  fileSizeBytes    Int?       // NEW
  isDraft          Boolean    @default(true)
  // ...
}
```

### 8.2 Updated Entity: `Question`

**No new columns.** `fileConfig` is stored in the existing `Question.options Json?` field when `type === "FILE"`.

**FileConfig structure (TypeScript type):**
```typescript
type FileConfig = {
  allowedExtensions: string[]; // e.g. ["pdf","docx","jpg"] — empty = all allowed
  minFileSizeMb: number;       // default: 0
  maxFileSizeMb: number;       // default: 10
  instructions: string;        // plain text — empty string if not provided
};
```

**Contract:** When `type !== "FILE"`, `options` stores the MCQ options string array (unchanged behavior). The type field discriminates usage at the application layer.

**Type guard** (add to `formValidationSchemas.ts`):
```typescript
export const isFileConfig = (options: unknown): options is FileConfig => {
  if (!options || typeof options !== "object" || Array.isArray(options)) return false;
  const o = options as Record<string, unknown>;
  return (
    Array.isArray(o.allowedExtensions) &&
    typeof o.minFileSizeMb === "number" &&
    typeof o.maxFileSizeMb === "number" &&
    typeof o.instructions === "string"
  );
};
```

---

## 9. Database Changes

### Migration: `20260530120000_add_file_upload_fields`

Create file: `prisma/migrations/20260530120000_add_file_upload_fields/migration.sql`

```sql
ALTER TABLE "Answer" ADD COLUMN IF NOT EXISTS "filePublicId"     TEXT;
ALTER TABLE "Answer" ADD COLUMN IF NOT EXISTS "fileOriginalName" TEXT;
ALTER TABLE "Answer" ADD COLUMN IF NOT EXISTS "fileMimeType"     TEXT;
ALTER TABLE "Answer" ADD COLUMN IF NOT EXISTS "fileSizeBytes"    INTEGER;
```

**Safety:** All columns are nullable. No existing data is affected. No default values needed.

---

## 10. API Requirements

### 10.1 `POST /api/exam-upload-signature`

**File:** `src/app/api/exam-upload-signature/route.ts` (new file)

**Purpose:** Generates Cloudinary upload signature. Called by browser before each file upload.

**Auth:** Clerk session. Role must be `"student"`.

**Request body:**
```typescript
{
  examId: number;
  submissionId: number;
  questionId: number;
}
```

**Validation (in order):**
1. Parse body with Zod — `examId`, `submissionId`, `questionId` must be positive integers.
2. Clerk auth — must be authenticated.
3. Role check — must be `"student"`.
4. Rate limit — max 10 requests per `(userId, examId)` per hour. Use in-memory `Map`. Return 429 if exceeded.
5. Fetch `Submission` where `id = submissionId AND studentId = userId AND schoolId = user.schoolId AND status = "IN_PROGRESS"`.
6. Verify `submission.examId === examId`.
7. Verify `Exam.endTime > now`.
8. Fetch `Question` where `id = questionId AND examId = examId AND type = "FILE"`.

**Response (200):**
```typescript
{
  signature: string;   // HMAC-SHA256 from cloudinary.utils.api_sign_request
  timestamp: number;   // Math.floor(Date.now() / 1000)
  folder: string;      // "exams/{schoolId}/{examId}/{submissionId}/{questionId}"
  apiKey: string;      // process.env.CLOUDINARY_API_KEY
  cloudName: string;   // process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
}
```

**Signature generation:**
```typescript
const paramsToSign = { folder, resource_type: "raw", timestamp, type: "private" };
const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);
```

**Error responses:**

| Status | Condition |
|---|---|
| 400 | Invalid JSON, invalid param types |
| 401 | Not authenticated |
| 403 | Not a student, or submission not owned by this student |
| 400 | Exam time has expired |
| 400 | Submission is not IN_PROGRESS |
| 400 | Question not found or not FILE type |
| 429 | Rate limit exceeded |
| 500 | Internal error |

---

### 10.2 `GET /api/exam-files/[answerId]`

**File:** `src/app/api/exam-files/[answerId]/route.ts` (new file)

**Purpose:** Generates a 1-hour signed Cloudinary download URL and 302-redirects teacher's browser to it.

**Auth:** Clerk session. Role must be `"teacher"` or `"admin"`.

**Route params:** `answerId: string` → parse to integer.

**Authorization chain:**
1. Fetch `Answer` with `id = answerId` including `submission.exam.lesson` and `submission.schoolId`.
2. Verify `answer.submission.schoolId === user.schoolId`.
3. If `role === "teacher"`: verify `exam.lesson.teacherId === user.userId`.
4. If `role === "admin"`: school boundary check is sufficient.
5. Verify `answer.filePublicId` is not null.

**Logic:**
```typescript
// Derive format
let format = "bin";
if (answer.fileMimeType) {
  const parts = answer.fileMimeType.split("/");
  if (parts.length === 2 && parts[1]) format = parts[1];
} else if (answer.fileOriginalName) {
  const ext = answer.fileOriginalName.split(".").pop();
  if (ext) format = ext;
}

const signedUrl = cloudinary.utils.private_download_url(answer.filePublicId, format, {
  resource_type: "raw",
  type: "private",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  attachment: true,
});

return NextResponse.redirect(signedUrl, { status: 302 });
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Not authenticated |
| 403 | Not teacher/admin, or wrong school, or teacher doesn't own exam |
| 404 | Answer not found |
| 404 | Answer has no uploaded file (`filePublicId` is null) |
| 500 | Cloudinary signing failed |

---

### 10.3 `POST /api/save-answer` (existing route — no changes to route file)

**Changes required:** Update `saveAnswerSchema` and `saveAnswer` server action only.

**Extended schema fields** (add to `saveAnswerSchema` in `formValidationSchemas.ts`):
```typescript
filePublicId: z.string().nullable().optional(),
fileOriginalName: z.string().nullable().optional(),
fileMimeType: z.string().nullable().optional(),
fileSizeBytes: z.coerce.number().nullable().optional(),
```

**Extended `saveAnswer` server action** — update the Prisma upsert to include new fields:
```typescript
// In the upsert update block:
fileUrl: data.fileUrl ?? undefined,
filePublicId: data.filePublicId ?? undefined,
fileOriginalName: data.fileOriginalName ?? undefined,
fileMimeType: data.fileMimeType ?? undefined,
fileSizeBytes: data.fileSizeBytes ?? undefined,

// In the upsert create block:
fileUrl: data.fileUrl ?? null,
filePublicId: data.filePublicId ?? null,
fileOriginalName: data.fileOriginalName ?? null,
fileMimeType: data.fileMimeType ?? null,
fileSizeBytes: data.fileSizeBytes ?? null,
```

**`validateFileUrl` update** (in `src/lib/storage.ts`):
```typescript
export const validateFileUrl = (url: string): boolean => {
  if (url.startsWith("https://res.cloudinary.com/")) return true;
  return /^\/uploads\/\d+\/[^/]+\/\d+_[^/]+$/.test(url);
};
```

---

## 11. Cloudinary Integration

### Upload Flow (browser → Cloudinary direct)

```
Browser                     Your Server              Cloudinary
  |                              |                       |
  |-- POST /api/exam-upload-sig →|                       |
  |                              |-- validate student    |
  |                              |-- generate signature  |
  |←-- { sig, timestamp, folder }|                       |
  |                              |                       |
  |-- XHR POST (with formData) --------------------------------→|
  |                              |                       |-- store as private
  |←-- { secure_url, public_id, original_filename, format, bytes }
  |                              |                       |
  |-- POST /api/save-answer -----→|                      |
  |                              |-- upsert Answer       |
  |←-- { success: true }         |                       |
```

### Cloudinary Helper Functions (add to `src/lib/cloudinary.ts`)

```typescript
// 1. Generate upload signature
export const generateExamUploadSignature = (
  schoolId: number, examId: number, submissionId: number, questionId: number
): { signature: string; timestamp: number; folder: string; apiKey: string; cloudName: string } => {
  const folder = `exams/${schoolId}/${examId}/${submissionId}/${questionId}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, resource_type: "raw", timestamp, type: "private" };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);
  return { signature, timestamp, folder, apiKey: process.env.CLOUDINARY_API_KEY!, cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME! };
};

// 2. Generate 1-hour private download URL
export const generatePrivateDownloadUrl = (publicId: string, format: string): string => {
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "raw",
    type: "private",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    attachment: true,
  });
};

// 3. Delete private file (non-throwing)
export const deleteExamFileFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "private" });
  } catch (err) {
    console.error("[Cloudinary] Failed to delete exam file:", publicId, err);
  }
};
```

### Storage Structure

```
Cloudinary folder pattern:
exams/{schoolId}/{examId}/{submissionId}/{questionId}/

Example:
exams/1/42/101/7/

Assignment files (untouched):
assignments/{schoolId}/...
```

### Security Requirements

- Upload `type: "private"` — mandatory on every exam file upload.
- `resource_type: "raw"` — mandatory for non-image files.
- Signature covers: `folder`, `resource_type`, `timestamp`, `type` — prevents folder bypass attacks.
- Never use unsigned uploads.
- Teacher access always via server-generated signed URL — never expose raw Cloudinary URLs.

### Cleanup Strategy

The cleanup cron job (daily, 03:00):
1. Find all `Exam` where `endTime + 24h < now`.
2. For each, find `Submission` where `status = "IN_PROGRESS"`.
3. If submission has any non-empty `Answer.textAnswer` or `Answer.fileUrl` → auto-submit.
4. If submission is empty → delete Cloudinary files using `Answer.filePublicId`, clear Answer records.

---

## 12. Business Logic

### `deleteExamFile` server action (add to `examWorkflow.actions.ts`)

```
Purpose: Delete a student's uploaded exam file from Cloudinary and clear Answer file fields.
Auth: student role only.
Steps:
  1. requireActionAccess(["student"])
  2. Fetch Answer with id = answerId, include submission.{ studentId, schoolId, status }
  3. Verify submission.studentId === access.userId
  4. Verify submission.status === "IN_PROGRESS"
  5. If answer.filePublicId → await deleteExamFileFromCloudinary(answer.filePublicId) — non-throwing
  6. prisma.answer.update → set fileUrl/filePublicId/fileOriginalName/fileMimeType/fileSizeBytes = null, savedAt = now
  7. Return { success: true } or { success: false, error: string }
```

### `autoSubmitExpiredSubmissions` server action (add to `examWorkflow.actions.ts`)

```
Purpose: Server-side auto-submit for expired IN_PROGRESS submissions.
Auth: No auth check — called internally from page server component and cron.
Steps:
  1. Find all Submission where examId = examId AND status = "IN_PROGRESS"
     Include: exam.{ duration, endTime }, answers.{ textAnswer, fileUrl }
  2. For each submission:
     a. Calculate examEndsAt = startedAt + (exam.duration + extraTime) * 60000
     b. If now <= examEndsAt → skip (still active)
     c. hasContent = any answer has non-empty textAnswer OR non-empty fileUrl
     d. If hasContent:
        - Transaction: updateMany answers isDraft=false, update submission status=SUBMITTED, submittedAt=now, autoSubmitted=true
        - Call autoGrade(submission.id)
     e. If no content: skip (cron will clean up)
  3. Catch all errors silently (do not throw — page must still render)
```

### `updateExamWorkflow` Level 2 Edit Lock (update existing action)

Replace the current hard block (`"This exam cannot be edited..."`) with:

```
submissionCount = count of submissions for all group exams
examStarted = new Date() > existingExam.startTime
isLocked = examStarted AND submissionCount > 0

IF isLocked:
  → Transaction: update ONLY these fields on all group exams:
    title, startTime, endTime, enableTimer, duration, enableNavigation,
    enableAutoSave, autoSaveInterval, enableAutoSubmit, questionsPerPage
  → DO NOT touch questions, subjectId, classIds, lessonId
  → Return successResult(["/list/exams"])

ELSE (not locked):
  → Continue with existing full update logic (questions + settings)
```

### `createExamWorkflow` / `updateExamWorkflow` — fileConfig serialization

When building the `data` object for `prisma.question.create/createMany`:
```typescript
options: q.type === "FILE"
  ? (q.fileConfig ?? { allowedExtensions: [], minFileSizeMb: 0, maxFileSizeMb: 10, instructions: "" })
  : (q.options ?? []),
```

This stores `fileConfig` as the `options` JSON for FILE questions, and the MCQ options array for all other types.

### `submissions/page.tsx` — Add auto-submit call

At the top of the `ExamSubmissionsPage` server component, before fetching submissions:
```typescript
import { autoSubmitExpiredSubmissions } from "@/lib/actions/examWorkflow.actions";
// ...
// After fetching exam and verifying access:
await autoSubmitExpiredSubmissions(examId).catch(() => {}); // non-blocking
```

---

## 13. Frontend Logic

### `FileUploadRenderer.tsx` Upload Implementation

**Use `XMLHttpRequest`, not `fetch`,** for Cloudinary upload to get upload progress events.

```typescript
const uploadToCloudinary = (
  file: File,
  sig: SignatureResponse,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<CloudinaryUploadResponse> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sig.apiKey);
    formData.append("signature", sig.signature);
    formData.append("timestamp", String(sig.timestamp));
    formData.append("folder", sig.folder);
    formData.append("type", "private");
    formData.append("resource_type", "raw");

    const xhr = new XMLHttpRequest();
    signal.addEventListener("abort", () => xhr.abort());

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(`Upload failed: ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`);
    xhr.send(formData);
  });
};
```

**Abort pattern** (used by ExamClient for timer expiry):
```typescript
// In FileUploadRenderer — store controller in state:
const abortController = new AbortController();
setUploadState({ status: "uploading", ..., abortController });

// Set on DOM element so ExamClient can call it:
useEffect(() => {
  const el = document.querySelector(`[data-file-upload-question="${questionId}"]`) as any;
  if (el) el.__abortUpload = () => {
    if (uploadState.status === "uploading") uploadState.abortController.abort();
  };
});
```

**Replace flow (critical):** Old file must only be deleted AFTER the new file is confirmed saved in DB:
```
1. Select new file
2. Validate
3. Upload new file to Cloudinary
4. Save new file metadata to DB via /api/save-answer
5. IF step 4 succeeds → call deleteExamFile(answerId) for old file
6. IF step 3 or 4 fails → DO NOT delete old file (show error, old file preserved)
```

### `ExamClient.tsx` Changes

1. Add `answerRecords: Record<number, Answer>` state (initialized from `initialAnswers`).
2. Update `answers` initialization to include `fileUrl`: `ans.textAnswer || ans.fileUrl || ""`.
3. Update page-change handler to also update `answerRecords` from new page's saved answers.
4. Add `uploadingQuestionsRef = useRef<Set<number>>(new Set())`.
5. Update `handleAutoSubmit` and `handleSubmit` to abort uploads before calling `submitExam`:
   ```typescript
   if (uploadingQuestionsRef.current.size > 0) {
     document.querySelectorAll("[data-file-upload-question]").forEach((el) => {
       (el as any).__abortUpload?.();
     });
     await new Promise((r) => setTimeout(r, 100));
   }
   ```
6. Pass `savedAnswerRecord={answerRecords[q.id] || null}` to `QuestionRenderer`.
7. Pass `submissionId={submission.id}` and `examId={exam.id}` to `QuestionRenderer`.
8. Pass `onUploadStart` and `onUploadEnd` callbacks to `QuestionRenderer`.
9. For FILE questions, hide the saving status indicator (upload has its own UI).

### `QuestionRenderer.tsx` Changes

**Remove** the old FILE stub (fake `setTimeout` upload with `handleFileUpload`).

**Add** `FileUploadRenderer` for FILE type, passing all required props from the new interface:
```typescript
{question.type === "FILE" && (
  <FileUploadRenderer
    answerId={savedAnswerRecord?.id ?? null}
    submissionId={submissionId}
    examId={examId}
    questionId={question.id}
    question={question}
    initialFileUrl={savedAnswerRecord?.fileUrl ?? null}
    initialFilePublicId={(savedAnswerRecord as any)?.filePublicId ?? null}
    initialFileOriginalName={(savedAnswerRecord as any)?.fileOriginalName ?? null}
    initialFileMimeType={(savedAnswerRecord as any)?.fileMimeType ?? null}
    initialFileSizeBytes={(savedAnswerRecord as any)?.fileSizeBytes ?? null}
    disabled={disabled}
    onUploadStart={onUploadStart}
    onUploadEnd={onUploadEnd}
    onFileMetaSaved={(meta) => onChange(question.id, meta.fileUrl)}
  />
)}
```

**Update `QuestionRendererProps`** to include new props:
```typescript
interface QuestionRendererProps {
  question: Question;
  savedAnswer: string | null;
  savedAnswerRecord?: Answer | null;   // NEW — full Answer row for FILE metadata
  submissionId: number;                // NEW
  examId: number;                      // NEW
  onChange: (questionId: number, value: string) => void;
  disabled?: boolean;
  onUploadStart?: () => void;          // NEW
  onUploadEnd?: () => void;            // NEW
}
```

### `GradeClient.tsx` Changes

Replace the existing FILE answer section:
```tsx
// OLD (insecure):
{answer.question.type === "FILE" && answer.fileUrl ? (
  <a href={answer.fileUrl} target="_blank">View uploaded file</a>
) : ...}

// NEW (secure):
{answer.question.type === "FILE" ? (
  answer.fileUrl && (answer as any).filePublicId ? (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-700">
            {(answer as any).fileOriginalName ?? "Uploaded file"}
          </p>
          <p className="text-xs text-gray-400">
            {(answer as any).fileSizeBytes
              ? `${((answer as any).fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
              : ""}{" "}
            · {(answer as any).fileMimeType?.split("/")?.[1]?.toUpperCase() ?? "FILE"}
            · Uploaded {answer.savedAt
              ? new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" }).format(answer.savedAt)
              : ""}
          </p>
        </div>
      </div>
      <a
        href={`/api/exam-files/${answer.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-academixPurpleDark hover:underline font-medium"
      >
        <Download className="w-3.5 h-3.5" />
        Download File
      </a>
    </div>
  ) : (
    <span className="text-gray-400 italic text-sm">No file submitted.</span>
  )
) : /* existing text/MCQ/T-F display */ ...}
```

Add `import { Download, FileText } from "lucide-react"` to GradeClient imports.

---

## 14. State Management Requirements

### FileUploadRenderer State Machine

```typescript
type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number; fileName: string; abortController: AbortController }
  | { status: "uploaded"; file: UploadedFile }
  | { status: "error"; message: string; fileName?: string }
  | { status: "removing" };
```

**Transitions:**
```
idle ──[valid file selected]──────────────────→ uploading
idle ──[invalid file selected]────────────────→ idle (toast error, no state change)

uploading ──[progress event]──────────────────→ uploading (updated %)
uploading ──[upload + save success]───────────→ uploaded
uploading ──[upload or save error]────────────→ error
uploading ──[AbortController.abort()]─────────→ idle (silent, timer expiry case)

uploaded ──[Replace clicked]──────────────────→ idle → uploading (new file flow)
uploaded ──[Remove clicked]───────────────────→ removing
uploaded ──[disabled=true set]────────────────→ uploaded (locked, no buttons)

removing ──[Cloudinary delete + DB clear success]→ idle
removing ──[delete error]─────────────────────→ uploaded (restore + toast error)

error ──[Try again clicked]───────────────────→ idle
```

**Initial state derivation** (page reload recovery):
```typescript
const [uploadState, setUploadState] = useState<UploadState>(() => {
  if (initialFileUrl && initialFilePublicId && initialFileOriginalName) {
    return { status: "uploaded", file: { fileUrl: initialFileUrl, filePublicId: initialFilePublicId, ... } };
  }
  return { status: "idle" };
});
```

### ExamClient Upload Tracking

```typescript
// Added to ExamClient:
const uploadingQuestionsRef = useRef<Set<number>>(new Set());

// Passed to QuestionRenderer → FileUploadRenderer:
onUploadStart={() => uploadingQuestionsRef.current.add(q.id)}
onUploadEnd={() => uploadingQuestionsRef.current.delete(q.id)}

// Checked before submit:
const isUploadInProgress = () => uploadingQuestionsRef.current.size > 0;
```

---

## 15. Validation Rules

### Client-Side (FileUploadRenderer — before requesting signature)

| Rule | Logic |
|---|---|
| Blocked extension | `BLOCKED_EXTENSIONS.has(ext)` → reject regardless of instructor config |
| Allowed extension | If `fileConfig.allowedExtensions.length > 0`, extension must be in list (case-insensitive) |
| Min size | `file.size / (1024*1024) >= fileConfig.minFileSizeMb` (skip if minFileSizeMb === 0) |
| Max size | `file.size / (1024*1024) <= fileConfig.maxFileSizeMb` |

### Blocked Extensions (hardcoded, server-side constant in `formValidationSchemas.ts`)

```typescript
export const BLOCKED_EXTENSIONS = new Set([
  "exe","sh","bat","cmd","ps1","vbs","js","mjs","cjs",
  "py","rb","php","pl","java","class","jar","dll","so",
  "dylib","bin","com","scr","pif","reg",
]);
```

Apply on both client (for UX) and server (for security).

### Server-Side (signature endpoint)

- Submission must be `IN_PROGRESS`
- Exam must not be expired
- Question must be `FILE` type and belong to exam
- Rate limit: 10 requests per (studentId, examId) per hour

### Server-Side (save-answer)

- `fileUrl` must start with `https://res.cloudinary.com/` (via `validateFileUrl`)
- `filePublicId` must be non-empty if provided

### Zod Schema Updates

In `formValidationSchemas.ts`:

1. Add `EXAM_FILE_MAX_SIZE_MB = 10` constant.
2. Add `BLOCKED_EXTENSIONS` Set.
3. Add `FileConfig` type.
4. Add `isFileConfig` type guard function.
5. Add `fileConfigSchema`:
   ```typescript
   export const fileConfigSchema = z.object({
     allowedExtensions: z.array(z.string()).default([]),
     minFileSizeMb: z.coerce.number().min(0).default(0),
     maxFileSizeMb: z.coerce.number().min(1).max(EXAM_FILE_MAX_SIZE_MB).default(EXAM_FILE_MAX_SIZE_MB),
     instructions: z.string().default(""),
   });
   ```
6. Add `fileConfig: fileConfigSchema.optional()` to `questionSchema`.
7. Add `superRefine` rule: for FILE type, `fileConfig.minFileSizeMb <= fileConfig.maxFileSizeMb`.
8. Extend `saveAnswerSchema` with 4 new nullable optional fields.

---

## 16. Edge Cases

| # | Scenario | Expected Behavior | Handling Logic |
|---|---|---|---|
| EC-01 | Student refreshes page mid-upload | Upload is lost in browser. On reload, Answer record has old fileUrl (or null if upload was in-progress). UI recovers from Answer record state. | `initialFileUrl` prop drives initial state — if null, shows idle. If set from previous successful upload, shows uploaded. |
| EC-02 | Browser closed mid-upload | Upload may or may not complete in Cloudinary. DB may or may not have been updated. | Cleanup cron handles orphaned files after 24h. If URL was saved to DB before close, student sees it on return. |
| EC-03 | Upload completes, DB save fails | File exists in Cloudinary but Answer.fileUrl is null. Student sees error. | Retry ×3 with exponential backoff (1s, 2s, 3s). Store metadata in localStorage. Show error state after 3 failures. |
| EC-04 | Timer expires during upload | Upload must be aborted. Exam submitted with saved state (no file for that question). | `ExamClient.handleAutoSubmit` queries `[data-file-upload-question]` elements, calls `__abortUpload()` on each, waits 100ms, then calls `submitExam()`. |
| EC-05 | Replace: new upload fails | Old file must NOT be deleted. Old file stays in DB and Cloudinary. | Only call `deleteExamFile(oldAnswerId)` AFTER new file is confirmed saved in DB. If step 3 or 4 fails → show error, preserve old file. |
| EC-06 | Replace: old file deletion fails | New file is already saved. Log error. Old file becomes orphaned. | `deleteExamFileFromCloudinary` catches all errors and logs. Does not rethrow. Cron cleans it up. |
| EC-07 | Multiple browser tabs open | Both tabs can upload to same question. Last-write-wins on Answer upsert. Earlier tab's file becomes orphaned. | Cron cleanup handles orphaned file. DB record is consistent. |
| EC-08 | Exam deleted | Cascade `onDelete: Cascade` on Answer → Answer records deleted. Cloudinary files become orphaned. | Before deleting exam, collect all `Answer.filePublicId` values and delete from Cloudinary. This requires a cascade deletion hook or manual cleanup step in the delete exam action. |
| EC-09 | Instructor changes fileConfig after submissions | Must be impossible — question edit is locked once exam has started and has submissions. | Level 2 edit lock in `updateExamWorkflow` prevents question array updates when `isLocked = true`. |
| EC-10 | Network loss during upload | XHR fails. Error state shown with "Try again" button. Other questions' saved answers are unaffected. | XHR `onerror` → `reject(new Error("Network error"))` → `setUploadState({ status: "error", ... })`. |
| EC-11 | Student uploads file, timer expires before DB save completes | Timer calls abort. XHR is killed. DB save may or may not complete. | `submitExam` is called. If DB save completed (race win), file is included. If not, question has no file — teacher sees "No file submitted." |
| EC-12 | Student abandons exam (no submit, no network issue) | Submission stays `IN_PROGRESS` past exam endTime. | `autoSubmitExpiredSubmissions` called when teacher opens submissions page. Also called by daily cron after 24h. |
| EC-13 | Duplicate file selection (same file, same question) | Client detects `file.name + file.size` matches current uploaded file. Show warning before proceeding. | In `handleFileSelect`: check if `uploadState.status === "uploaded" && uploadState.file.fileOriginalName === file.name && uploadState.file.fileSizeBytes === file.size`. If match → `window.confirm("This file appears identical to the current upload. Replace anyway?")`. |
| EC-14 | DB save retry succeeds after localStorage backup | Cleanup localStorage key on retry success. Show uploaded state. | After successful retry: `localStorage.removeItem("exam_pending_file_{submissionId}_{questionId}")`, update state to uploaded. |

---

## 17. Security Requirements

| # | Requirement |
|---|---|
| SEC-01 | All exam files must use Cloudinary `type: "private"`. Direct URL access returns 404. Enforced in `generateExamUploadSignature` signature parameters. |
| SEC-02 | Upload credentials are server-signed with 5-minute expiry. Unsigned uploads are not permitted. |
| SEC-03 | `/api/exam-upload-signature` validates: student auth, submission ownership, exam active, question is FILE type — before generating any signature. |
| SEC-04 | `/api/exam-files/[answerId]` validates: teacher/admin auth, school boundary, teacher-lesson-exam ownership chain — before generating any signed URL. |
| SEC-05 | Signed download URLs expire after 1 hour. Generated server-side only. Never embedded in HTML. |
| SEC-06 | `BLOCKED_EXTENSIONS` is enforced server-side regardless of instructor config. Client-side check is UX only. |
| SEC-07 | Rate limit: 10 signing requests per (studentId, examId) per hour on signature endpoint. |
| SEC-08 | Cloudinary folder is scoped to `exams/{schoolId}/{examId}/{submissionId}/{questionId}` — students cannot upload outside their scope. |
| SEC-09 | `fileUrl` field in `saveAnswer` validated with `validateFileUrl()` — only `https://res.cloudinary.com/` URLs accepted for exam files. |
| SEC-10 | The `GradeClient` must never render `answer.fileUrl` directly as an `<a href>`. All teacher access goes through `/api/exam-files/[answerId]`. |

---

## 18. Acceptance Criteria

### Exam Creation
- [ ] Adding a FILE question shows the file config panel (extensions, min/max size, instructions, points).
- [ ] MCQ options builder and correct answer field are hidden for FILE type.
- [ ] `fileConfig` is stored in `Question.options` as JSON in the database.
- [ ] Empty extensions field → `allowedExtensions: []` stored (all types accepted).
- [ ] Min size > max size → Zod validation error shown, form cannot be submitted.
- [ ] After exam has started and has ≥1 submission → editing questions shows no change (settings-only update).
- [ ] Before exam starts or with zero submissions → all fields editable.

### File Upload (Student)
- [ ] Selecting a blocked extension (e.g. `.exe`) shows error, does not proceed to signature request.
- [ ] Selecting a file with disallowed extension shows error, does not proceed.
- [ ] Selecting a file below min size shows error.
- [ ] Selecting a file above max size shows error.
- [ ] Valid file triggers `POST /api/exam-upload-signature`, then XHR upload with progress bar.
- [ ] Uploaded state shows filename, size (MB), type (from MIME), Replace + Remove buttons.
- [ ] Page reload: previously uploaded file is shown as uploaded (recovered from Answer record).
- [ ] Replace: new file uploads, only after DB confirmation does old file delete from Cloudinary.
- [ ] Remove: file deleted from Cloudinary, Answer file fields cleared, UI returns to idle.
- [ ] Timer expiry with upload in-progress: upload is aborted, exam submits with saved state.
- [ ] Network error during upload: error state shown with retry button; other questions unaffected.

### Security
- [ ] Direct GET to a Cloudinary private URL (`https://res.cloudinary.com/...`) returns 404 or 401.
- [ ] `GET /api/exam-files/[answerId]` with valid teacher session returns 302 to working URL.
- [ ] `GET /api/exam-files/[answerId]` with student session returns 403.
- [ ] `GET /api/exam-files/[answerId]` with teacher who doesn't own the exam returns 403.
- [ ] Signed URL expires (manual test: modify timestamp in generated URL → access fails).
- [ ] Uploading with expired/invalid signature rejected by Cloudinary.

### Grading
- [ ] FILE answer card shows: filename, size (MB), type, upload timestamp.
- [ ] "Download File" link uses `/api/exam-files/{answerId}` — does NOT use `answer.fileUrl` directly.
- [ ] Clicking Download triggers file download to instructor's device.
- [ ] If no file uploaded: "No file submitted." shown, no download button.
- [ ] FILE question score starts as null, teacher can enter score manually.

### Auto-Submit & Cleanup
- [ ] Opening submissions page triggers auto-submit for expired IN_PROGRESS submissions with content.
- [ ] Cron script exits without error on a database with no abandoned submissions.
- [ ] Cron script auto-submits abandoned submissions that have answers.
- [ ] Cron script does not delete files belonging to successfully submitted submissions.

### Migration
- [ ] Running `prisma migrate deploy` succeeds without errors.
- [ ] `Answer` table has columns: `filePublicId`, `fileOriginalName`, `fileMimeType`, `fileSizeBytes`.
- [ ] Existing Answer records with `fileUrl` are not affected (columns are nullable).

---

## 19. Agent Implementation Instructions

1. **Read before writing.** Before modifying any file, read its full content using the file-reading tools. Understand existing patterns and abstractions.

2. **Follow existing conventions:**
   - Server actions: use `requireActionAccess`, `successResult`, `errorResult` from `src/lib/actions/helpers.ts`.
   - API routes: use `getAuthUser()` from `src/lib/auth.ts` for auth.
   - Zod schemas: extend `formValidationSchemas.ts`. Do not duplicate schemas elsewhere.
   - Import Prisma as `import prisma from "@/lib/prisma"`.
   - Import Cloudinary as `import cloudinary from "@/lib/cloudinary"` (default export).

3. **Do not break existing features:**
   - `storage.ts` `validateFileUrl` update must still accept legacy `/uploads/` paths.
   - `saveAnswerSchema` extension must use `.optional()` — existing callers without file fields must still work.
   - `QuestionRenderer` changes must not alter `TRUE_FALSE`, `MCQ`, or `TEXT` rendering.
   - `ExamClient` changes must not alter auto-save behavior for non-FILE questions.
   - `updateExamWorkflow` Level 2 lock must only affect question updates, not exam settings updates.

4. **Implement in this order:**
   1. Migration file + Prisma schema update.
   2. `formValidationSchemas.ts` additions (FileConfig types, schema updates).
   3. `storage.ts` `validateFileUrl` update.
   4. `cloudinary.ts` helper functions.
   5. `examWorkflow.actions.ts` — extend `saveAnswer`, add `deleteExamFile`, add `autoSubmitExpiredSubmissions`, update `updateExamWorkflow`.
   6. New API route: `POST /api/exam-upload-signature`.
   7. New API route: `GET /api/exam-files/[answerId]`.
   8. New component: `FileUploadRenderer.tsx`.
   9. Update: `QuestionRenderer.tsx`.
   10. Update: `ExamClient.tsx`.
   11. Update: `ExamWorkflowForm.tsx` — FILE config panel in `QuestionEditor`.
   12. Update: `GradeClient.tsx` — secure file display.
   13. Update: `submissions/page.tsx` — add auto-submit call.
   14. Create: `scripts/cleanup-cron.ts`.
   15. Update: `docker-compose.yml` — add cron service.

5. **Handle all edge cases** from Section 16. Do not skip any.

6. **Test each integration point:**
   - Verify `BLOCKED_EXTENSIONS` is applied before the signature request.
   - Verify old file is only deleted after new file's DB save succeeds (not before).
   - Verify `AbortController` is passed through state and called from `__abortUpload`.
   - Verify `autoSubmitExpiredSubmissions` is called before the submissions query in the page.

---

## 20. Definition of Done

The implementation is complete when ALL of the following are satisfied:

### Database
- [ ] Migration file `20260530120000_add_file_upload_fields/migration.sql` exists and is correct.
- [ ] `prisma/schema.prisma` `Answer` model has all 4 new nullable fields.
- [ ] Migration can be applied to an existing database without data loss.

### Schema & Validation
- [ ] `EXAM_FILE_MAX_SIZE_MB`, `BLOCKED_EXTENSIONS`, `FileConfig` type, `isFileConfig` guard, `fileConfigSchema` added to `formValidationSchemas.ts`.
- [ ] `questionSchema` has `fileConfig` field and `superRefine` check.
- [ ] `saveAnswerSchema` has 4 new nullable optional file fields.
- [ ] `validateFileUrl` in `storage.ts` accepts Cloudinary URLs.

### Cloudinary
- [ ] `cloudinary.ts` has `generateExamUploadSignature`, `generatePrivateDownloadUrl`, `deleteExamFileFromCloudinary`.

### Server Actions
- [ ] `saveAnswer` upserts all 5 file fields (fileUrl + 4 new fields).
- [ ] `deleteExamFile` server action exists, validates student ownership, deletes from Cloudinary, clears Answer fields.
- [ ] `autoSubmitExpiredSubmissions` server action exists, handles auto-submit and cleanup correctly.
- [ ] `updateExamWorkflow` implements Level 2 edit lock (settings-only when locked).
- [ ] `createExamWorkflow` and `updateExamWorkflow` serialize fileConfig into `Question.options` for FILE type.

### API Routes
- [ ] `POST /api/exam-upload-signature` exists with all validations and rate limiting.
- [ ] `GET /api/exam-files/[answerId]` exists with full authorization chain and 302 redirect.

### Components
- [ ] `FileUploadRenderer.tsx` exists with all 5 states, XHR upload, progress bar, retry logic, DOM abort attribute.
- [ ] `QuestionRenderer.tsx` replaces FILE stub with `FileUploadRenderer`, has updated props interface.
- [ ] `ExamClient.tsx` tracks uploading questions, passes `answerRecords`, aborts uploads on submit/auto-submit.
- [ ] `ExamWorkflowForm.tsx` shows FILE config panel when `qType === "FILE"`.
- [ ] `GradeClient.tsx` uses `/api/exam-files/[answerId]` for download, shows file metadata.

### Pages
- [ ] `submissions/page.tsx` calls `autoSubmitExpiredSubmissions(examId)` before fetching submissions.

### Cron
- [ ] `scripts/cleanup-cron.ts` exists, uses `node-cron`, runs at `0 3 * * *`, processes abandoned submissions correctly.
- [ ] `docker-compose.yml` has `cleanup-cron` service.

### Security Verification
- [ ] No raw Cloudinary private URL is rendered in any component's HTML.
- [ ] All teacher file access goes through `/api/exam-files/[answerId]`.
- [ ] Upload signature scopes folder to `exams/{schoolId}/{examId}/{submissionId}/{questionId}`.

### Backward Compatibility
- [ ] All existing question types (MCQ, TEXT, TRUE_FALSE) render and save identically to before.
- [ ] Existing Answer records with legacy `fileUrl` local paths are not broken by `validateFileUrl` update.
- [ ] `saveAnswerSchema` with only `{ submissionId, questionId, textAnswer }` still validates (new fields are optional).
- [ ] `updateExamWorkflow` without submissions still performs full update (not locked).
