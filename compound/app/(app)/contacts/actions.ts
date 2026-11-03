"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { nextFollowUpDate } from "@/lib/contacts/follow-up";
import { addDays, todayIn } from "@/lib/dates/calendar";
import {
  deleteContactSchema,
  deleteTouchpointSchema,
  logTouchpointSchema,
  quickAddContactSchema,
  saveContactSchema,
  snoozeFollowUpSchema,
} from "@/lib/validation/contacts";

export type ContactActionResult = { errors: string[] };

const GONE = "That contact no longer exists.";
const SOMETHING_WRONG = "Something went wrong. Please refresh and try again.";

/** Plenty for a personal network; stops runaway scripts filling the table. */
const MAX_CONTACTS = 1000;

function messages(issues: { message: string }[]) {
  return [...new Set(issues.map((i) => i.message))];
}

/** Adds a contact from the quick-add row: a name and, optionally, a company. */
export async function addContact(input: unknown): Promise<ContactActionResult> {
  const user = await requireOnboardedUser();
  const parsed = quickAddContactSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };

  const { count } = await db
    .selectFrom("contacts")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("user_id", "=", user.id)
    .executeTakeFirstOrThrow();
  if (Number(count) >= MAX_CONTACTS) {
    return { errors: [`You can keep up to ${MAX_CONTACTS} contacts. Delete some you no longer need.`] };
  }

  await db.insertInto("contacts").values({ user_id: user.id, ...parsed.data }).execute();
  refresh();
  return { errors: [] };
}

/** Saves the full contact form. A linked goal must be one of the user's own. */
export async function saveContact(input: unknown): Promise<ContactActionResult> {
  const user = await requireOnboardedUser();
  const parsed = saveContactSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };
  const { id, whereMet, followUpOn, goalId, ...fields } = parsed.data;

  if (goalId) {
    const goal = await db
      .selectFrom("goals")
      .select("id")
      .where("id", "=", goalId)
      .where("user_id", "=", user.id)
      .executeTakeFirst();
    if (!goal) return { errors: ["That goal no longer exists."] };
  }

  const updated = await db
    .updateTable("contacts")
    .set({ ...fields, where_met: whereMet, follow_up_on: followUpOn, goal_id: goalId, updated_at: new Date() })
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (updated.numUpdatedRows === BigInt(0)) return { errors: [GONE] };

  refresh();
  return { errors: [] };
}

/** Deletes a contact, then goes back to the list. */
export async function deleteContact(input: unknown): Promise<ContactActionResult> {
  const user = await requireOnboardedUser();
  const parsed = deleteContactSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };

  await db.deleteFrom("contacts").where("id", "=", parsed.data.id).where("user_id", "=", user.id).execute();
  redirect("/contacts");
}

/** The contact, if it's the user's. */
function ownContact(userId: string, contactId: string) {
  return db.selectFrom("contacts").select("id").where("id", "=", contactId).where("user_id", "=", userId).executeTakeFirst();
}

/**
 * Logs that the user was in touch with a contact, and sets (or clears) the
 * next follow-up. "Today" comes from the user's timezone, not the browser.
 */
export async function logTouchpoint(input: unknown): Promise<ContactActionResult> {
  const user = await requireOnboardedUser();
  const parsed = logTouchpointSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };
  const { contactId, happenedOn, note, next } = parsed.data;

  const today = todayIn(user.timezone);
  if (happenedOn > today) return { errors: ["That date is in the future. Log it once it's happened."] };
  if (!(await ownContact(user.id, contactId))) return { errors: [GONE] };

  await db.transaction().execute(async (trx) => {
    await trx.insertInto("contact_touchpoints").values({ contact_id: contactId, happened_on: happenedOn, note }).execute();
    await trx
      .updateTable("contacts")
      .set({ follow_up_on: nextFollowUpDate(next, today), updated_at: new Date() })
      .where("id", "=", contactId)
      .where("user_id", "=", user.id)
      .execute();
  });

  refresh();
  return { errors: [] };
}

/** Removes a touchpoint logged by mistake. */
export async function deleteTouchpoint(input: unknown): Promise<ContactActionResult> {
  const user = await requireOnboardedUser();
  const parsed = deleteTouchpointSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };

  // Only through the user's own contacts.
  await db
    .deleteFrom("contact_touchpoints")
    .where("id", "=", parsed.data.id)
    .where("contact_id", "in", db.selectFrom("contacts").select("id").where("user_id", "=", user.id))
    .execute();

  refresh();
  return { errors: [] };
}

/** Moves a follow-up to a week from today. */
export async function snoozeFollowUp(input: unknown): Promise<ContactActionResult> {
  const user = await requireOnboardedUser();
  const parsed = snoozeFollowUpSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };

  const updated = await db
    .updateTable("contacts")
    .set({ follow_up_on: addDays(todayIn(user.timezone), 7), updated_at: new Date() })
    .where("id", "=", parsed.data.contactId)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (updated.numUpdatedRows === BigInt(0)) return { errors: [GONE] };

  refresh();
  return { errors: [] };
}
