import { z } from "zod";

export const billingRenewBodySchema = z.object({
  planCode: z.enum(["STARTER_499", "GROWTH_999"]).default("GROWTH_999"),
});
