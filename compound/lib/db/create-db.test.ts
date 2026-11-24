import { afterEach, describe, expect, it, vi } from "vitest";
import { createPool } from "./create-db";

// No database needed: a pg pool only connects on its first query.
describe("createPool", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs an idle connection's error instead of letting it crash the server", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const pool = createPool("postgres://user@localhost:5432/none");

    // Without a listener, emit("error") throws: that's the uncaught exception.
    const dropped = Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });
    expect(() => pool.emit("error", dropped)).not.toThrow();
    expect(log).toHaveBeenCalledWith("[db] an idle connection closed: ECONNRESET");

    await pool.end();
  });
});
