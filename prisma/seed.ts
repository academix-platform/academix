import "dotenv/config";
import {
  Day,
  PassFailStatus,
  UserSex,
  PrismaClient,
  StudentStatus,
  type Assignment,
  type Class,
  type Exam,
  type Grade,
  type Lesson,
  type Parent,
  type Student,
  type Teacher,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const schoolDays = [
  Day.SATURDAY,
  Day.SUNDAY,
  Day.MONDAY,
  Day.TUESDAY,
  Day.WEDNESDAY,
  Day.THURSDAY,
];

function getSchoolWeekStart(baseDate: Date) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const daysSinceSaturday = (day + 1) % 7;
  date.setDate(date.getDate() - daysSinceSaturday);
  date.setHours(0, 0, 0, 0);
  return date;
}

function withTime(date: Date, hour: number, minute = 0) {
  const copy = new Date(date);
  copy.setHours(hour, minute, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function utcTime(hour: number, minute = 0) {
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0, 0));
}

async function main() {
  console.log("🌱 Seeding...");

  const now = new Date();
  const weekStart = getSchoolWeekStart(now);
  const weekDates = schoolDays.map((_, index) => addDays(weekStart, index));

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
  await prisma.schoolSettings.deleteMany();
  await prisma.academicYear.deleteMany();

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

  await prisma.schoolSettings.upsert({
    where: { id: 1 },
    update: {
      workDayStart: utcTime(7, 0),
      workDayEnd: utcTime(11, 30),
      lessonDuration: 45,
      lessonsPerDay: 6,
    },
    create: {
      id: 1,
      workDayStart: utcTime(7, 0),
      workDayEnd: utcTime(11, 30),
      lessonDuration: 45,
      lessonsPerDay: 6,
    },
  });

  const currentAcademicYearStart =
    now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;

  const academicYearSeeds = [
    {
      name: `${currentAcademicYearStart}/${currentAcademicYearStart + 1}`,
      startDate: new Date(Date.UTC(currentAcademicYearStart, 8, 1)),
      endDate: new Date(Date.UTC(currentAcademicYearStart + 1, 5, 30)),
      isCurrent: true,
    },
    {
      name: `${currentAcademicYearStart + 1}/${currentAcademicYearStart + 2}`,
      startDate: new Date(Date.UTC(currentAcademicYearStart + 1, 8, 1)),
      endDate: new Date(Date.UTC(currentAcademicYearStart + 2, 5, 30)),
      isCurrent: false,
    },
  ];

  for (const year of academicYearSeeds) {
    await prisma.academicYear.upsert({
      where: { name: year.name },
      update: {
        startDate: year.startDate,
        endDate: year.endDate,
        isCurrent: year.isCurrent,
      },
      create: year,
    });
  }

  const seededAcademicYears = await prisma.academicYear.findMany({
    select: { id: true, isCurrent: true },
    orderBy: { startDate: "asc" },
  });

  const currentAcademicYear = seededAcademicYears.find(
    (year) => year.isCurrent,
  );
  const nextAcademicYear = seededAcademicYears.find((year) => !year.isCurrent);

  if (!currentAcademicYear || !nextAcademicYear) {
    throw new Error("Current academic year seed was not created.");
  }

  // ======================
  // GRADES
  // ======================
  const grades: Grade[] = [];
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
  const classes: Class[] = [];
  for (let i = 0; i < 6; i++) {
    const cls = await prisma.class.create({
      data: {
        name: `${i + 1}A`,
        capacity: 24,
        gradeId: grades[i].id,
      },
    });
    classes.push(cls);
  }

  // ======================
  // TEACHERS
  // ======================
  const teacherSeeds = [
    {
      id: "teacher1",
      username: "teacher1",
      name: "Amina Hassan",
      email: "amina.hassan@academix.edu",
      phone: "+201000000101",
      address: "Cairo",
      bloodType: "A+",
      sex: UserSex.FEMALE,
      img: "",
      birthday: new Date("1988-03-11"),
    },
    {
      id: "teacher2",
      username: "teacher2",
      name: "Omar Khaled",
      email: "omar.khaled@academix.edu",
      phone: "+201000000102",
      address: "Giza",
      bloodType: "B+",
      sex: UserSex.MALE,
      img: "",
      birthday: new Date("1985-08-04"),
    },
    {
      id: "teacher3",
      username: "teacher3",
      name: "Nour Adel",
      email: "nour.adel@academix.edu",
      phone: "+201000000103",
      address: "Alexandria",
      bloodType: "O+",
      sex: UserSex.FEMALE,
      img: "",
      birthday: new Date("1990-02-20"),
    },
    {
      id: "teacher4",
      username: "teacher4",
      name: "Youssef Nabil",
      email: "youssef.nabil@academix.edu",
      phone: "+201000000104",
      address: "Mansoura",
      bloodType: "AB+",
      sex: UserSex.MALE,
      img: "",
      birthday: new Date("1987-11-15"),
    },
    {
      id: "teacher5",
      username: "teacher5",
      name: "Laila Mostafa",
      email: "laila.mostafa@academix.edu",
      phone: "+201000000105",
      address: "Tanta",
      bloodType: "A-",
      sex: UserSex.FEMALE,
      img: "",
      birthday: new Date("1991-06-01"),
    },
    {
      id: "teacher6",
      username: "teacher6",
      name: "Karim Fawzy",
      email: "karim.fawzy@academix.edu",
      phone: "+201000000106",
      address: "Asyut",
      bloodType: "O-",
      sex: UserSex.MALE,
      img: "",
      birthday: new Date("1989-09-22"),
    },
  ];

  const teachers: Teacher[] = [];
  for (const teacherSeed of teacherSeeds) {
    const teacher = await prisma.teacher.create({
      data: teacherSeed,
    });
    teachers.push(teacher);
  }

  const subjectTeacherByBase: Record<string, string> = {
    Arabic: teachers[0].id,
    English: teachers[1].id,
    Math: teachers[2].id,
    Science: teachers[3].id,
  };

  for (const subject of subjects) {
    const baseSubject = subject.name.split("-")[0];
    const teacherId = subjectTeacherByBase[baseSubject] ?? teachers[0].id;
    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        subjects: {
          connect: [{ id: subject.id }],
        },
      },
    });
  }

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    const classGrade = grades.find((g) => g.id === cls.gradeId);
    if (!classGrade) continue;

    const classSubjects = gradeSubjects.get(classGrade.id) ?? [];
    const connectedTeacherIds = Array.from(
      new Set([
        teachers[4 + (i % 2)].id,
        ...classSubjects.map((subject) => {
          const base = subject.name.split("-")[0];
          return subjectTeacherByBase[base] ?? teachers[0].id;
        }),
      ]),
    );

    await prisma.class.update({
      where: { id: cls.id },
      data: {
        supervisorId: teachers[4 + (i % 2)].id,
        teachers: {
          connect: connectedTeacherIds.map((id) => ({ id })),
        },
      },
    });
  }

  // ======================
  // LESSONS
  // ======================
  const createLessonsForYear = async (
    academicYearId: number,
    subjectIndexes: number[],
    classIndexes: number[],
    labelPrefix: string,
  ) => {
    for (const classIndex of classIndexes) {
      const cls = classes[classIndex];
      const classSubjects = gradeSubjects.get(cls.gradeId) ?? [];

      for (let i = 0; i < subjectIndexes.length; i++) {
        const subject = classSubjects[subjectIndexes[i]];
        if (!subject) continue;

        const base = subject.name.split("-")[0];
        const teacherId = subjectTeacherByBase[base] ?? teachers[0].id;
        const weekIndex = (classIndex + i) % weekDates.length;
        const startTime = withTime(weekDates[weekIndex], 8 + i * 2, 0);
        const endTime = withTime(weekDates[weekIndex], 9 + i * 2, 30);

        await prisma.lesson.create({
          data: {
            name: `${labelPrefix} ${base} - ${cls.name}`,
            day: schoolDays[weekIndex],
            startTime,
            endTime,
            subjectId: subject.id,
            classId: cls.id,
            teacherId,
            academicYearId,
          },
        });
      }
    }
  };

  await createLessonsForYear(currentAcademicYear.id, [0, 2], [0, 1], "Current");

  await createLessonsForYear(nextAcademicYear.id, [1, 3], [0, 1], "Next");

  // ======================
  // PARENTS
  // ======================
  const parents: Parent[] = [];
  for (let i = 1; i <= 18; i++) {
    const parent = await prisma.parent.create({
      data: {
        id: `parent${i}`,
        username: `parent${i}`,
        name: `Parent ${i}`,
        email: `parent${i}@mail.com`,
        phone: `+20110000${String(i).padStart(4, "0")}`,
        address: `District ${((i - 1) % 6) + 1}`,
      },
    });
    parents.push(parent);
  }

  // ======================
  // STUDENTS
  // ======================
  const students: Student[] = [];
  let studentCounter = 1;

  for (const cls of classes) {
    for (let seat = 0; seat < 3; seat++) {
      const parent = parents[(studentCounter - 1) % parents.length];
      const seedStatus: StudentStatus =
        studentCounter <= 11
          ? StudentStatus.ACTIVE
          : studentCounter <= 14
            ? StudentStatus.REPEATED
            : studentCounter <= 16
              ? StudentStatus.GRADUATED
              : StudentStatus.LEFT;

      const student = await prisma.student.create({
        data: {
          id: `student${studentCounter}`,
          username: `student${studentCounter}`,
          name: `Student ${studentCounter}`,
          email: `student${studentCounter}@mail.com`,
          phone: `+20120000${String(studentCounter).padStart(4, "0")}`,
          address: `Block ${((studentCounter - 1) % 9) + 1}`,
          img: "",
          bloodType: ["A+", "B+", "O+", "AB+"][studentCounter % 4],
          sex: studentCounter % 2 === 0 ? UserSex.FEMALE : UserSex.MALE,
          status: seedStatus,
          repeatCount:
            studentCounter === 12
              ? 1
              : studentCounter === 13
                ? 2
                : studentCounter === 14
                  ? 3
                  : 0,
          parentId: parent.id,
          classId: cls.id,
          gradeId: cls.gradeId,
          birthday: new Date(
            2013,
            (studentCounter + 2) % 12,
            ((studentCounter * 2) % 27) + 1,
          ),
        },
      });

      students.push(student);
      studentCounter++;
    }
  }

  // ======================
  // STUDENT ACADEMIC YEARS
  // ======================
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const performanceStatus: PassFailStatus | null =
      student.status === StudentStatus.LEFT
        ? null
        : i % 4 === 0
          ? PassFailStatus.FAIL
          : PassFailStatus.PASS;

    await prisma.studentAcademicYear.create({
      data: {
        studentId: student.id,
        academicYearId: currentAcademicYear.id,
        gradeId: student.gradeId,
        classId: student.classId,
        performanceStatus,
      },
    });
  }

  // Seed a few next-year enrollment rows for switching and testing scenarios.
  for (const student of students.slice(0, 6)) {
    await prisma.studentAcademicYear.create({
      data: {
        studentId: student.id,
        academicYearId: nextAcademicYear.id,
        gradeId: student.gradeId,
        classId: student.classId,
        performanceStatus: null,
      },
    });
  }

  // ======================
  // EXAMS + ASSIGNMENTS
  // ======================
  // const exams: Exam[] = [];
  // const assignments: Assignment[] = [];

  // for (let i = 0; i < lessons.length; i++) {
  //   const lesson = lessons[i];

  //   const examStart = withTime(lesson.startTime, 11, 0);
  //   const examEnd = withTime(lesson.startTime, 12, 0);
  //   const exam = await prisma.exam.create({
  //     data: {
  //       title: `${lesson.name} Weekly Quiz`,
  //       startTime: examStart,
  //       endTime: examEnd,
  //       classId: lesson.classId,
  //       subjectId: lesson.subjectId,
  //       lessonId: lesson.id,
  //     },
  //   });
  //   exams.push(exam);

  //   const assignmentStart = withTime(lesson.startTime, 13, 0);
  //   const assignmentEnd = withTime(addDays(lesson.startTime, 2), 18, 0);
  //   const assignment = await prisma.assignment.create({
  //     data: {
  //       title: `${lesson.name} Homework`,
  //       startDate: assignmentStart,
  //       endDate: assignmentEnd,
  //       classId: lesson.classId,
  //       subjectId: lesson.subjectId,
  //       lessonId: lesson.id,
  //     },
  //   });
  //   assignments.push(assignment);
  // }

  // ======================
  // RESULTS
  // ======================
  // for (const student of students) {
  //   const classExams = exams
  //     .filter((exam) => exam.classId === student.classId)
  //     .slice(0, 2);
  //   const classAssignments = assignments
  //     .filter((assignment) => assignment.classId === student.classId)
  //     .slice(0, 2);

  //   for (let i = 0; i < classExams.length; i++) {
  //     await prisma.result.create({
  //       data: {
  //         score: 70 + ((student.id.length + i * 7) % 31),
  //         examId: classExams[i].id,
  //         studentId: student.id,
  //       },
  //     });
  //   }

  //   for (let i = 0; i < classAssignments.length; i++) {
  //     await prisma.result.create({
  //       data: {
  //         score: 72 + ((student.id.length + i * 5) % 27),
  //         assignmentId: classAssignments[i].id,
  //         studentId: student.id,
  //       },
  //     });
  //   }
  // }

  // ======================
  // ATTENDANCE
  // ======================
  for (let dayIndex = 0; dayIndex < weekDates.length; dayIndex++) {
    const attendanceDate = withTime(weekDates[dayIndex], 7, 45);

    for (let i = 0; i < students.length; i++) {
      await prisma.attendance.create({
        data: {
          date: attendanceDate,
          present: (i + dayIndex) % 8 !== 0,
          studentId: students[i].id,
          academicYearId: currentAcademicYear.id,
        },
      });
    }

    for (let i = 0; i < teachers.length; i++) {
      await prisma.attendance.create({
        data: {
          date: attendanceDate,
          present: (i + dayIndex) % 9 !== 0,
          teacherId: teachers[i].id,
          academicYearId: currentAcademicYear.id,
        },
      });
    }
  }

  // ======================
  // EVENTS
  // ======================
  for (let i = 0; i < weekDates.length; i++) {
    await prisma.event.create({
      data: {
        title: `Campus Event Day ${i + 1}`,
        description: `This week activity #${i + 1}`,
        startDate: withTime(weekDates[i], 10, 0),
        endDate: withTime(weekDates[i], 12, 0),
        academicYearId: currentAcademicYear.id,
        classes: {
          connect: [
            { id: classes[i % classes.length].id },
            { id: classes[(i + 1) % classes.length].id },
          ],
        },
      },
    });
  }

  // ======================
  // ANNOUNCEMENTS
  // ======================
  for (let i = 0; i < weekDates.length; i++) {
    await prisma.announcement.create({
      data: {
        title: `Weekly Notice ${i + 1}`,
        description: `Important update for day ${i + 1}`,
        date: withTime(weekDates[i], 8, 30),
        academicYearId: currentAcademicYear.id,
        classes: {
          connect: [{ id: classes[i % classes.length].id }],
        },
      },
    });
  }

  // ======================
  // MESSAGES
  // ======================
  for (let i = 0; i < classes.length; i++) {
    const classStudents = students.filter(
      (student) => student.classId === classes[i].id,
    );
    const classParents = classStudents.map((student) => ({
      id: student.parentId,
    }));

    await prisma.message.create({
      data: {
        title: `Class ${classes[i].name} Weekly Brief`,
        description: "Lessons, tasks, and reminders for this week.",
        date: withTime(weekDates[i % weekDates.length], 14, 0),
        academicYearId: currentAcademicYear.id,
        classes: {
          connect: [{ id: classes[i].id }],
        },
        teachers: {
          connect: [{ id: teachers[i % teachers.length].id }],
        },
        students: {
          connect: classStudents.map((student) => ({ id: student.id })),
        },
        parents: {
          connect: classParents,
        },
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
