import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./types";

// By default pg turns a Postgres `date` into a JavaScript Date at midnight in
// the server's timezone, which can shift the day. Keep it as "YYYY-MM-DD".
const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (value) => value);

// Neon's URLs use sslmode=require. pg currently treats that as verify-full
// (check the server's certificate), but will weaken it in its next major
// version. Ask for verify-full explicitly so the connection stays fully checked.
function withStrictSsl(connectionString: string) {
  return connectionString.replace(/sslmode=(prefer|require|verify-ca)\b/, "sslmode=verify-full");
}

/**
 * The connection pool. When a connection sitting idle in the pool drops (the
 * network blips, or Neon closes it), pg emits an "error" event on the pool.
 * Node treats an "error" event nobody listens to as an uncaught exception,
 * which can stop the server. Logging it is enough: the pool has already
 * thrown that connection away and opens a fresh one for the next query.
 */
export function createPool(connectionString: string) {
  const pool = new pg.Pool({ connectionString: withStrictSsl(connectionString), max: 5 });
  pool.on("error", (error: Error & { code?: string }) => {
    console.error(`[db] an idle connection closed: ${error.code ?? error.message}`);
  });
  return pool;
}

export function createDb(connectionString: string) {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: createPool(connectionString) }),
  });
}
