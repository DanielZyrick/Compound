import type { Migration } from "kysely/migration";
import * as m001 from "./001_initial";
import * as m002 from "./002_onboarded_at";
import * as m003 from "./003_focus_areas";
import * as m004 from "./004_focus_area_description";
import * as m005 from "./005_tracks_and_ai_calls";
import * as m006 from "./006_lessons";
import * as m007 from "./007_daily_principles";
import * as m008 from "./008_reading_tracks";
import * as m009 from "./009_goals";
import * as m010 from "./010_money";
import * as m011 from "./011_notes";
import * as m012 from "./012_note_color";
import * as m013 from "./013_profiles";

// Every migration, listed by name. Kysely runs them in name order and records
// which ones are done in the kysely_migration table.
// To add one: create 00N_something.ts and add it here.
export const migrations: Record<string, Migration> = {
  "001_initial": m001,
  "002_onboarded_at": m002,
  "003_focus_areas": m003,
  "004_focus_area_description": m004,
  "005_tracks_and_ai_calls": m005,
  "006_lessons": m006,
  "007_daily_principles": m007,
  "008_reading_tracks": m008,
  "009_goals": m009,
  "010_money": m010,
  "011_notes": m011,
  "012_note_color": m012,
  "013_profiles": m013,
};
