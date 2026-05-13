import { z } from "zod";

export const billingRenewBodySchema = z.object({
  planCode: z.string().trim().min(2).max(80),
});
