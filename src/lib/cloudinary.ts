// import { v2 as cloudinary } from 'cloudinary';

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// export default cloudinary;
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export const generateExamUploadSignature = (
  schoolId: number, examId: number, submissionId: number, questionId: number
): { signature: string; timestamp: number; folder: string; apiKey: string; cloudName: string } => {
  const folder = `exams/${schoolId}/${examId}/${submissionId}/${questionId}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, timestamp, type: "private" };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);
  return { signature, timestamp, folder, apiKey: process.env.CLOUDINARY_API_KEY!, cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME! };
};

export const generatePrivateDownloadUrl = (publicId: string, format: string): string => {
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "raw",
    type: "private",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    attachment: true,
  });
};

export const deleteExamFileFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "private" });
  } catch (err) {
    console.error("[Cloudinary] Failed to delete exam file:", publicId, err);
  }
};