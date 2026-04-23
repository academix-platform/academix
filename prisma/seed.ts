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
  await prisma.message.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.result.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.admin.deleteMany();

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
  const subjectBases = ["Arabic", "English", "Math", "Science"];

  const subjects: Array<{ id: number; name: string }> = [];
  const gradeSubjects = new Map<number, Array<{ id: number; name: string }>>();

  for (const grade of grades) {
    const subjectsForGrade: Array<{ id: number; name: string }> = [];

    for (const base of subjectBases) {
      const name = `${base}-G${grade.level}`;
      const subject = await prisma.subject.upsert({
        where: { name },
        update: { gradeId: grade.id },
        create: { name, gradeId: grade.id },
      });

      subjects.push(subject);
      subjectsForGrade.push({ id: subject.id, name: subject.name });
    }

    gradeSubjects.set(grade.id, subjectsForGrade);
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

  // ======================
  // PARENTS
  // ======================

  // ======================
  // STUDENTS
  // ======================

  // ======================
  // LESSONS
  // ======================

  // ======================
  // EXAMS + ASSIGNMENTS
  // ======================

  // ======================
  // RESULTS
  // ======================

  // ======================
  // ATTENDANCE
  // ======================

  // ======================
  // EVENTS
  // ======================
  for (let i = 1; i <= 5; i++) {
    await prisma.event.create({
      data: {
        title: `Event ${i}`,
        description: `Event description ${i}`,
        startDate: new Date(),
        endDate: new Date(),
        classes: {
          connect: [{ id: classes[i % classes.length].id }],
        },
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
        classes: {
          connect: [{ id: classes[i % classes.length].id }],
        },
      },
    });
  }

  // ======================
  // MESSAGES
  // ======================

  console.log("✅ Seeding completed successfully.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
