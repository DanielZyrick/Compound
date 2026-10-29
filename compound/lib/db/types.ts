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
  currency: ColumnType<string, string | undefined, string>; // ISO code, e.g. "PHP"
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
  level: TrackLevel | null; // null for reading tracks
  reading_plan: string | null; // reading tracks: the fixed plan's id (lib/reading/plans.ts)
  total_days: number;
  start_date: CalendarDate;
  habit_id: string | null; // the habit a finished lesson checks off
  status: ColumnType<TrackStatus, TrackStatus | undefined, TrackStatus>;
  // ai: written by Claude; demo: the built-in example (no API key);
  // fixed: a reading plan from the code.
  plan_source: "ai" | "demo" | "fixed";
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

export interface DailyPrinciplesTable {
  id: Generated<string>;
  user_id: string;
  date: CalendarDate; // the user's local date
  // JSON written once as a string; read as unknown and validated with Zod
  // (lib/principles/schema.ts) before use.
  content: ColumnType<unknown, string, never>;
  source: "ai" | "demo";
  reflection: string | null;
  created_at: CreatedAt;
}

export interface ReflectionsTable {
  id: Generated<string>;
  user_id: string;
  track_day_id: string; // one reflection per day
  text: string;
  created_at: CreatedAt;
  // Defaults to now() on insert; set explicitly when the reflection is edited.
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type GoalStatus = "active" | "completed" | "archived";

export interface GoalsTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  why: string; // the user's reason, in their own words
  start_date: CalendarDate;
  deadline: CalendarDate;
  buffer_days: number; // days before the deadline kept free for setbacks
  status: ColumnType<GoalStatus, GoalStatus | undefined, GoalStatus>;
  plan_source: "ai" | "demo";
  // JSON written as a string; read as unknown and validated with Zod
  // (lib/goals/plan.ts) before use.
  guide: ColumnType<unknown, string | null, string | null>;
  created_at: CreatedAt;
  completed_at: Timestamp | null;
  target_cents: number | null; // optional savings target, in cents
}

export interface GoalMilestonesTable {
  id: Generated<string>;
  goal_id: string;
  position: number; // 1, 2, 3 ... in plan order
  title: string;
  description: string | null;
  weight: ColumnType<number, number | undefined, number>; // relative effort, 1–5
  planned_due: CalendarDate; // from the original plan; adjusted dates are calculated
}

export interface GoalStepsTable {
  id: Generated<string>;
  milestone_id: string;
  position: number;
  title: string;
  done_on: CalendarDate | null; // the user's local date when ticked off
  created_at: CreatedAt;
}

export type MoneyKind = "expense" | "income";

export interface MoneyCategoriesTable {
  id: Generated<string>;
  user_id: string;
  kind: MoneyKind;
  name: string;
  icon: string; // a key from lib/money/categories.ts
  position: number;
  archived_at: Timestamp | null;
  created_at: CreatedAt;
}

export interface TransactionsTable {
  id: Generated<string>;
  user_id: string;
  kind: MoneyKind;
  amount_cents: number; // whole cents, always positive; kind says which way
  category_id: string;
  note: string | null;
  occurred_on: CalendarDate; // the user's local date
  goal_id: string | null; // money saved toward a goal
  created_at: CreatedAt;
}

export interface NotesTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  body: string | null;
  pinned: ColumnType<boolean, boolean | undefined, boolean>;
  done_at: Timestamp | null; // when it was ticked off; null while open
  created_at: CreatedAt;
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
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
  daily_principles: DailyPrinciplesTable;
  reflections: ReflectionsTable;
  goals: GoalsTable;
  goal_milestones: GoalMilestonesTable;
  goal_steps: GoalStepsTable;
  money_categories: MoneyCategoriesTable;
  transactions: TransactionsTable;
  notes: NotesTable;
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
