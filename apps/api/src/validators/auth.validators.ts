import { z } from "zod";

export const loginBodySchema = z.object({
  login: z.string().trim().min(3),
  password: z.string().min(6),
});

export const forgotPasswordBodySchema = z.object({
  login: z.string().trim().min(3).max(180),
});

export const resetPasswordBodySchema = z.object({
  token: z.string().trim().min(20),
  password: z.string().min(6).max(120),
});

export const googleOAuthRoleSchema = z.enum(["LIBRARY_OWNER", "STUDENT"]);
const studentGenderSchema = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);
const optionalDateOfBirthSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(""));

export const googleOAuthStatusQuerySchema = z.object({});

export const googleOAuthStartQuerySchema = z.object({
  role: googleOAuthRoleSchema,
  next: z.string().trim().max(300).optional().or(z.literal("")),
  library: z.string().trim().max(80).optional().or(z.literal("")),
});

export const googleOAuthCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  error: z.string().trim().max(200).optional(),
});

export const googleOAuthTicketQuerySchema = z.object({
  ticket: z.string().trim().min(20),
});

export const googleOAuthCompleteBodySchema = z.object({
  ticket: z.string().trim().min(20),
  fullName: z.string().trim().min(2).max(150).optional().or(z.literal("")),
  phone: z.string().trim().min(6).max(20).optional().or(z.literal("")),
  libraryName: z.string().trim().min(2).max(180).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(120).optional().or(z.literal("")),
});

export const studentRegisterBodySchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  dateOfBirth: optionalDateOfBirthSchema,
  gender: studentGenderSchema.optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(6).max(120),
  referralCode: z.string().trim().max(120).optional().or(z.literal("")),
});

export const ownerRegisterBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(150),
    libraryName: z.string().trim().min(2).max(180),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    password: z.string().min(6).max(120),
    referralCode: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Either email or phone is required",
    path: ["email"],
  });

export const updateMeBodySchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  dateOfBirth: optionalDateOfBirthSchema,
  gender: studentGenderSchema.optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(6).max(120),
  nextPassword: z.string().min(6).max(120),
});
