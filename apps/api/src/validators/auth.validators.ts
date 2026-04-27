import { z } from "zod";

export const loginBodySchema = z.object({
  login: z.string().trim().min(3),
  password: z.string().min(6),
});

export const studentRegisterBodySchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(6).max(120),
});

export const ownerRegisterBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(150),
    libraryName: z.string().trim().min(2).max(180),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    password: z.string().min(6).max(120),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Either email or phone is required",
    path: ["email"],
  });

export const updateMeBodySchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(6).max(120),
  nextPassword: z.string().min(6).max(120),
});
