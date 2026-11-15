import {
  BLOCKED_EXTENSIONS,
  EXAM_FILE_MAX_SIZE_MB,
  FileConfig,
} from "../formValidationSchemas";

type ExamFileIds = {
  schoolId: number;
  examId: number;
  submissionId: number;
  questionId: number;
};

const MB = 1024 * 1024;

/** The Cloudinary folder a student's upload for one question is signed into. */
export const getExamFileFolder = (ids: ExamFileIds) =>
  `exams/${ids.schoolId}/${ids.examId}/${ids.submissionId}/${ids.questionId}`;

/** True only for a file directly inside this submission's question folder. */
export const isExamFilePublicIdFor = (publicId: string, ids: ExamFileIds) => {
  const prefix = `${getExamFileFolder(ids)}/`;
  if (!publicId.startsWith(prefix)) return false;

  const name = publicId.slice(prefix.length);
  return name.length > 0 && !name.includes("/") && !name.includes("..");
};

export const getFileExtension = (name: string) => {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(dotIndex + 1).toLowerCase() : "";
};

/** Returns an error message, or null when the file meets the question's rules. */
export const checkUploadedExamFile = (
  file: { extension: string; bytes: number },
  config: FileConfig | null,
): string | null => {
  const allowed = config?.allowedExtensions.map((ext) => ext.toLowerCase()) ?? [];

  if (
    BLOCKED_EXTENSIONS.has(file.extension) ||
    (allowed.length > 0 && !allowed.includes(file.extension))
  ) {
    return `Files of type ".${file.extension || "?"}" are not allowed for this question.`;
  }

  const maxMb = Math.min(config?.maxFileSizeMb ?? EXAM_FILE_MAX_SIZE_MB, EXAM_FILE_MAX_SIZE_MB);
  if (file.bytes > maxMb * MB) {
    return `File is larger than ${maxMb} MB.`;
  }

  const minMb = config?.minFileSizeMb ?? 0;
  if (minMb > 0 && file.bytes < minMb * MB) {
    return `File is smaller than ${minMb} MB.`;
  }

  return null;
};
