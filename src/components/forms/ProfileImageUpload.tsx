"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { Camera, CheckCircle, Loader2 } from "lucide-react";
import { getProfileImageUploadSignature } from "@/lib/actions";

type SignatureResponse = {
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const uploadImageToCloudinary = (
  file: File,
  sig: SignatureResponse,
  onProgress: (progress: number) => void,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sig.apiKey);
    formData.append("signature", sig.signature);
    formData.append("timestamp", String(sig.timestamp));
    formData.append("folder", sig.folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (typeof response.secure_url === "string") {
            resolve(response.secure_url);
            return;
          }
          reject(new Error("Upload response did not include an image URL."));
        } catch {
          reject(new Error("Failed to parse upload response."));
        }
        return;
      }

      try {
        const response = JSON.parse(xhr.responseText);
        reject(new Error(response.error?.message ?? "Upload failed."));
      } catch {
        reject(new Error("Upload failed."));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error.")));
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    );
    xhr.send(formData);
  });
};

const isAllowedImage = (file: File) =>
  ["image/jpeg", "image/png", "image/webp"].includes(file.type);

const ProfileImageUpload = ({
  value,
  onChange,
  uploadLabel,
  previewAlt,
  photoUploadedLabel,
  removePhotoLabel,
  errorMessage,
}: {
  value: string;
  onChange: (url: string) => void;
  uploadLabel: string;
  previewAlt: string;
  photoUploadedLabel: string;
  removePhotoLabel: string;
  errorMessage: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSucceeded, setUploadSucceeded] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!isAllowedImage(file) || file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(errorMessage);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSucceeded(false);
    try {
      const signature = await getProfileImageUploadSignature();
      if ("error" in signature) {
        throw new Error(signature.error);
      }

      const secureUrl = await uploadImageToCloudinary(
        file,
        signature,
        setUploadProgress,
      );
      setUploadProgress(100);
      setUploadSucceeded(true);
      onChange(secureUrl);
    } catch (err) {
      console.error("[ProfileImageUpload]", err);
      toast.error(errorMessage);
      setUploadProgress(0);
      setUploadSucceeded(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="group flex items-center gap-3 hover:bg-academixPurpleLight disabled:opacity-60 p-4 border-2 border-gray-300 hover:border-academixPurpleDark border-dashed rounded-lg transition-all cursor-pointer"
      >
        <Image
          src="/upload.png"
          alt=""
          width={32}
          height={32}
          className="group-hover:scale-110 transition-transform"
        />
        <span className="inline-flex items-center gap-2 font-medium text-gray-700 text-sm">
          {isUploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Camera size={16} />
          )}
          {uploadLabel}
          {isUploading && (
            <span className="font-semibold text-academixPurpleDark text-xs">
              {uploadProgress}%
            </span>
          )}
        </span>
      </button>

      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between items-center text-gray-500 text-xs">
            <span>{uploadProgress}%</span>
          </div>
          <div className="bg-gray-200 rounded-full w-full h-2 overflow-hidden">
            <div
              className="bg-academixPurpleDark rounded-full h-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {value && (
        <div className="flex items-start gap-4 bg-white p-4 border border-gray-200 rounded-lg">
          <Image
            src={value}
            alt={previewAlt}
            width={80}
            height={80}
            className="border border-gray-200 rounded-lg w-20 h-20 object-cover"
          />
          <div className="flex flex-col gap-2">
            <p className="inline-flex items-center gap-2 mb-2 font-medium text-gray-700 text-sm">
              {uploadSucceeded && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
              {photoUploadedLabel}
            </p>
            <button
              type="button"
              onClick={() => {
                setUploadSucceeded(false);
                setUploadProgress(0);
                onChange("");
              }}
              className="font-medium text-red-500 hover:text-red-700 text-sm transition-colors"
            >
              {removePhotoLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileImageUpload;
