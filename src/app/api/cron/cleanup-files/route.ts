import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron";
import cloudinary, { deleteExamFileFromCloudinary } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    // Search returns at most 500 per page; follow the cursor to see them all.
    const allResources: Array<{ public_id: string; created_at: string }> = [];
    let nextCursor: string | undefined;
    do {
      let search = cloudinary.search
        .expression("resource_type:raw AND type:private AND folder:exams/*")
        .max_results(500);
      if (nextCursor) search = search.next_cursor(nextCursor);

      const page = await search.execute();
      allResources.push(...page.resources);
      nextCursor = page.next_cursor;
    } while (nextCursor);

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
      if (await deleteExamFileFromCloudinary(resource.public_id)) {
        deletedCount++;
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
