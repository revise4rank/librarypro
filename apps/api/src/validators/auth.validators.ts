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
