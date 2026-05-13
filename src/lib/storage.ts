import fs from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type UploadResult = {
  url: string;
  filename: string;
};

/**
 * Validate a File before upload.
 * Returns null if valid, or an error message string if invalid.
 */
export const validateFile = (file: File): string | null => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Allowed: PDF, JPEG, PNG, JPG, DOC, DOCX.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "File size exceeds the 10 MB limit.";
  }
  return null;
};

/**
 * Validate a stored file URL (relative path under /uploads/).
 * Used server-side to reject tampered URLs.
 */
export const validateFileUrl = (url: string): boolean => {
  // Must be a relative path starting with /uploads/
  return /^\/uploads\/\d+\/[^/]+\/\d+_[^/]+$/.test(url);
};

/**
 * Upload a file to the local filesystem (Phase 1).
 * Phase 2: Swap internals here for Cloudinary — zero other files change.
 *
 * Saves to: /public/uploads/{examId}/{studentId}/{timestamp}_{filename}
 * Returns the public URL: /uploads/{examId}/{studentId}/{timestamp}_{filename}
 */
export const uploadFile = async (
  file: File,
  examId: number,
  studentId: string
): Promise<UploadResult> => {
  const validationError = validateFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const timestamp = Date.now();
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${timestamp}_${safeFilename}`;

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    String(examId),
    studentId
  );

  await fs.mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  const url = `/uploads/${examId}/${studentId}/${filename}`;
  return { url, filename };
};

/**
 * Delete a file from the local filesystem by its public URL.
 * Silently ignores errors (file may already be deleted).
 */
export const deleteFile = async (url: string): Promise<void> => {
  try {
    const relativePath = url.startsWith("/uploads/") ? url.slice(1) : null;
    if (!relativePath) return;

    const absolutePath = path.join(process.cwd(), "public", relativePath);
    await fs.unlink(absolutePath);
  } catch {
    // Silently ignore — file may not exist
  }
};
