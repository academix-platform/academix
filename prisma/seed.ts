import "dotenv/config";
import { Day, UserSex, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding...");

  // ======================
  // CLEAN (order matters)
  // ======================
  await prisma.attendance.deleteMany();
  await prisma.result.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.class.deleteMany();

  // ======================
  // ADMIN
  // ======================
  await prisma.admin.upsert({
    where: { id: "admin1" },
    update: {},
    create: { id: "admin1", username: "admin1" },
  });

  await prisma.admin.upsert({
    where: { id: "admin2" },
    update: {},
    create: { id: "admin2", username: "admin2" },
  });

  // ======================
  // GRADES
  // ======================
  const grades = [];
  for (let i = 1; i <= 6; i++) {
    const grade = await prisma.grade.upsert({
      where: { level: i },
      update: {},
      create: { level: i },
    });
    grades.push(grade);
  }

  // ======================
  // SUBJECTS
  // ======================
  const subjectNames = [
    "Mathematics",
    "Science",
    "English",
    "History",
    "Geography",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Science",
    "Art",
  ];

  const subjects = [];
  for (const name of subjectNames) {
    const subject = await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    subjects.push(subject);
  }

  // ======================
  // CLASSES
  // ======================
  const classes = [];
  for (let i = 0; i < 6; i++) {
    const cls = await prisma.class.create({
      data: {
        name: `${i + 1}A`,
        capacity: Math.floor(Math.random() * 6) + 15,
        gradeId: grades[i].id,
      },
    });
    classes.push(cls);
  }

  // ======================
  // TEACHERS
  // ======================
  const teachers = [];
  for (let i = 1; i <= 15; i++) {
    const teacher = await prisma.teacher.create({
      data: {
        id: `teacher${i}`,
        username: `teacher${i}`,
        name: `Teacher ${i}`,
        email: `teacher${i}@example.com`,
        phone: `12345678${i}`,
        address: `Address ${i}`,
        bloodType: "A+",
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        subjects: {
          connect: [{ id: subjects[i % subjects.length].id }],
        },
        classes: {
          connect: [{ id: classes[i % classes.length].id }],
        },
      },
    });
    teachers.push(teacher);
  }

  // ======================
  // PARENTS
  // ======================
  const parents = [];
  for (let i = 1; i <= 25; i++) {
    const parent = await prisma.parent.create({
      data: {
        id: `parent${i}`,
        username: `parent${i}`,
        name: `Parent ${i}`,
        email: `parent${i}@example.com`,
        phone: `98765432${i}`,
        address: `Address ${i}`,
      },
    });
    parents.push(parent);
  }

  // ======================
  // STUDENTS
  // ======================
  const students = [];
  for (let i = 1; i <= 50; i++) {
    const student = await prisma.student.create({
      data: {
        id: `student${i}`,
        username: `student${i}`,
        name: `Student ${i}`,
        email: `student${i}@example.com`,
        phone: `55555555${i}`,
        address: `Address ${i}`,
        bloodType: "O+",
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        parentId: parents[Math.floor((i - 1) / 2)].id,
        gradeId: grades[i % grades.length].id,
        classId: classes[i % classes.length].id,
      },
    });
    students.push(student);
  }

  // ======================
  // LESSONS
  // ======================
  const lessons = [];
  const days = Object.values(Day);

  for (let i = 1; i <= 30; i++) {
    const lesson = await prisma.lesson.create({
      data: {
        name: `Lesson ${i}`,
        day: days[i % days.length],
        startTime: new Date(),
        endTime: new Date(),
        subjectId: subjects[i % subjects.length].id,
        classId: classes[i % classes.length].id,
        teacherId: teachers[i % teachers.length].id,
      },
    });
    lessons.push(lesson);
  }

  // ======================
  // EXAMS + ASSIGNMENTS
  // ======================
  const exams = [];

  for (let i = 1; i <= 10; i++) {
    const exam = await prisma.exam.create({
      data: {
        title: `Exam ${i}`,
        startTime: new Date(),
        endTime: new Date(),
        lessonId: lessons[i % lessons.length].id,
      },
    });

    exams.push(exam);

    await prisma.assignment.create({
      data: {
        title: `Assignment ${i}`,
        startDate: new Date(),
        endDate: new Date(), // ✅ correct
        lessonId: lessons[i % lessons.length].id,
      },
    });
  }

  // ======================
  // RESULTS
  // ======================
  for (let i = 0; i < 10; i++) {
    await prisma.result.create({
      data: {
        score: 80 + (i % 20),
        studentId: students[i].id,
        ...(i < 5 ? { examId: exams[i].id } : { assignmentId: i - 4 }),
      },
    });
  }

  // ======================
  // ATTENDANCE
  // ======================
  for (let i = 0; i < 10; i++) {
    await prisma.attendance.create({
      data: {
        date: new Date(),
        present: true,
        studentId: students[i].id,
        lessonId: lessons[i % lessons.length].id,
      },
    });
  }

  // ======================
  // EVENTS
  // ======================
  for (let i = 1; i <= 5; i++) {
    await prisma.event.create({
      data: {
        title: `Event ${i}`,
        description: `Event description ${i}`,
        startDate: new Date(),
        endtDate: new Date(), // matches schema typo
        classId: classes[i % classes.length].id,
      },
    });
  }

  // ======================
  // ANNOUNCEMENTS
  // ======================
  for (let i = 1; i <= 5; i++) {
    await prisma.announcement.create({
      data: {
        title: `Announcement ${i}`,
        description: `Announcement ${i}`,
        date: new Date(),
        classId: classes[i % classes.length].id,
      },
    });
  }

  console.log("✅ Seeding completed successfully.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
