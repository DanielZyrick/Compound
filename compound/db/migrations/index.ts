import type { Migration } from "kysely/migration";
import * as m001 from "./001_initial";

// Every migration, listed by name. Kysely runs them in name order and records
// which ones are done in the kysely_migration table.
// To add one: create 002_something.ts and add it here.
export const migrations: Record<string, Migration> = {
  "001_initial": m001,
};
