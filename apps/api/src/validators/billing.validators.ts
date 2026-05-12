import { z } from "zod";

export const billingRenewBodySchema = z.object({
  planCode: z.enum(["STARTER_449_2M", "GROWTH_999_6M"]).default("GROWTH_999_6M"),
});
