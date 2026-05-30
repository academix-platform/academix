"use server";

import prisma from "@/lib/prisma";

type NotificationType =
  | "NEW_ASSIGNMENT"
  | "ASSIGNMENT_UPDATED"
  | "ASSIGNMENT_SUBMITTED"
  | "ASSIGNMENT_FEEDBACK"
  | "NEW_EXAM"
  | "GRADE_POSTED"
  | "GRADE_UPDATED"
  | "NEW_ANNOUNCEMENT"
  | "NEW_EVENT"
  | "SCHEDULE_UPDATED"
  | "ATTENDANCE_SAVED"
  | "SUPERVISOR_ASSIGNED"
  | "NEW_MESSAGE";

// ─── دالة مساعدة لإنشاء إشعار مع منع التكرار ────────────────────────────────
async function createNotification({
  schoolId,
  userId,
  userRole,
  type,
  title,
  body,
  link,
  deduplicateMinutes = 60, // منع التكرار خلال ساعة
}: {
  schoolId: number;
  userId: string;
  userRole: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  deduplicateMinutes?: number;
}) {
  // التحقق من وجود إشعار مشابه خلال الفترة المحددة
  const since = new Date(Date.now() - deduplicateMinutes * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type,
      title,
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  if (existing) return; // تجاهل التكرار

  await prisma.notification.create({
    data: { schoolId, userId, userRole, type, title, body, link: link ?? null },
  });
}

// ─── 1. واجب جديد → إشعار لكل طلاب الصف ─────────────────────────────────────
export async function notifyNewAssignment({
  schoolId,
  assignmentId,
  assignmentTitle,
  classId,
}: {
  schoolId: number;
  assignmentId: number;
  assignmentTitle: string;
  classId: number;
}) {
  const students = await prisma.student.findMany({
    where: { schoolId, classId },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: students.map((s) => ({
      schoolId,
      userId:   s.id,
      userRole: "student",
      type:     "NEW_ASSIGNMENT" as NotificationType,
      title:    "New Assignment",
      body:     `A new assignment "${assignmentTitle}" has been posted.`,
      link:     "/list/assignments",
    })),
  });
}

// ─── 2. تسليم واجب → إشعار للمعلم ───────────────────────────────────────────
export async function notifyAssignmentSubmitted({
  schoolId,
  assignmentId,
  assignmentTitle,
  studentName,
  teacherId,
}: {
  schoolId: number;
  assignmentId: number;
  assignmentTitle: string;
  studentName: string;
  teacherId: string;
}) {
  await createNotification({
    schoolId,
    userId:   teacherId,
    userRole: "teacher",
    type:     "ASSIGNMENT_SUBMITTED",
    title:    "Assignment Submitted",
    body:     `${studentName} submitted "${assignmentTitle}".`,
    link:     "/list/assignments",
  });
}

// ─── 3. Feedback من المعلم → إشعار للطالب ────────────────────────────────────
export async function notifyAssignmentFeedback({
  schoolId,
  studentId,
  assignmentTitle,
  teacherName,
}: {
  schoolId: number;
  studentId: string;
  assignmentTitle: string;
  teacherName: string;
}) {
  await createNotification({
    schoolId,
    userId:   studentId,
    userRole: "student",
    type:     "ASSIGNMENT_FEEDBACK",
    title:    "Feedback Received",
    body:     `${teacherName} left feedback on "${assignmentTitle}".`,
    link:     "/list/assignments",
  });
}

// ─── 4. اختبار جديد → إشعار لكل طلاب الصف ──────────────────────────────────
export async function notifyNewExam({
  schoolId,
  examTitle,
  classId,
  examId,
}: {
  schoolId: number;
  examTitle: string;
  classId: number;
  examId: number;
}) {
  const students = await prisma.student.findMany({
    where: { schoolId, classId },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: students.map((s) => ({
      schoolId,
      userId:   s.id,
      userRole: "student",
      type:     "NEW_EXAM" as NotificationType,
      title:    "New Exam",
      body:     `A new exam "${examTitle}" has been scheduled.`,
      link:     "/list/exams",
    })),
  });
}

// ─── 5. إعلان جديد → إشعار للجميع في المدرسة ────────────────────────────────
export async function notifyNewAnnouncement({
  schoolId,
  announcementTitle,
  targetClassIds,
}: {
  schoolId: number;
  announcementTitle: string;
  targetClassIds?: number[];
}) {
  const where = {
    schoolId,
    ...(targetClassIds?.length ? { classId: { in: targetClassIds } } : {}),
  };

  const [students, teachers] = await Promise.all([
    prisma.student.findMany({ where, select: { id: true } }),
    prisma.teacher.findMany({ where: { schoolId }, select: { id: true } }),
  ]);

  const notifs = [
    ...students.map((s) => ({
      schoolId,
      userId:   s.id,
      userRole: "student",
      type:     "NEW_ANNOUNCEMENT" as NotificationType,
      title:    "New Announcement",
      body:     announcementTitle,
      link:     null,
    })),
    ...teachers.map((t) => ({
      schoolId,
      userId:   t.id,
      userRole: "teacher",
      type:     "NEW_ANNOUNCEMENT" as NotificationType,
      title:    "New Announcement",
      body:     announcementTitle,
      link:     null,
    })),
  ];

  await prisma.notification.createMany({ data: notifs });
}

// ─── 6. رسالة جديدة → إشعار للمستقبل ────────────────────────────────────────
export async function notifyNewMessage({
  schoolId,
  recipientIds,
  recipientRole,
  senderName,
  messageTitle,
}: {
  schoolId: number;
  recipientIds: string[];
  recipientRole: string;
  senderName: string;
  messageTitle: string;
}) {
  await prisma.notification.createMany({
    data: recipientIds.map((id) => ({
      schoolId,
      userId:   id,
      userRole: recipientRole,
      type:     "NEW_MESSAGE" as NotificationType,
      title:    "New Message",
      body:     `${senderName}: ${messageTitle}`,
      link:     "/list/messages",
    })),
  });
}

// ─── 7. درجة جديدة → إشعار للطالب ───────────────────────────────────────────
export async function notifyGradePosted({
  schoolId,
  studentId,
  score,
  assessmentTitle,
  assessmentType,
}: {
  schoolId: number;
  studentId: string;
  score: number;
  assessmentTitle: string;
  assessmentType: "exam" | "assignment";
}) {
  await createNotification({
    schoolId,
    userId:   studentId,
    userRole: "student",
    type:     "GRADE_POSTED" as NotificationType,
    title:    "Grade Posted",
    body:     `Your ${assessmentType} "${assessmentTitle}" has been graded: ${score} points.`,
    link:     "/list/results",
  });
}

// ─── 8. حدث جديد → إشعار للطلاب والمعلمين ───────────────────────────────────
export async function notifyNewEvent({
  schoolId,
  eventTitle,
  targetClassIds,
}: {
  schoolId: number;
  eventTitle: string;
  targetClassIds?: number[];
}) {
  const where = {
    schoolId,
    ...(targetClassIds?.length ? { classId: { in: targetClassIds } } : {}),
  };

  const [students, teachers] = await Promise.all([
    prisma.student.findMany({ where, select: { id: true } }),
    prisma.teacher.findMany({ where: { schoolId }, select: { id: true } }),
  ]);

  const notifs = [
    ...students.map((s) => ({
      schoolId,
      userId:   s.id,
      userRole: "student",
      type:     "NEW_EVENT" as NotificationType,
      title:    "New Event",
      body:     `A new event "${eventTitle}" has been added.`,
      link:     "/list/events",
    })),
    ...teachers.map((t) => ({
      schoolId,
      userId:   t.id,
      userRole: "teacher",
      type:     "NEW_EVENT" as NotificationType,
      title:    "New Event",
      body:     `A new event "${eventTitle}" has been added.`,
      link:     "/list/events",
    })),
  ];

  if (notifs.length > 0) {
    await prisma.notification.createMany({ data: notifs });
  }
}

// ─── 9. حفظ الحضور → إشعار للأدمن ───────────────────────────────────────────
export async function notifyAttendanceSaved({
  schoolId,
  scope,
  date,
  count,
}: {
  schoolId: number;
  scope: "students" | "teachers";
  date: string;
  count: number;
}) {
  const admins = await prisma.admin.findMany({
    where: { schoolId },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      schoolId,
      userId:   a.id,
      userRole: "admin",
      type:     "ATTENDANCE_SAVED" as NotificationType,
      title:    "Attendance Saved",
      body:     `Attendance for ${count} ${scope} on ${date} has been recorded.`,
      link:     "/list/attendance",
    })),
  });
}

// ─── 10. تغيير الجدول → إشعار للمعلمين المتأثرين ────────────────────────────
export async function notifyScheduleUpdated({
  schoolId,
  classId,
}: {
  schoolId: number;
  classId: number;
}) {
  const lessons = await prisma.lesson.findMany({
    where: { schoolId, classId },
    select: { teacherId: true },
  });

  const teacherIds = [...new Set(lessons.map((l) => l.teacherId))];
  if (teacherIds.length === 0) return;

  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    select: { name: true },
  });

  await prisma.notification.createMany({
    data: teacherIds.map((id) => ({
      schoolId,
      userId:   id,
      userRole: "teacher",
      type:     "SCHEDULE_UPDATED" as NotificationType,
      title:    "Schedule Updated",
      body:     `The schedule for class "${classInfo?.name ?? classId}" has been updated.`,
      link:     "/list/lessons",
    })),
  });
}

// ─── Helper: جلب parentId من studentId ───────────────────────────────────────
async function getParentId(studentId: string): Promise<string | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { parentId: true },
  });
  return student?.parentId ?? null;
}

// ─── 11. درجة جديدة → إشعار للولي ───────────────────────────────────────────
export async function notifyParentGradePosted({
  schoolId,
  studentId,
  studentName,
  score,
  assessmentTitle,
  assessmentType,
}: {
  schoolId: number;
  studentId: string;
  studentName: string;
  score: number;
  assessmentTitle: string;
  assessmentType: "exam" | "assignment";
}) {
  const parentId = await getParentId(studentId);
  if (!parentId) return;

  await createNotification({
    schoolId,
    userId:   parentId,
    userRole: "parent",
    type:     "GRADE_POSTED" as NotificationType,
    title:    "Grade Posted",
    body:     `${studentName}'s ${assessmentType} "${assessmentTitle}" has been graded: ${score} points.`,
    link:     "/list/results",
  });
}

// ─── 12. إعلان جديد → إشعار للأولياء ────────────────────────────────────────
export async function notifyParentsNewAnnouncement({
  schoolId,
  announcementTitle,
  targetClassIds,
}: {
  schoolId: number;
  announcementTitle: string;
  targetClassIds?: number[];
}) {
  const where = {
    schoolId,
    ...(targetClassIds?.length ? { classId: { in: targetClassIds } } : {}),
  };

  const students = await prisma.student.findMany({
    where,
    select: { parentId: true },
  });

  const parentIds = [...new Set(
    students.map((s) => s.parentId).filter((id): id is string => !!id)
  )];

  if (parentIds.length === 0) return;

  await prisma.notification.createMany({
    data: parentIds.map((id) => ({
      schoolId,
      userId:   id,
      userRole: "parent",
      type:     "NEW_ANNOUNCEMENT" as NotificationType,
      title:    "New Announcement",
      body:     announcementTitle,
      link:     null,
    })),
  });
}

// ─── 13. حدث جديد → إشعار للأولياء ──────────────────────────────────────────
export async function notifyParentsNewEvent({
  schoolId,
  eventTitle,
  targetClassIds,
}: {
  schoolId: number;
  eventTitle: string;
  targetClassIds?: number[];
}) {
  const where = {
    schoolId,
    ...(targetClassIds?.length ? { classId: { in: targetClassIds } } : {}),
  };

  const students = await prisma.student.findMany({
    where,
    select: { parentId: true },
  });

  const parentIds = [...new Set(
    students.map((s) => s.parentId).filter((id): id is string => !!id)
  )];

  if (parentIds.length === 0) return;

  await prisma.notification.createMany({
    data: parentIds.map((id) => ({
      schoolId,
      userId:   id,
      userRole: "parent",
      type:     "NEW_EVENT" as NotificationType,
      title:    "New Event",
      body:     `A new event "${eventTitle}" has been added.`,
      link:     "/list/events",
    })),
  });
}

// ─── 14. رسالة جديدة → إشعار للأولياء ───────────────────────────────────────
export async function notifyParentsNewMessage({
  schoolId,
  parentIds,
  senderName,
  messageTitle,
}: {
  schoolId: number;
  parentIds: string[];
  senderName: string;
  messageTitle: string;
}) {
  if (parentIds.length === 0) return;

  await prisma.notification.createMany({
    data: parentIds.map((id) => ({
      schoolId,
      userId:   id,
      userRole: "parent",
      type:     "NEW_MESSAGE" as NotificationType,
      title:    "New Message",
      body:     `${senderName}: ${messageTitle}`,
      link:     "/list/messages",
    })),
  });
}

// ─── 15. تعيين معلم مشرفاً على صف ────────────────────────────────────────────
export async function notifyTeacherAssignedSupervisor({
  schoolId,
  teacherId,
  className,
}: {
  schoolId: number;
  teacherId: string;
  className: string;
}) {
  await createNotification({
    schoolId,
    userId:   teacherId,
    userRole: "teacher",
    type:     "SUPERVISOR_ASSIGNED" as NotificationType,
    title:    "Class Supervisor",
    body:     `You have been assigned as supervisor for class "${className}".`,
    link:     "/list/classes",
  });
}

// ─── 16. تحديث واجب → إشعار للطلاب ──────────────────────────────────────────
export async function notifyAssignmentUpdated({
  schoolId,
  assignmentTitle,
  classId,
}: {
  schoolId: number;
  assignmentTitle: string;
  classId: number;
}) {
  const students = await prisma.student.findMany({
    where: { schoolId, classId },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: students.map((s) => ({
      schoolId,
      userId:   s.id,
      userRole: "student",
      type:     "ASSIGNMENT_UPDATED" as NotificationType,
      title:    "Assignment Updated",
      body:     `The assignment "${assignmentTitle}" has been updated.`,
      link:     "/list/assignments",
    })),
  });
}

// ─── 17. تحديث درجة → إشعار للطالب ──────────────────────────────────────────
export async function notifyGradeUpdated({
  schoolId,
  studentId,
  score,
  assessmentTitle,
  assessmentType,
}: {
  schoolId: number;
  studentId: string;
  score: number;
  assessmentTitle: string;
  assessmentType: "exam" | "assignment";
}) {
  await createNotification({
    schoolId,
    userId:   studentId,
    userRole: "student",
    type:     "GRADE_UPDATED" as NotificationType,
    title:    "Grade Updated",
    body:     `Your ${assessmentType} "${assessmentTitle}" grade has been updated to ${score} points.`,
    link:     "/list/results",
  });
}