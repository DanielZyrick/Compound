import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

// timestamptz columns: read as Date, written as Date or ISO string.
type Timestamp = ColumnType<Date, Date | string, Date | string>;

// Same as Timestamp, but the database fills it in (default now()).
type CreatedAt = ColumnType<Date, Date | string | undefined, never>;

// date columns: always a "YYYY-MM-DD" string (see create-db.ts), never a Date,
// so a calendar day can't shift when converted between timezones.
type CalendarDate = string;

export const GOALS = ["career", "business", "faith", "health", "custom"] as const;
export type Goal = (typeof GOALS)[number];

// Weekdays use JavaScript's numbering: 0 = Sunday ... 6 = Saturday.
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface UsersTable {
  id: Generated<string>;
  email: string;
  name: string | null;
  image: string | null;
  timezone: ColumnType<string, string | undefined, string>;
  created_at: CreatedAt;
  onboarded_at: Timestamp | null; // null until onboarding is finished
}

export interface FocusAreasTable {
  id: Generated<string>;
  user_id: string;
  goal: Goal;
  custom_label: string | null; // required when goal = 'custom', otherwise null
  description: string | null; // what the user wants to achieve; null on rows from before migration 004
  created_at: CreatedAt;
}

export interface HabitsTable {
  id: Generated<string>;
  user_id: string;
  name: string;
  schedule: ColumnType<Weekday[], Weekday[] | undefined, Weekday[]>;
  created_at: CreatedAt;
  archived_at: Timestamp | null;
}

export interface HabitCheckinsTable {
  id: Generated<string>;
  habit_id: string;
  date: CalendarDate;
  created_at: CreatedAt;
}

export interface Database {
  users: UsersTable;
  focus_areas: FocusAreasTable;
  habits: HabitsTable;
  habit_checkins: HabitCheckinsTable;
}

// Row types for use in the rest of the app.
export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export type FocusArea = Selectable<FocusAreasTable>;
export type NewFocusArea = Insertable<FocusAreasTable>;

export type Habit = Selectable<HabitsTable>;
export type NewHabit = Insertable<HabitsTable>;
export type HabitUpdate = Updateable<HabitsTable>;

export type HabitCheckin = Selectable<HabitCheckinsTable>;
export type NewHabitCheckin = Insertable<HabitCheckinsTable>;
