import "dotenv/config";
import { Day, PrismaClient, StudentStatus, UserSex } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const normalizeDay = (date: Date) => {
  const iso = date.toISOString().slice(0, 10);
  return new Date(`${iso}T00:00:00.000Z`);
};

const clearDatabase = async () => {
  await prisma.result.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.message.deleteMany();
  await prisma.event.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.studentAcademicYear.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.schoolSettings.deleteMany();
  await prisma.school.deleteMany();
};

const seedSchool = async ({
  schoolName,
  adminId,
  adminUsername,
  teacherId,
  teacherUsername,
  teacherName,
  parentId,
  parentUsername,
  parentName,
  studentId,
  studentUsername,
  studentName,
  className,
  subjectName,
}: {
  schoolName: string;
  adminId: string;
  adminUsername: string;
  teacherId: string;
  teacherUsername: string;
  teacherName: string;
  parentId: string;
  parentUsername: string;
  parentName: string;
  studentId: string;
  studentUsername: string;
  studentName: string;
  className: string;
  subjectName: string;
}) => {
  const school = await prisma.school.create({
    data: { name: schoolName },
  });

  await prisma.schoolSettings.create({
    data: {
      schoolId: school.id,
      workDayStart: new Date("1970-01-01T07:00:00.000Z"),
      workDayEnd: new Date("1970-01-01T14:00:00.000Z"),
      lessonDuration: 45,
      lessonsPerDay: 6,
      workingDays: [
        "SATURDAY",
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
      ],
    },
  });

  const previousYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2024/2025",
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-06-30"),
      isCurrent: false,
    },
  });

  const currentYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2025/2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      isCurrent: true,
    },
  });

  await prisma.admin.create({
    data: {
      id: adminId,
      username: adminUsername,
      schoolId: school.id,
    },
  });

  const grade1 = await prisma.grade.create({
    data: {
      schoolId: school.id,
      level: 1,
    },
  });

  const teacher = await prisma.teacher.create({
    data: {
      id: teacherId,
      username: teacherUsername,
      name: teacherName,
      email: `${teacherUsername}@example.com`,
      phone: `${school.id}11111111`,
      address: `${schoolName} City`,
      bloodType: "O+",
      sex: "MALE",
      birthday: new Date("1990-01-01"),
      schoolId: school.id,
    },
  });

  const classA = await prisma.class.create({
    data: {
      name: className,
      capacity: 30,
      schoolId: school.id,
      gradeId: grade1.id,
      supervisorId: teacher.id,
    },
  });

  const subject = await prisma.subject.create({
    data: {
      name: subjectName,
      schoolId: school.id,
      gradeId: grade1.id,
      teachers: { connect: [{ id: teacher.id }] },
    },
  });

  const lesson = await prisma.lesson.create({
    data: {
      name: "Lesson 1",
      day: Day.MONDAY,
      startTime: new Date("1970-01-01T08:00:00.000Z"),
      endTime: new Date("1970-01-01T08:45:00.000Z"),
      schoolId: school.id,
      subjectId: subject.id,
      classId: classA.id,
      teacherId: teacher.id,
      academicYearId: currentYear.id,
    },
  });

  const parent = await prisma.parent.create({
    data: {
      id: parentId,
      username: parentUsername,
      name: parentName,
      email: `${parentUsername}@example.com`,
      phone: `${school.id}22222222`,
      address: `${schoolName} City`,
      schoolId: school.id,
    },
  });

const student = await prisma.student.create({
  data: {
    id: studentId,
    username: studentUsername,
    name: studentName,
    email: `${studentUsername}@example.com`,
    phone: `${school.id}33333333`,
    address: `${schoolName} City`,
    bloodType: "A+",

    sex: UserSex.MALE,
    birthday: new Date("2010-01-01"),

    schoolId: school.id,
    parentId: parent.id,
    classId: classA.id,
    gradeId: grade1.id,

    status: StudentStatus.ACTIVE,
  },
});

  await prisma.studentAcademicYear.create({
    data: {
      studentId: student.id,
      schoolId: school.id,
      academicYearId: previousYear.id,
      gradeId: grade1.id,
      classId: classA.id,
      performanceStatus: "PASS",
    },
  });

  await prisma.studentAcademicYear.create({
    data: {
      studentId: student.id,
      schoolId: school.id,
      academicYearId: currentYear.id,
      gradeId: grade1.id,
      classId: classA.id,
      performanceStatus: null,
    },
  });

  const exam = await prisma.exam.create({
    data: {
      title: `${subjectName} Midterm`,
      startTime: new Date("2026-01-15T08:00:00.000Z"),
      endTime: new Date("2026-01-15T09:00:00.000Z"),
      schoolId: school.id,
      classId: classA.id,
      subjectId: subject.id,
      lessonId: lesson.id,
      academicYearId: currentYear.id,
    },
  });

  const assignment = await prisma.assignment.create({
    data: {
      title: `${subjectName} Homework 1`,
      startDate: new Date("2026-01-10T08:00:00.000Z"),
      endDate: new Date("2026-01-20T23:59:00.000Z"),
      schoolId: school.id,
      classId: classA.id,
      subjectId: subject.id,
      lessonId: lesson.id,
      academicYearId: currentYear.id,
    },
  });

  await prisma.result.create({
    data: {
      score: 88,
      schoolId: school.id,
      examId: exam.id,
      studentId: student.id,
      academicYearId: currentYear.id,
    },
  });

  await prisma.result.create({
    data: {
      score: 92,
      schoolId: school.id,
      assignmentId: assignment.id,
      studentId: student.id,
      academicYearId: currentYear.id,
    },
  });

  const today = normalizeDay(new Date());

  await prisma.attendance.create({
    data: {
      schoolId: school.id,
      academicYearId: currentYear.id,
      studentId: student.id,
      date: today,
      present: true,
    },
  });

  await prisma.attendance.create({
    data: {
      schoolId: school.id,
      academicYearId: currentYear.id,
      teacherId: teacher.id,
      date: today,
      present: true,
    },
  });

  await prisma.announcement.create({
    data: {
      title: `${schoolName} Welcome`,
      description: `Welcome to ${schoolName}`,
      date: new Date(),
      schoolId: school.id,
      academicYearId: currentYear.id,
      classes: { connect: [{ id: classA.id }] },
    },
  });

  await prisma.event.create({
    data: {
      title: `${schoolName} Opening Day`,
      description: "School opening event",
      startDate: new Date("2026-02-01T09:00:00.000Z"),
      endDate: new Date("2026-02-01T11:00:00.000Z"),
      schoolId: school.id,
      academicYearId: currentYear.id,
      classes: { connect: [{ id: classA.id }] },
    },
  });

  await prisma.message.create({
    data: {
      title: `${schoolName} Notice`,
      description: "Reminder for tomorrow",
      date: new Date(),
      schoolId: school.id,
      academicYearId: currentYear.id,
      classes: { connect: [{ id: classA.id }] },
      students: { connect: [{ id: student.id }] },
      parents: { connect: [{ id: parent.id }] },
      teachers: { connect: [{ id: teacher.id }] },
    },
  });
};

async function main() {
  await clearDatabase();
  
  

  await seedSchool({
    schoolName: "Alpha School",
    adminId: "admin_alpha",
    adminUsername: "admin_alpha",
    teacherId: "teacher_alpha",
    teacherUsername: "teacher_alpha",
    teacherName: "Teacher Alpha",
    parentId: "parent_alpha",
    parentUsername: "parent_alpha",
    parentName: "Parent Alpha",
    studentId: "student_alpha",
    studentUsername: "student_alpha",
    studentName: "Student Alpha",
    className: "1A",
    subjectName: "Mathematics",
  });

  await seedSchool({
    schoolName: "Beta School",
    adminId: "admin_beta",
    adminUsername: "admin_beta",
    teacherId: "teacher_beta",
    teacherUsername: "teacher_beta",
    teacherName: "Teacher Beta",
    parentId: "parent_beta",
    parentUsername: "parent_beta",
    parentName: "Parent Beta",
    studentId: "student_beta",
    studentUsername: "student_beta",
    studentName: "Student Beta",
    className: "1B",
    subjectName: "Science",
  });

  console.log("Seed completed successfully for 2 schools.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });