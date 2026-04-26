import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "../lib/errors";
import { env } from "../config/env";

function safeFileName(originalName: string) {
  const cleaned = originalName.replace(/[^a-zA-Z0-9.-]/g, "-");
  return `${Date.now()}-${cleaned}`;
}

type SupportedImageMimeType = "image/jpeg" | "image/png" | "image/webp";
type SupportedDocumentMimeType = SupportedImageMimeType | "application/pdf";

function detectImageMimeType(buffer: Buffer): SupportedImageMimeType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function detectPdfMimeType(buffer: Buffer): "application/pdf" | null {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  return null;
}

function assertSafeImageUpload(file: Express.Multer.File) {
  const detectedMimeType = detectImageMimeType(file.buffer);
  if (!detectedMimeType) {
    throw new AppError(400, "Unsupported or invalid image file.", "INVALID_UPLOAD_TYPE");
  }

  if (file.mimetype.toLowerCase() !== detectedMimeType) {
    throw new AppError(400, "Uploaded image type does not match file contents.", "UPLOAD_TYPE_MISMATCH");
  }
}

function assertSafeDocumentUpload(file: Express.Multer.File) {
  const detectedMimeType = detectImageMimeType(file.buffer) ?? detectPdfMimeType(file.buffer);
  if (!detectedMimeType) {
    throw new AppError(400, "Unsupported or invalid document file.", "INVALID_UPLOAD_TYPE");
  }

  if (file.mimetype.toLowerCase() !== detectedMimeType) {
    throw new AppError(400, "Uploaded document type does not match file contents.", "UPLOAD_TYPE_MISMATCH");
  }
}

async function saveToLocal(file: Express.Multer.File, objectPath: string) {
  const fileName = safeFileName(file.originalname);
  const relativeDirectory = path.dirname(objectPath);
  const targetDirectory = path.resolve(env.uploadsDir, relativeDirectory);
  await fs.mkdir(targetDirectory, { recursive: true });
  await fs.writeFile(path.join(targetDirectory, fileName), file.buffer);

  return {
    fileName,
    url: `/uploads/${relativeDirectory}/${fileName}`,
    provider: "local",
  };
}

async function saveToSupabase(file: Express.Multer.File, objectPath: string, contentTypeOverride?: SupportedDocumentMimeType) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase storage env is incomplete.");
  }

  const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const fileName = safeFileName(file.originalname);
  const finalObjectPath = `${objectPath}/${fileName}`;
  const upload = await client.storage.from(env.supabaseBucket).upload(finalObjectPath, file.buffer, {
    contentType: contentTypeOverride ?? file.mimetype,
    upsert: true,
  });

  if (upload.error) {
    throw upload.error;
  }

  const { data } = client.storage.from(env.supabaseBucket).getPublicUrl(finalObjectPath);

  return {
    fileName,
    url: data.publicUrl,
    provider: "supabase",
  };
}

export async function saveUploadedAsset(input: {
  file: Express.Multer.File;
  libraryId: string;
}) {
  assertSafeImageUpload(input.file);
  const objectPath = `libraries/${input.libraryId}/public-profile`;
  if (env.uploadsProvider === "supabase") {
    return saveToSupabase(input.file, objectPath);
  }

  return saveToLocal(input.file, objectPath);
}

export async function saveUploadedAdmissionDocument(input: {
  file: Express.Multer.File;
  libraryId: string;
}) {
  assertSafeDocumentUpload(input.file);
  const objectPath = `libraries/${input.libraryId}/admissions`;
  if (env.uploadsProvider === "supabase") {
    return saveToSupabase(input.file, objectPath, (detectImageMimeType(input.file.buffer) ?? detectPdfMimeType(input.file.buffer)) ?? input.file.mimetype as SupportedDocumentMimeType);
  }

  return saveToLocal(input.file, objectPath);
}
