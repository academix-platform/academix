"use server";

import { generateProfileImageUploadSignature } from "../cloudinary";
import { requireActionAccess } from "./helpers";

export const getProfileImageUploadSignature = async () => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return { error: "Unauthorized" };

  try {
    return generateProfileImageUploadSignature(access.schoolId);
  } catch (err) {
    console.error("[getProfileImageUploadSignature]", err);
    return { error: "Something went wrong." };
  }
};
