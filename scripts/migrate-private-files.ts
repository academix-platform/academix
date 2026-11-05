import "dotenv/config";
import cloudinary, { getCloudinaryAssetDetails } from "../src/lib/cloudinary";
import prisma from "../src/lib/prisma";

type ResourceType = "image" | "video" | "raw";
type DeliveryType = "upload" | "private" | "authenticated";
type FileTable = "assignment" | "studyMaterial" | "submission";

type FileReference = {
  table: FileTable;
  id: number;
  fileUrl: string;
};

type CloudinaryAsset = {
  resourceType: ResourceType;
  deliveryType: DeliveryType;
  publicId: string;
};

function parseCloudinaryAsset(fileUrl: string): CloudinaryAsset | null {
  const asset = getCloudinaryAssetDetails(fileUrl);
  if (!asset) return null;

  return {
    resourceType: asset.resourceType,
    deliveryType: asset.deliveryType,
    publicId: asset.publicId,
  };
}

function assetKey(asset: CloudinaryAsset) {
  return `${asset.resourceType}:${asset.deliveryType}:${asset.publicId}`;
}

async function loadFileReferences(): Promise<FileReference[]> {
  const [assignments, materials, submissions] = await Promise.all([
    prisma.assignment.findMany({
      where: { fileUrl: { not: null } },
      select: { id: true, fileUrl: true },
    }),
    prisma.studyMaterial.findMany({ select: { id: true, fileUrl: true } }),
    prisma.assignmentSubmission.findMany({
      select: { id: true, fileUrl: true },
    }),
  ]);

  return [
    ...assignments.flatMap((record) =>
      record.fileUrl
        ? [{ table: "assignment" as const, id: record.id, fileUrl: record.fileUrl }]
        : [],
    ),
    ...materials.map((record) => ({
      table: "studyMaterial" as const,
      id: record.id,
      fileUrl: record.fileUrl,
    })),
    ...submissions.map((record) => ({
      table: "submission" as const,
      id: record.id,
      fileUrl: record.fileUrl,
    })),
  ];
}

async function updateFileUrl(reference: FileReference, fileUrl: string) {
  switch (reference.table) {
    case "assignment":
      await prisma.assignment.updateMany({
        where: { id: reference.id, fileUrl: reference.fileUrl },
        data: { fileUrl },
      });
      break;
    case "studyMaterial":
      await prisma.studyMaterial.updateMany({
        where: { id: reference.id, fileUrl: reference.fileUrl },
        data: { fileUrl },
      });
      break;
    case "submission":
      await prisma.assignmentSubmission.updateMany({
        where: { id: reference.id, fileUrl: reference.fileUrl },
        data: { fileUrl },
      });
      break;
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  const references = await loadFileReferences();
  const assets = new Map<string, { asset: CloudinaryAsset; references: FileReference[] }>();
  let unsupported = 0;

  for (const reference of references) {
    const asset = parseCloudinaryAsset(reference.fileUrl);
    if (!asset) {
      unsupported += 1;
      continue;
    }
    if (asset.deliveryType === "authenticated") continue;

    const key = assetKey(asset);
    const existing = assets.get(key);
    if (existing) existing.references.push(reference);
    else assets.set(key, { asset, references: [reference] });
  }

  console.log(
    `${execute ? "Migrating" : "Dry run:"} ${assets.size} Cloudinary assets; ${unsupported} unsupported file URLs.`,
  );
  if (!execute) {
    console.log("Run with --execute to convert assets and update database URLs.");
    return;
  }

  let migrated = 0;
  let failed = 0;
  for (const { asset, references: assetReferences } of assets.values()) {
    try {
      const result = await cloudinary.uploader.rename(
        asset.publicId,
        asset.publicId,
        {
          resource_type: asset.resourceType,
          type: asset.deliveryType,
          to_type: "authenticated",
          invalidate: true,
        },
      );

      for (const reference of assetReferences) {
        await updateFileUrl(reference, result.secure_url);
      }
      migrated += 1;
    } catch (error) {
      failed += 1;
      console.error(`Failed to migrate ${asset.resourceType} asset ${asset.publicId}:`, error);
    }
  }

  console.log(`Migrated ${migrated} assets; ${failed} failed.`);
  if (failed > 0 || unsupported > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("File migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });