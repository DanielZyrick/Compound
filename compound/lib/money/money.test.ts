import { describe, expect, it } from "vitest";
import { centsToInput, formatMoney, parseAmount } from "./amount";
import { dayLabel, groupByDay, monthOf, monthRange, shiftMonth, summarize, type MoneyRow } from "./summary";

describe("parseAmount", () => {
  it.each([
    ["185", 18500],
    ["185.5", 18550],
    ["185.50", 18550],
    ["0.99", 99],
    ["1,250.50", 125050],
    ["1,000,000", 100000000],
    ["₱99", 9900],
    ["  $ 12.30 ", 1230],
  ])("%j → %i cents", (input, cents) => {
    expect(parseAmount(input)).toBe(cents);
  });

  it.each(["", "abc", "0", "0.00", "-5", "1.234", "12,34", "1.2.3", "10000000.01", "1e5"])("rejects %j", (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it("never loses a cent to floating point", () => {
    // 0.1 + 0.2 style traps: 19.99 must be exactly 1999 cents.
    expect(parseAmount("19.99")).toBe(1999);
    expect(parseAmount("0.29")).toBe(29);
  });
});

describe("formatMoney and centsToInput", () => {
  it("formats with the currency symbol and two decimals", () => {
    expect(formatMoney(125050, "PHP")).toBe("₱1,250.50");
    expect(formatMoney(99, "USD")).toBe("$0.99");
  });

  it("turns cents back into an editable number", () => {
    expect(centsToInput(125050)).toBe("1250.50");
    expect(centsToInput(5)).toBe("0.05");
  });
});

describe("months", () => {
  it("finds a month's first and last day, including February in a leap year", () => {
    expect(monthRange("2026-10")).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(monthRange("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });

  it("moves between months across years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(monthOf("2026-10-28")).toBe("2026-10");
  });
});

const row = (id: string, kind: "expense" | "income", amountCents: number, categoryId: string, occurredOn: string): MoneyRow => ({
  id,
  kind,
  amountCents,
  categoryId,
  occurredOn,
});

describe("summarize", () => {
  it("totals spending and income, and ranks categories by spending", () => {
    const s = summarize([
      row("1", "expense", 18500, "food", "2026-10-28"),
      row("2", "expense", 5000, "transport", "2026-10-28"),
      row("3", "expense", 11500, "food", "2026-10-27"),
      row("4", "income", 2000000, "salary", "2026-10-15"),
    ]);
    expect(s.spent).toBe(35000);
    expect(s.income).toBe(2000000);
    expect(s.left).toBe(1965000);
    expect(s.categories.map((c) => c.categoryId)).toEqual(["food", "transport"]);
    expect(s.categories[0].share).toBeCloseTo(30000 / 35000);
  });

  it("handles a month with no spending", () => {
    expect(summarize([])).toEqual({ spent: 0, income: 0, left: 0, categories: [] });
  });
});

describe("groupByDay", () => {
  it("groups by date, newest first, with daily totals", () => {
    const groups = groupByDay([
      row("a", "expense", 100, "food", "2026-10-27"),
      row("b", "expense", 200, "food", "2026-10-28"),
      row("c", "income", 500, "gift", "2026-10-28"),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-10-28", "2026-10-27"]);
    expect(groups[0]).toMatchObject({ spent: 200, income: 500 });
    expect(groups[0].items.map((i) => i.id)).toEqual(["b", "c"]);
  });
});

describe("dayLabel", () => {
  it("says Today and Yesterday, otherwise formats the date", () => {
    const fmt = (d: string) => `D:${d}`;
    expect(dayLabel("2026-10-28", "2026-10-28", fmt)).toBe("Today");
    expect(dayLabel("2026-10-27", "2026-10-28", fmt)).toBe("Yesterday");
    expect(dayLabel("2026-10-20", "2026-10-28", fmt)).toBe("D:2026-10-20");
  });
});
