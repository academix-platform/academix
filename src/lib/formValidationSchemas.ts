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
    date: z.coerce.date({ message: "Date is required!" }),
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
