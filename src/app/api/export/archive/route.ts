import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const type = searchParams.get("type");
  const academicYearId = searchParams.get("academicYearId");

  if (!type || !academicYearId) {
    return NextResponse.json(
      { error: "Missing parameters" },
      { status: 400 }
    );
  }

  const user = await requireAuth();

  const admin = await prisma.admin.findUnique({
    where: {
      id: user.userId,
    },
  });

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let data: Record<string, unknown>[] = [];

  switch (type) {
    case "students":
      const students = await prisma.student.findMany({
        where: {
          schoolId: admin.schoolId,
          academicYears: {
            some: {
              academicYearId: Number(academicYearId),
            },
          },
        },
      });
      const studentIds = students.map((student) => student.id);
      const finalResults: Array<{
        studentId: string;
        averageScore: number;
      }> = studentIds.length
        ? await (
            prisma as unknown as {
              studentFinalResult: {
                findMany: (args: {
                  where: {
                    schoolId: number;
                    academicYearId: number;
                    studentId: { in: string[] };
                  };
                  select: {
                    studentId: boolean;
                    averageScore: boolean;
                  };
                }) => Promise<Array<{ studentId: string; averageScore: number }>>;
              };
            }
          ).studentFinalResult.findMany({
            where: {
              schoolId: admin.schoolId,
              academicYearId: Number(academicYearId),
              studentId: { in: studentIds },
            },
            select: {
              studentId: true,
              averageScore: true,
            },
          })
        : [];
      const finalGradeByStudent = new Map(
        finalResults.map((result) => [
          result.studentId,
          `${result.averageScore.toFixed(2)}%`,
        ]),
      );

      data = students.map((student) => ({
        ...student,
        finalGrade: finalGradeByStudent.get(student.id) ?? "",
      }));
      break;

    case "teachers":
      data = await prisma.teacher.findMany({
        where: {
          schoolId: admin.schoolId,
        },
      });
      break;

    case "parents":
      data = await prisma.parent.findMany({
        where: {
          schoolId: admin.schoolId,
        },
      });
      break;

    case "subjects":
      data = await prisma.subject.findMany({
        where: {
          schoolId: admin.schoolId,
        },
      });
      break;

    case "classes":
      data = await prisma.class.findMany({
        where: {
          schoolId: admin.schoolId,
        },
      });
      break;

    case "exams":
      data = await prisma.exam.findMany({
        where: {
          lesson: {
            subject: {
              schoolId: admin.schoolId,
            },
          },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          lessonId: true,
        },
      });
      break;

 case "assignments":
  try {
    data = await prisma.assignment.findMany({
      select: {
        id: true,
        title: true,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Assignments export failed",
      details: String(error),
    });
  }
  break;
      

    case "results":
      data = await prisma.result
        .findMany({
          where: {
            student: {
              schoolId: admin.schoolId,
            },
          },
          select: {
            id: true,
            score: true,
            student: {
              select: {
                name: true,
                username: true,
              },
            },
          },
        })
        .then((items) =>
          items.map((item) => ({
            id: item.id,
            studentName: item.student?.name || "",
            studentUsername: item.student?.username || "",
            score: item.score,
          }))
        );
      break;

    case "attendance":
      data = await prisma.attendance
        .findMany({
          where: {
            student: {
              schoolId: admin.schoolId,
            },
          },
          select: {
            id: true,
            date: true,
            present: true,
            student: {
              select: {
                name: true,
                username: true,
              },
            },
          },
        })
        .then((items) =>
          items.map((item) => ({
            id: item.id,
            studentName: item.student?.name || "",
            studentUsername: item.student?.username || "",
            date: item.date,
            status: item.present ? "Present" : "Absent",
          }))
        );
      break;

    default:
      data = [];
  }

  if (data.length === 0) {
    return NextResponse.json({
      success: true,
      count: 0,
      message: "No data found",
    });
  }

  const headers = Object.keys(data[0]);

  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return `"${String(value ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];

  const csv = csvRows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${academicYearId}.csv"`,
    },
  });
}
