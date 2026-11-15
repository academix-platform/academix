"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import { requireActionAccess } from "./helpers";
import {
  ASSIGNMENT_GROUP_SELECT,
  assignmentGroupWhere,
  assignmentManagerWhere,
  deleteAssignmentFileIfUnused,
} from "../assignments/group";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export type AssignmentFileState = {
  success: boolean;
  error: boolean;
  message: string;
};

// ─── رفع ملف لواجب موجود ──────────────────────────────────────────────────────
export async function uploadAssignmentFile(
  _state: AssignmentFileState,
  formData: FormData
): Promise<AssignmentFileState> {
  try {
    const access = await requireActionAccess(["teacher"]);
    if ("error" in access) {
      return { success: false, error: true, message: "Unauthorized" };
    }

    const assignmentId = Number(formData.get("assignmentId"));
    if (!assignmentId) {
      return { success: false, error: true, message: "Assignment ID is required" };
    }

    // التحقق أن الواجب يخص هذا المعلم
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        schoolId: access.schoolId,
        ...assignmentManagerWhere(access),
      },
      select: { id: true, fileUrl: true, ...ASSIGNMENT_GROUP_SELECT },
    });
    if (!assignment) {
      return { success: false, error: true, message: "Assignment not found" };
    }

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: true, message: "File is required" };
    }
    if (file.size > 20 * 1024 * 1024) {
      return { success: false, error: true, message: "File must be under 20MB" };
    }

    // رفع إلى Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "assignments",
      resource_type: isImage ? "image" : "raw",
      type: "upload",           // ← هذا يجعل الملف public دائماً
      use_filename: true,
      unique_filename: true,
    });

    // تحديث نسخ هذا الواجب فقط (createAssignment ينشئ نسخة لكل صف)،
    // وليس كل واجبات المعلم التي لها العنوان نفسه
    await prisma.assignment.updateMany({
      where: assignmentGroupWhere(assignment, access),
      data: {
        fileUrl: result.secure_url,
        fileName: file.name,
      },
    });

    await deleteAssignmentFileIfUnused(assignment.fileUrl);

    revalidatePath("/list/assignments");
    return { success: true, error: false, message: "File uploaded successfully!" };
  } catch (err) {
    console.error("[uploadAssignmentFile]", err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}
