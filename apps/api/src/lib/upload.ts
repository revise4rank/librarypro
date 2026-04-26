import multer from "multer";
import { AppError } from "./errors";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  ...ALLOWED_IMAGE_MIME_TYPES,
  "application/pdf",
]);

export const publicProfileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      return callback(new AppError(400, "Only JPG, PNG, and WEBP images are allowed.", "INVALID_UPLOAD_TYPE"));
    }

    return callback(null, true);
  },
});

export const admissionDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      return callback(new AppError(400, "Only PDF, JPG, PNG, and WEBP files are allowed.", "INVALID_UPLOAD_TYPE"));
    }

    return callback(null, true);
  },
});
