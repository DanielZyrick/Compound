import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

// timestamptz columns: read as Date, written as Date or ISO string.
type Timestamp = ColumnType<Date, Date | string, Date | string>;

// Same as Timestamp, but the database fills it in (default now()).
type CreatedAt = ColumnType<Date, Date | string | undefined, never>;

// date columns: always a "YYYY-MM-DD" string (see create-db.ts), never a Date,
// so a calendar day can't shift when converted between timezones.
export type CalendarDate = string;

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

export const TRACK_TYPES = ["skill", "reading", "thinking"] as const;
export type TrackType = (typeof TRACK_TYPES)[number];
export const TRACK_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type TrackLevel = (typeof TRACK_LEVELS)[number];
export type TrackStatus = "active" | "completed" | "archived";

export interface TracksTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  topic: string; // what the user asked to learn, in their words
  type: TrackType;
  level: TrackLevel;
  total_days: number;
  start_date: CalendarDate;
  habit_id: string | null; // the habit a finished lesson checks off
  status: ColumnType<TrackStatus, TrackStatus | undefined, TrackStatus>;
  plan_source: "ai" | "demo"; // demo: the built-in example plan, used without an API key
  created_at: CreatedAt;
}

export interface TrackDaysTable {
  id: Generated<string>;
  track_id: string;
  day_number: number; // 1 ... total_days
  title: string;
  summary: string;
  completed_at: Timestamp | null; // when the learner finished this day's lesson
}

export interface LessonsTable {
  id: Generated<string>;
  track_day_id: string;
  // JSON written once as a string; read as unknown and validated with Zod
  // (lib/lessons/schema.ts) before use.
  content: ColumnType<unknown, string, never>;
  source: "ai" | "demo";
  created_at: CreatedAt;
}

export interface AttemptsTable {
  id: Generated<string>;
  lesson_id: string;
  user_id: string;
  exercise_index: number;
  answer: string;
  is_correct: boolean | null; // null when not graded (demo mode)
  feedback: string | null;
  better_version: string | null;
  source: "auto" | "ai" | "demo"; // auto: multiple choice, graded by the server
  created_at: CreatedAt;
}

export interface AiCallsTable {
  id: Generated<string>;
  user_id: string;
  day: CalendarDate; // the user's local date, for the daily limit
  purpose: string;
  model: string;
  ok: boolean;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: CreatedAt;
}

export interface Database {
  users: UsersTable;
  focus_areas: FocusAreasTable;
  habits: HabitsTable;
  habit_checkins: HabitCheckinsTable;
  tracks: TracksTable;
  track_days: TrackDaysTable;
  ai_calls: AiCallsTable;
  lessons: LessonsTable;
  attempts: AttemptsTable;
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

export type Track = Selectable<TracksTable>;
export type TrackDay = Selectable<TrackDaysTable>;
