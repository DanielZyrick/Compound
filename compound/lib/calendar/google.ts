import "server-only";
import { db } from "@/lib/db";
import { decryptToken, encryptToken, isEncryptionConfigured } from "./crypto";

// Talking to Google for Calendar: swapping the consent code for tokens,
// refreshing the access token, and revoking access on disconnect. Plain
// fetch, no SDK. Reuses the sign-in OAuth client (AUTH_GOOGLE_ID/SECRET).

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/** Demo mode (end-to-end tests): no calls to Google; a fixed demo calendar instead. */
export function isCalendarDemo(): boolean {
  return process.env.CALENDAR_DEMO_MODE === "1";
}

/** The OAuth client, or null when Calendar can't be offered (missing keys). */
export function googleClient(): { id: string; secret: string } | null {
  const id = process.env.AUTH_GOOGLE_ID;
  const secret = process.env.AUTH_GOOGLE_SECRET;
  return id && secret && isEncryptionConfigured() ? { id, secret } : null;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!response.ok) {
    // Google's error code only ("invalid_grant"), never the request body.
    const error = await response.json().catch(() => ({}));
    throw new CalendarError(response.status === 400 || response.status === 401 ? "revoked" : "unavailable", error.error);
  }
  return response.json();
}

export class CalendarError extends Error {
  constructor(
    readonly kind: "revoked" | "unavailable",
    detail?: string,
  ) {
    super(`Google Calendar ${kind}${detail ? `: ${detail}` : ""}`);
  }
}

/** Swaps the one-time code from the consent screen for tokens. */
export function exchangeCode(code: string, redirectUri: string) {
  const client = googleClient()!;
  return tokenRequest({
    code,
    client_id: client.id,
    client_secret: client.secret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
}

/** Saves (or replaces) the user's connection, with the tokens encrypted. */
export async function saveConnection(userId: string, tokens: TokenResponse & { refresh_token: string }, email: string | null) {
  const values = {
    google_email: email,
    refresh_token: encryptToken(tokens.refresh_token),
    access_token: encryptToken(tokens.access_token),
    access_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
    connected_at: new Date(),
  };
  await db
    .insertInto("calendar_connections")
    .values({ user_id: userId, ...values })
    .onConflict((oc) => oc.column("user_id").doUpdateSet(values))
    .execute();
}

/**
 * A valid access token for the user, refreshing it when it's about to expire.
 * Null when they haven't connected. Throws CalendarError("revoked") when
 * Google no longer accepts the connection (they removed access).
 */
export async function getAccessToken(userId: string): Promise<string | null> {
  const row = await db
    .selectFrom("calendar_connections")
    .select(["refresh_token", "access_token", "access_expires_at"])
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!row) return null;

  const fresh = row.access_token && row.access_expires_at && row.access_expires_at.getTime() > Date.now() + 60_000;
  if (fresh) return decryptToken(row.access_token!);

  const client = googleClient();
  if (!client) throw new CalendarError("unavailable", "not configured");
  const tokens = await tokenRequest({
    refresh_token: decryptToken(row.refresh_token),
    client_id: client.id,
    client_secret: client.secret,
    grant_type: "refresh_token",
  });
  await db
    .updateTable("calendar_connections")
    .set({
      access_token: encryptToken(tokens.access_token),
      access_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
    })
    .where("user_id", "=", userId)
    .execute();
  return tokens.access_token;
}

/** Disconnects: revokes access at Google (best effort), then deletes the stored tokens. */
export async function disconnect(userId: string) {
  const row = await db
    .selectFrom("calendar_connections")
    .select("refresh_token")
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!row) return;

  if (!isCalendarDemo()) {
    try {
      await fetch(REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decryptToken(row.refresh_token) }),
        cache: "no-store",
      });
    } catch (error) {
      // Still delete our copy; the user can also remove access in their Google account.
      console.error("[calendar] revoke failed:", error instanceof Error ? error.message : error);
    }
  }
  await db.deleteFrom("calendar_connections").where("user_id", "=", userId).execute();
}

/** For Settings: whether Calendar can be offered, and the connected account if any. */
export async function getConnection(userId: string) {
  const row = await db
    .selectFrom("calendar_connections")
    .select(["google_email", "connected_at"])
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return { available: googleClient() !== null || isCalendarDemo(), connection: row ?? null };
}
