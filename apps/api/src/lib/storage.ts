import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

function safeFileName(originalName: string) {
  const cleaned = originalName.replace(/[^a-zA-Z0-9.-]/g, "-");
  return `${Date.now()}-${cleaned}`;
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

async function saveToSupabase(file: Express.Multer.File, objectPath: string) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase storage env is incomplete.");
  }

  const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const fileName = safeFileName(file.originalname);
  const finalObjectPath = `${objectPath}/${fileName}`;
  const upload = await client.storage.from(env.supabaseBucket).upload(finalObjectPath, file.buffer, {
    contentType: file.mimetype,
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
  const objectPath = `libraries/${input.libraryId}/public-profile`;
  if (env.uploadsProvider === "supabase") {
    return saveToSupabase(input.file, objectPath);
  }

  return saveToLocal(input.file, objectPath);
}
