import { z } from "zod";
import { timezoneSchema } from "./onboarding";

export const displayNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Your name can't be empty." })
    .max(60, { error: "Keep your name under 60 characters." }),
});

export const timezoneSettingSchema = z.object({ timezone: timezoneSchema });
