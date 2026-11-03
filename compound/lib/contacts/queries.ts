import "server-only";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";
import { containsPattern } from "./follow-up";

export type ContactFilter = "all" | "due" | "goal";

export type ContactRow = {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  follow_up_on: CalendarDate | null;
  goal_title: string | null;
};

export type Contact = ContactRow & {
  where_met: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  notes: string | null;
  goal_id: string | null;
};

/**
 * The user's contacts, searched by name, company or role. "due" keeps those
 * to follow up with today or earlier; "goal" keeps those linked to a goal.
 * Soonest follow-up first, then by name.
 */
export async function getContacts(
  userId: string,
  { search, filter, today }: { search: string; filter: ContactFilter; today: CalendarDate },
): Promise<ContactRow[]> {
  let query = db
    .selectFrom("contacts")
    .leftJoin("goals", "goals.id", "contacts.goal_id")
    .select([
      "contacts.id",
      "contacts.name",
      "contacts.company",
      "contacts.role",
      "contacts.follow_up_on",
      "goals.title as goal_title",
    ])
    .where("contacts.user_id", "=", userId);

  if (search) {
    const pattern = containsPattern(search);
    query = query.where((eb) =>
      eb.or([
        eb("contacts.name", "ilike", pattern),
        eb("contacts.company", "ilike", pattern),
        eb("contacts.role", "ilike", pattern),
      ]),
    );
  }
  if (filter === "due") query = query.where("contacts.follow_up_on", "<=", today);
  if (filter === "goal") query = query.where("contacts.goal_id", "is not", null);

  return query
    .orderBy((eb) => eb.ref("contacts.follow_up_on"), (ob) => ob.asc().nullsLast())
    .orderBy("contacts.name")
    .execute();
}

/** One contact with everything on it, or null if it isn't the user's. */
export async function getContact(userId: string, id: string): Promise<Contact | null> {
  const contact = await db
    .selectFrom("contacts")
    .leftJoin("goals", "goals.id", "contacts.goal_id")
    .selectAll("contacts")
    .select("goals.title as goal_title")
    .where("contacts.id", "=", id)
    .where("contacts.user_id", "=", userId)
    .executeTakeFirst();
  return contact ?? null;
}

/** The user's active goals, for the "related goal" picker. */
export function getGoalOptions(userId: string) {
  return db
    .selectFrom("goals")
    .select(["id", "title"])
    .where("user_id", "=", userId)
    .where("status", "=", "active")
    .orderBy("created_at")
    .execute();
}

export type Touchpoint = { id: string; happened_on: CalendarDate; note: string | null };

/** A contact's touchpoints, newest first. The first one's date is "last contacted". */
export function getTouchpoints(contactId: string, limit = 20): Promise<Touchpoint[]> {
  return db
    .selectFrom("contact_touchpoints")
    .select(["id", "happened_on", "note"])
    .where("contact_id", "=", contactId)
    .orderBy("happened_on", "desc")
    .orderBy("created_at", "desc")
    .limit(limit)
    .execute();
}

export type DueFollowUp = { id: string; name: string; company: string | null; follow_up_on: CalendarDate };

/** Contacts to follow up with today or earlier (the oldest first), and how many there are in all. */
export async function getDueFollowUps(userId: string, today: CalendarDate, limit = 3) {
  const due = db
    .selectFrom("contacts")
    .where("user_id", "=", userId)
    .where("follow_up_on", "<=", today);
  const [contacts, { count }] = await Promise.all([
    due
      .select(["id", "name", "company", "follow_up_on"])
      .orderBy("follow_up_on")
      .orderBy("name")
      .limit(limit)
      .execute() as Promise<DueFollowUp[]>,
    due.select((eb) => eb.fn.countAll<string>().as("count")).executeTakeFirstOrThrow(),
  ]);
  return { contacts, total: Number(count) };
}

/** The contacts linked to one of the user's goals, for the goal page. */
export function getGoalContacts(userId: string, goalId: string) {
  return db
    .selectFrom("contacts")
    .select(["id", "name", "company", "role", "follow_up_on"])
    .where("user_id", "=", userId)
    .where("goal_id", "=", goalId)
    .orderBy("name")
    .execute();
}
