"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { parseNumericId, requireActionAccess } from "./helpers";

// ─── Cloudinary config ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type StudyMaterialState = {
  success: boolean;
  error: boolean;
  message: string;
};

// ─── Validation ───────────────────────────────────────────────────────────────
const CreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subjectId: z.coerce.number().int().positive(),
});

// ─── Upload to Cloudinary ─────────────────────────────────────────────────────
async function uploadToCloudinary(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "study-materials",
    resource_type: isImage ? "image" : "raw",
    use_filename: true,
    unique_filename: true,
  });

  return {
    url: result.secure_url,
    fileType: ext,
    fileName: file.name,
  };
}

// ─── Create StudyMaterial ─────────────────────────────────────────────────────
export async function createStudyMaterial(
  _state: StudyMaterialState,
  formData: FormData
): Promise<StudyMaterialState> {
  try {
    const access = await requireActionAccess(["admin", "teacher"]);
    if ("error" in access) {
      return { success: false, error: true, message: access.message };
    }
    const { schoolId } = access;

    // التحقق من البيانات النصية
    const parsed = CreateSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      subjectId: formData.get("subjectId"),
    });
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    // المادة يجب أن تكون في مدرسة المستخدم، والمعلم يجب أن يكون مُسندًا إليها
    const subject = await prisma.subject.findFirst({
      where: {
        id: parsed.data.subjectId,
        schoolId,
        ...(access.role === "teacher"
          ? { teachers: { some: { id: access.userId } } }
          : {}),
      },
      select: { teachers: { select: { id: true }, take: 1 } },
    });
    if (!subject) {
      return { success: false, error: true, message: "Subject not found" };
    }

    // الأدمن: يُنسب الملف لأول معلم مرتبط بالمادة — المعلم: يُنسب إليه
    const teacherId =
      access.role === "teacher" ? access.userId : subject.teachers[0]?.id;
    if (!teacherId) {
      return { success: false, error: true, message: "No teacher assigned to this subject" };
    }

    const academicYear = await getCurrentAcademicYearOrNull(schoolId);
    if (!academicYear) {
      return { success: false, error: true, message: "No current academic year found" };
    }
    const academicYearId = academicYear.id;

    // التحقق من الملف
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: true, message: "File is required" };
    }
    if (file.size > 20 * 1024 * 1024) {
      return { success: false, error: true, message: "File must be under 20MB" };
    }

    // رفع إلى Cloudinary
    const { url, fileType, fileName } = await uploadToCloudinary(file);

    // حفظ في قاعدة البيانات
    await prisma.studyMaterial.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        fileUrl: url,
        fileName,
        fileType,
        subjectId: parsed.data.subjectId,
        teacherId,
        schoolId,
        academicYearId,
      },
    });

    revalidatePath(`/list/subjects/${parsed.data.subjectId}`);
    return { success: true, error: false, message: "Material uploaded successfully!" };
  } catch (err) {
    console.error("[createStudyMaterial]", err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}

// ─── Delete StudyMaterial ─────────────────────────────────────────────────────
export async function deleteStudyMaterial(
  _state: StudyMaterialState,
  formData: FormData
): Promise<StudyMaterialState> {
  try {
    const access = await requireActionAccess(["admin", "teacher"]);
    if ("error" in access) {
      return { success: false, error: true, message: access.message };
    }

    const id = parseNumericId(formData.get("id"));
    const material = id
      ? await prisma.studyMaterial.findFirst({
          where: { id, schoolId: access.schoolId },
        })
      : null;
    if (!material) {
      return { success: false, error: true, message: "Material not found" };
    }

    // المعلم: فقط صاحب الملف يحذفه — الأدمن: يحذف أي ملف في مدرسته
    if (access.role === "teacher" && material.teacherId !== access.userId) {
      return { success: false, error: true, message: "Forbidden" };
    }

    // حذف من Cloudinary (non-blocking)
    try {
      const urlParts = material.fileUrl.split("/");
      const fileWithExt = urlParts[urlParts.length - 1];
      const fileNameOnly = fileWithExt.split(".")[0];
      const folder = urlParts[urlParts.length - 2];
      const publicId = `${folder}/${fileNameOnly}`;
      const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(
        material.fileType
      );
      await cloudinary.uploader.destroy(publicId, {
        resource_type: isImage ? "image" : "raw",
      });
    } catch {
      console.warn("[deleteStudyMaterial] Cloudinary delete failed");
    }

    await prisma.studyMaterial.delete({ where: { id: material.id } });

    revalidatePath(`/list/subjects/${material.subjectId}`);
    return { success: true, error: false, message: "Material deleted successfully!" };
  } catch (err) {
    console.error("[deleteStudyMaterial]", err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}