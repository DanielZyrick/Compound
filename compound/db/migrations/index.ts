import type { Migration } from "kysely/migration";
import * as m001 from "./001_initial";
import * as m002 from "./002_onboarded_at";
import * as m003 from "./003_focus_areas";
import * as m004 from "./004_focus_area_description";
import * as m005 from "./005_tracks_and_ai_calls";

// Every migration, listed by name. Kysely runs them in name order and records
// which ones are done in the kysely_migration table.
// To add one: create 00N_something.ts and add it here.
export const migrations: Record<string, Migration> = {
  "001_initial": m001,
  "002_onboarded_at": m002,
  "003_focus_areas": m003,
  "004_focus_area_description": m004,
  "005_tracks_and_ai_calls": m005,
};
