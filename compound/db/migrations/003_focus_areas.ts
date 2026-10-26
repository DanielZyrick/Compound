import { sql, type Kysely } from "kysely";

// "Goals" is becoming its own module (plans, deadlines, progress), so the
// broad areas picked during onboarding are renamed to focus areas.
export async function up(db: Kysely<unknown>) {
  await renameTable(db, "user_goals", "focus_areas");
}

export async function down(db: Kysely<unknown>) {
  await renameTable(db, "focus_areas", "user_goals");
}

/**
 * Renames the table, then every constraint and index that starts with the old
 * name (pkey, fkey, checks, and the not-null constraints Postgres 18 names),
 * so the schema doesn't keep pointing at the old name.
 */
async function renameTable(db: Kysely<unknown>, from: string, to: string) {
  await db.schema.alterTable(from).renameTo(to).execute();

  await sql`
    do $$
    declare
      item record;
    begin
      for item in
        select conname as name from pg_constraint
        where conrelid = ${sql.lit(to)}::regclass and conname like ${sql.lit(from + "\\_%")}
      loop
        execute format('alter table %I rename constraint %I to %I',
          ${sql.lit(to)}, item.name, ${sql.lit(to)} || substr(item.name, ${sql.lit(from.length + 1)}));
      end loop;

      -- The primary key's index was renamed along with its constraint above.
      for item in
        select indexname as name from pg_indexes
        where tablename = ${sql.lit(to)} and indexname like ${sql.lit(from + "\\_%")}
      loop
        execute format('alter index %I rename to %I',
          item.name, ${sql.lit(to)} || substr(item.name, ${sql.lit(from.length + 1)}));
      end loop;
    end
    $$
  `.execute(db);
}
