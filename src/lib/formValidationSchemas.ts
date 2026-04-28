import z from "zod";

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()),
});

export type SubjectSchema = z.infer<typeof subjectSchema>;
//////////////////////////////////////////
export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Class name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade ID is required!" }),
  supervisorId: z.coerce.string().optional(),
});

export type ClassSchema = z.infer<typeof classSchema>;
/////////////////////////////////////////////////////////////

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(4, { message: "Username must be at least 4 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().min(1, { message: "Address Type is required!" }),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  subjects: z.array(z.string()).optional(), // subject ids
  subjectClassPairs: z
    .array(
      z.object({
        subjectId: z.string().min(1, { message: "Subject is required!" }),
      }),
    )
    .min(1, { message: "Add at least one subject!" }),
});

export type TeacherSchema = z.infer<typeof teacherSchema>;
/////////////////////////////////////////////////////////////

export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(4, { message: "Username must be at least 4 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(10, { message: "Phone number must be at least 10 characters long!" })
    .max(10, { message: "Phone number must be at most 10 characters long!" })
    .optional(),
  address: z.string().min(1, { message: "Address Type is required!" }),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
  classId: z.coerce.number().min(1, { message: "Class is required!" }),
  parentId: z.string().min(1, { message: "Parent Id is required!" }),
  status: z.enum(["ACTIVE", "REPEATED", "GRADUATED", "LEFT"]).optional(),
});

export type StudentSchema = z.infer<typeof studentSchema>;
/////////////////////////////////////////////////////////////

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(4, { message: "Username must be at least 4 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(10, { message: "Phone number must be at least 10 characters long!" })
    .max(10, { message: "Phone number must be at most 10 characters long!" }),
  address: z.string().min(1, { message: "Address Type is required!" }),
  students: z.array(z.string()).optional(), // students ids
});

export type ParentSchema = z.infer<typeof parentSchema>;

////////////////////////////////////////////////////////////////////

export const lessonSchema = z
  .object({
    id: z.coerce.number().optional(),
    name: z.string().min(1, { message: "Lesson name is required!" }),
    day: z.enum(
      ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"],
      {
        message: "Day is required!",
      },
    ),
    startTime: z.coerce.date({ message: "Start time is required!" }),
    endTime: z.coerce.date({ message: "End time is required!" }),
    subjectId: z.coerce.number().min(1, { message: "Subject is required!" }),
    classId: z.coerce.number().min(1, { message: "Class is required!" }),
    teacherId: z.string().min(1, { message: "Teacher is required!" }),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time!",
    path: ["endTime"],
  });

export type LessonSchema = z.infer<typeof lessonSchema>;

export const lessonDays = [
  "SATURDAY",
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
] as const;

const MAX_LESSON_SLOTS_PER_DAY = 12;

export const lessonScheduleSchema = z
  .object({
    classId: z.coerce.number().min(1, { message: "Class is required!" }),
    entries: z
      .array(
        z.object({
          day: z.enum(lessonDays, { message: "Day is required!" }),
          slot: z.coerce
            .number()
            .int()
            .min(1, {
              message: `Slot must be between 1 and ${MAX_LESSON_SLOTS_PER_DAY}.`,
            })
            .max(MAX_LESSON_SLOTS_PER_DAY, {
              message: `Slot must be between 1 and ${MAX_LESSON_SLOTS_PER_DAY}.`,
            }),
          subjectId: z.preprocess(
            (value) => (value === "" || value == null ? null : value),
            z.coerce.number().min(1).nullable(),
          ),
          teacherId: z.preprocess(
            (value) => (value === "" || value == null ? null : value),
            z.string().nullable(),
          ),
        }),
      )
      .min(lessonDays.length, { message: "Schedule entries are required." }),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    let selectedCount = 0;

    data.entries.forEach((entry, index) => {
      const key = `${entry.day}-${entry.slot}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate lesson slot found.",
          path: ["entries"],
        });
        return;
      }
      seen.add(key);

      if (entry.subjectId && entry.subjectId > 0) {
        selectedCount += 1;

        if (!entry.teacherId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Select a teacher",
            path: ["entries", index, "teacherId"],
          });
        }
      }
    });

    if (selectedCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one subject in the weekly schedule.",
        path: ["entries"],
      });
    }
  });

export type LessonScheduleSchema = z.infer<typeof lessonScheduleSchema>;

export const schoolSettingsSchema = z
  .object({
    workDayStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Invalid start time." }),
    workDayEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Invalid end time." }),
    lessonDurationMinutes: z.coerce
      .number()
      .int()
      .min(15, { message: "Lesson duration must be at least 15 minutes." })
      .max(180, { message: "Lesson duration cannot exceed 180 minutes." }),
    lessonsPerDay: z.coerce
      .number()
      .int()
      .min(1, { message: "Lessons per day must be at least 1." })
      .max(12, { message: "Lessons per day cannot exceed 12." }),
  })
  .superRefine((data, ctx) => {
    const [startHour, startMinute] = data.workDayStart.split(":").map(Number);
    const [endHour, endMinute] = data.workDayEnd.split(":").map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (endMinutes <= startMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Work day end must be after work day start.",
        path: ["workDayEnd"],
      });
      return;
    }

    const totalLessonMinutes = data.lessonDurationMinutes * data.lessonsPerDay;
    const availableMinutes = endMinutes - startMinutes;

    if (totalLessonMinutes > availableMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Total lessons duration exceeds the available work day time window.",
        path: ["lessonsPerDay"],
      });
    }
  });

export type SchoolSettingsSchema = z.infer<typeof schoolSettingsSchema>;

export const academicYearSchema = z
  .object({
    id: z.coerce.number().optional(),
    name: z.string().min(1, { message: "Academic year name is required." }),
    startDate: z.coerce.date({ message: "Start date is required." }),
    endDate: z.coerce.date({ message: "End date is required." }),
    isCurrent: z.coerce.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Academic year end date must be after start date.",
        path: ["endDate"],
      });
    }
  });

export type AcademicYearSchema = z.infer<typeof academicYearSchema>;

////////////////////////////////////////////////////////////////////

export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Exam title is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  subjectId: z.coerce.number().min(1, { message: "Subject is required!" }),
  classIds: z
    .array(z.coerce.number())
    .min(1, { message: "At least one class is required!" }),
});

export type ExamSchema = z.infer<typeof examSchema>;

export const assignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Assignment title is required!" }),
  startDate: z.coerce.date({ message: "Start date is required!" }),
  endDate: z.coerce.date({ message: "End date is required!" }),
  subjectId: z.coerce.number().min(1, { message: "Subject is required!" }),
  classIds: z
    .array(z.coerce.number())
    .min(1, { message: "At least one class is required!" }),
});

export type AssignmentSchema = z.infer<typeof assignmentSchema>;

export const resultSchema = z.object({
  id: z.coerce.number().optional(),
  studentId: z.string().min(1, { message: "Student is required!" }),
  score: z.coerce
    .number()
    .min(0, { message: "Score must be at least 0!" })
    .max(100, { message: "Score cannot be greater than 100!" }),
  assessmentType: z.enum(["exam", "assignment"], {
    message: "Assessment type is required!",
  }),
  assessmentId: z.coerce
    .number()
    .min(1, { message: "Assessment is required!" }),
});

export type ResultSchema = z.infer<typeof resultSchema>;
////////////////////////////////////////////////////////////////////////////////////
export const attendanceBulkSchema = z.object({
  date: z.coerce.date({ message: "Date is required!" }),

  scope: z.enum(["students", "teachers"], {
    message: "Attendance scope is required!",
  }),

  classId: z.coerce.number().optional(),

  records: z
    .array(
      z.object({
        id: z.string().min(1, { message: "Record id is required!" }),
        present: z.boolean(),
      }),
    )
    .min(1, { message: "At least one attendance record is required!" }),
});

export type AttendanceBulkSchema = z.infer<typeof attendanceBulkSchema>;
////////////////////////////////////////////////////////////////////////////////////
export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Event title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  startDate: z.coerce.date({ message: "Start date is required!" }),
  endDate: z.coerce.date({ message: "End date is required!" }),
  classIds: z
    .array(z.coerce.number())
    .min(1, { message: "At least one class is required!" }),
});

export type EventSchema = z.infer<typeof eventSchema>;

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Announcement title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  classIds: z
    .array(z.coerce.number())
    .min(1, { message: "At least one class is required!" }),
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;

export const messageSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z.string().min(1, { message: "Message title is required!" }),
    description: z.string().min(1, { message: "Description is required!" }),
    date: z.coerce.date({ message: "Date is required!" }).optional(),
    classIds: z.array(z.coerce.number()).optional().default([]),
    studentIds: z.array(z.string()).optional().default([]),
    parentIds: z.array(z.string()).optional().default([]),
    teacherIds: z.array(z.string()).optional().default([]),
  })
  .refine(
    (data) =>
      (data.studentIds?.length ?? 0) +
        (data.parentIds?.length ?? 0) +
        (data.teacherIds?.length ?? 0) >
      0,
    {
      message: "Select at least one recipient.",
      path: ["studentIds"],
    },
  );

export type MessageSchema = z.infer<typeof messageSchema>;
