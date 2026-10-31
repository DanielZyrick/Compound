import { z } from "zod";

export const CONTACT_LIMITS = {
  name: 80,
  company: 80,
  role: 80,
  whereMet: 120,
  email: 254,
  phone: 40,
  linkedin: 200,
  notes: 2000,
} as const;

/** Optional text: trimmed, with an empty answer saved as null. */
function optional(max: number, what: string) {
  return z
    .string()
    .trim()
    .max(max, { error: `Keep ${what} under ${max} characters.` })
    .optional()
    .transform((text) => (text ? text : null));
}

const name = z
  .string()
  .trim()
  .min(1, { error: "Every contact needs a name." })
  .max(CONTACT_LIMITS.name, { error: `Keep the name under ${CONTACT_LIMITS.name} characters.` });

/** The quick-add row: a name and, optionally, a company. */
export const quickAddContactSchema = z.object({ name, company: optional(CONTACT_LIMITS.company, "the company") });

/** The full contact form. */
export const saveContactSchema = z.object({
  id: z.uuid(),
  name,
  company: optional(CONTACT_LIMITS.company, "the company"),
  role: optional(CONTACT_LIMITS.role, "the role"),
  whereMet: optional(CONTACT_LIMITS.whereMet, "where you met"),
  email: z
    .union([z.literal(""), z.email({ error: "That email address doesn't look right." }).max(CONTACT_LIMITS.email)])
    .optional()
    .transform((email) => (email ? email : null)),
  phone: z
    .string()
    .trim()
    .max(CONTACT_LIMITS.phone, { error: `Keep the phone number under ${CONTACT_LIMITS.phone} characters.` })
    .regex(/^[0-9+()\-.\s]*$/, { error: "Use only digits, spaces and + ( ) - in the phone number." })
    .optional()
    .transform((phone) => (phone ? phone : null)),
  linkedin: z
    .string()
    .trim()
    .max(CONTACT_LIMITS.linkedin, { error: `Keep the link under ${CONTACT_LIMITS.linkedin} characters.` })
    .refine((link) => link === "" || /^https:\/\/[^\s]+\.[^\s]+/.test(link), {
      error: "Paste the full link, starting with https://",
    })
    .optional()
    .transform((link) => (link ? link : null)),
  notes: optional(CONTACT_LIMITS.notes, "the notes"),
  followUpOn: z
    .union([z.literal(""), z.iso.date({ error: "Choose a follow-up date." })])
    .optional()
    .transform((date) => (date ? date : null)),
  goalId: z
    .union([z.literal(""), z.uuid()])
    .optional()
    .transform((id) => (id ? id : null)),
});

export const deleteContactSchema = z.object({ id: z.uuid() });

export type SaveContactInput = z.input<typeof saveContactSchema>;
