import { NextRequest, NextResponse } from "next/server";
import cloudinary, { deleteExamFileFromCloudinary } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

const validateCronSecret = (req: NextRequest): boolean => {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === process.env.CRON_SECRET) return true;
  }

  const { searchParams } = new URL(req.url);
  const secretParam = searchParams.get("secret");
  if (secretParam === process.env.CRON_SECRET) return true;

  return false;
};

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    const searchResult = await cloudinary.search
      .expression("resource_type:raw AND type:private AND folder:exams/*")
      .max_results(500)
      .execute();

    const allResources = searchResult.resources as Array<{
      public_id: string;
      created_at: string;
    }>;

    const oldResources = allResources.filter(
      (r) => new Date(r.created_at).getTime() < twoHoursAgo
    );

    if (oldResources.length === 0) {
      return NextResponse.json({ deleted: 0, orphaned: 0, total: 0 });
    }

    const dbPublicIds = await prisma.answer.findMany({
      where: { filePublicId: { not: null } },
      select: { filePublicId: true },
    });

    const knownPublicIds = new Set(
      dbPublicIds
        .map((a) => a.filePublicId)
        .filter((id): id is string => id !== null)
    );

    const orphaned = oldResources.filter(
      (r) => !knownPublicIds.has(r.public_id)
    );

    let deletedCount = 0;
    for (const resource of orphaned) {
      try {
        await deleteExamFileFromCloudinary(resource.public_id);
        deletedCount++;
      } catch {
        // Continue deleting remaining orphaned files
      }
    }

    return NextResponse.json({
      deleted: deletedCount,
      orphaned: orphaned.length,
      total: oldResources.length,
    });
  } catch (err) {
    console.error("[cron:cleanup-files]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
