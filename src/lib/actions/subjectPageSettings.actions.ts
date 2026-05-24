"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

// ─── Cloudinary config ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type SubjectPageSettingsState = {
  success: boolean;
  error: boolean;
  message: string;
};

export type SubjectPageSettingsData = {
  announcement: string | null;
  description: string | null;
  bannerImage: string | null;
  sectionsOrder: string[];
};

// ─── Validation ───────────────────────────────────────────────────────────────
const VALID_SECTIONS = ["assignments", "exams", "materials"] as const;
const ANNOUNCEMENT_MAX_WORDS = 12;
const DESCRIPTION_MAX_WORDS = 24;
const countWords = (value?: string | null) =>
  (value ?? "").trim().split(/\s+/).filter(Boolean).length;

const SaveSchema = z.object({
  subjectId: z.coerce.number().int().positive(),
  announcement: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .refine(
      (value) => countWords(value) <= ANNOUNCEMENT_MAX_WORDS,
      `Announcement must be ${ANNOUNCEMENT_MAX_WORDS} words or fewer.`,
    ),
  description: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .refine(
      (value) => countWords(value) <= DESCRIPTION_MAX_WORDS,
      `Description must be ${DESCRIPTION_MAX_WORDS} words or fewer.`,
    ),
  sectionsOrder: z
    .array(z.enum(VALID_SECTIONS))
    .length(3)
    .default(["assignments", "exams", "materials"]),
  bannerHeight: z.enum(["sm", "md", "lg"]).default("md"),
});

// ─── Get Settings ─────────────────────────────────────────────────────────────
export async function getSubjectPageSettings(
  subjectId: number,
  teacherId: string
): Promise<SubjectPageSettingsData | null> {
  try {
    const settings = await prisma.subjectPageSettings.findUnique({
      where: { subjectId_teacherId: { subjectId, teacherId } },
      select: {
        announcement: true,
        description: true,
        bannerImage: true,
        sectionsOrder: true,
      },
    });

    if (!settings) return null;

    return {
      announcement: settings.announcement,
      description: settings.description,
      bannerImage: settings.bannerImage,
      sectionsOrder: (settings.sectionsOrder as string[]) ?? [
        "assignments",
        "exams",
        "materials",
      ],
    };
  } catch (err) {
    console.error("[getSubjectPageSettings]", err);
    return null;
  }
}

// ─── Save Settings ────────────────────────────────────────────────────────────
export async function saveSubjectPageSettings(
  _state: SubjectPageSettingsState,
  formData: FormData
): Promise<SubjectPageSettingsState> {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId || (role !== "teacher" && role !== "admin")) {
      return { success: false, error: true, message: "Unauthorized" };
    }

    // الأدمن: نجلب المعلم المرتبط بالمادة (أول معلم)
    // المعلم: نستخدم userId مباشرة
    let teacherId = userId;
    let schoolId: number;

    if (role === "admin") {
      const admin = await prisma.admin.findUnique({
        where: { id: userId },
        select: { schoolId: true },
      });
      if (!admin) return { success: false, error: true, message: "Admin not found" };
      schoolId = admin.schoolId;
      // الأدمن يحفظ الإعدادات باسم أول معلم في المادة
      const subjectIdRaw = Number(formData.get("subjectId"));
      const firstTeacher = await prisma.subject.findFirst({
        where: { id: subjectIdRaw, schoolId },
        select: { teachers: { select: { id: true }, take: 1 } },
      });
      if (!firstTeacher?.teachers[0]) {
        return { success: false, error: true, message: "No teacher assigned to this subject" };
      }
      teacherId = firstTeacher.teachers[0].id;
    } else {
      const teacher = await prisma.teacher.findUnique({
        where: { id: userId },
        select: { schoolId: true },
      });
      if (!teacher) return { success: false, error: true, message: "Teacher not found" };
      schoolId = teacher.schoolId;
    }

    // Parse sectionsOrder from JSON string
    let sectionsOrderRaw: string[] = ["assignments", "exams", "materials"];
    try {
      const raw = formData.get("sectionsOrder");
      if (raw) sectionsOrderRaw = JSON.parse(raw as string);
    } catch {
      // keep default
    }

    const parsed = SaveSchema.safeParse({
      subjectId: formData.get("subjectId"),
      announcement: formData.get("announcement") || null,
      description: formData.get("description") || null,
      sectionsOrder: sectionsOrderRaw,
      bannerHeight: (formData.get("bannerHeight") as string) || "md",
    });

    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    // التحقق أن المادة تنتمي لنفس المدرسة
    const subject = await prisma.subject.findFirst({
      where: {
        id: parsed.data.subjectId,
        schoolId,
        ...(role === "teacher" ? { teachers: { some: { id: teacherId } } } : {}),
      },
    });
    if (!subject) {
      return { success: false, error: true, message: "Subject not found or unauthorized" };
    }

    // Handle banner image upload (optional)
    let bannerImageUrl: string | undefined = undefined;
    const bannerFile = formData.get("bannerImage") as File | null;

    if (bannerFile && bannerFile.size > 0) {
      if (bannerFile.size > 5 * 1024 * 1024) {
        return {
          success: false,
          error: true,
          message: "Banner image must be under 5MB",
        };
      }

      const bytes = await bannerFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      const dataUri = `data:${bannerFile.type};base64,${base64}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "subject-banners",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
      });
      bannerImageUrl = result.secure_url;
    }

    // Handle banner removal
    const removeBanner = formData.get("removeBanner") === "true";

    // Upsert settings
    await prisma.subjectPageSettings.upsert({
      where: {
        subjectId_teacherId: {
          subjectId: parsed.data.subjectId,
          teacherId,
        },
      },
      create: {
        subjectId: parsed.data.subjectId,
        teacherId,
        schoolId,
        announcement: parsed.data.announcement ?? null,
        description: parsed.data.description ?? null,
        bannerImage: bannerImageUrl ?? null,
        bannerHeight: parsed.data.bannerHeight,
        sectionsOrder: parsed.data.sectionsOrder,
      },
      update: {
        announcement: parsed.data.announcement ?? null,
        description: parsed.data.description ?? null,
        bannerHeight: parsed.data.bannerHeight,
        sectionsOrder: parsed.data.sectionsOrder,
        ...(bannerImageUrl ? { bannerImage: bannerImageUrl } : {}),
        ...(removeBanner ? { bannerImage: null } : {}),
      },
    });

    revalidatePath(`/list/subjects/${parsed.data.subjectId}`);
    return {
      success: true,
      error: false,
      message: "Page settings saved successfully!",
    };
  } catch (err) {
    console.error("[saveSubjectPageSettings]", err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}

// ─── Delete Banner Image ──────────────────────────────────────────────────────
export async function deleteSubjectBanner(
  subjectId: number
): Promise<SubjectPageSettingsState> {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId || role !== "teacher") {
      return { success: false, error: true, message: "Unauthorized" };
    }

    const settings = await prisma.subjectPageSettings.findUnique({
      where: { subjectId_teacherId: { subjectId, teacherId: userId } },
    });

    if (!settings) {
      return { success: false, error: true, message: "Settings not found" };
    }

    // Delete from Cloudinary (non-blocking)
    if (settings.bannerImage) {
      try {
        const urlParts = settings.bannerImage.split("/");
        const fileWithExt = urlParts[urlParts.length - 1];
        const fileNameOnly = fileWithExt.split(".")[0];
        const folder = urlParts[urlParts.length - 2];
        const publicId = `${folder}/${fileNameOnly}`;
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      } catch {
        console.warn("[deleteSubjectBanner] Cloudinary delete failed");
      }
    }

    await prisma.subjectPageSettings.update({
      where: { subjectId_teacherId: { subjectId, teacherId: userId } },
      data: { bannerImage: null },
    });

    revalidatePath(`/list/subjects/${subjectId}`);
    return { success: true, error: false, message: "Banner removed successfully!" };
  } catch (err) {
    console.error("[deleteSubjectBanner]", err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}
