import { describe, expect, it } from "vitest";
import { setBudgetSchema } from "@/lib/validation/money";
import { budgetStatus, describeBudgetLeft, monthElapsed, totalBudget } from "./budget";

describe("monthElapsed", () => {
  it("counts whole days through the month", () => {
    expect(monthElapsed("2026-11", "2026-11-01")).toBeCloseTo(1 / 30);
    expect(monthElapsed("2026-11", "2026-11-15")).toBeCloseTo(0.5);
    expect(monthElapsed("2026-11", "2026-11-30")).toBe(1);
  });

  it("knows February is short", () => {
    expect(monthElapsed("2027-02", "2027-02-14")).toBeCloseTo(0.5);
    expect(monthElapsed("2027-02", "2027-02-28")).toBe(1);
  });

  it("is 1 for past months and 0 for future ones", () => {
    expect(monthElapsed("2026-10", "2026-11-04")).toBe(1);
    expect(monthElapsed("2026-12", "2026-11-04")).toBe(0);
  });
});

describe("budgetStatus", () => {
  const budget = 800_000; // 8,000.00

  it("works out what's left and how much is used", () => {
    expect(budgetStatus(524_000, budget, 0.7)).toMatchObject({ left: 276_000, used: 0.655, tone: "ok", pace: "on-pace" });
  });

  it("turns amber from 80% and red once over", () => {
    expect(budgetStatus(640_000, budget, 0.9).tone).toBe("warn");
    expect(budgetStatus(800_000, budget, 0.9).tone).toBe("warn"); // exactly on budget isn't over
    expect(budgetStatus(845_000, budget, 0.9)).toMatchObject({ tone: "over", pace: "over", left: -45_000 });
  });

  it("calls it fast when spending is well ahead of the month", () => {
    expect(budgetStatus(480_000, budget, 1 / 3).pace).toBe("fast"); // 60% spent, a third of the month gone
    expect(budgetStatus(320_000, budget, 1 / 3).pace).toBe("on-pace"); // 40%: a little ahead is fine
  });

  it("is on pace with nothing spent", () => {
    expect(budgetStatus(0, budget, 0.1)).toMatchObject({ left: budget, used: 0, tone: "ok", pace: "on-pace" });
  });
});

describe("totalBudget", () => {
  const spent = new Map([
    ["food", 500_000],
    ["fun", 200_000],
    ["bills", 900_000],
  ]);

  it("adds up only the categories with a budget", () => {
    const total = totalBudget(
      [
        { id: "food", budgetCents: 800_000 },
        { id: "fun", budgetCents: 300_000 },
        { id: "bills", budgetCents: null },
      ],
      spent,
      0.5,
    );
    expect(total).toMatchObject({ budget: 1_100_000, spent: 700_000, left: 400_000 });
  });

  it("is null when nothing has a budget", () => {
    expect(totalBudget([{ id: "food", budgetCents: null }], spent, 0.5)).toBeNull();
  });
});

describe("setBudgetSchema", () => {
  const id = "4f6f1a5e-2a43-4f7e-9d4b-6a3f3c1d2e10";

  it("turns what's typed into cents, and empty into no budget", () => {
    expect(setBudgetSchema.parse({ id, budget: "8,000" }).budget).toBe(800_000);
    expect(setBudgetSchema.parse({ id, budget: "₱1,250.50" }).budget).toBe(125_050);
    expect(setBudgetSchema.parse({ id, budget: "  " }).budget).toBeNull();
  });

  it("refuses anything that isn't an amount", () => {
    expect(setBudgetSchema.safeParse({ id, budget: "lots" }).success).toBe(false);
    expect(setBudgetSchema.safeParse({ id, budget: "-50" }).success).toBe(false);
    expect(setBudgetSchema.safeParse({ id, budget: "0" }).success).toBe(false);
  });
});

describe("describeBudgetLeft", () => {
  it("says what's left, or how much over", () => {
    expect(describeBudgetLeft(156_000, "Food", "this month", "PHP")).toBe("₱1,560.00 left in Food this month");
    expect(describeBudgetLeft(-20_000, "Food", "this month", "PHP")).toBe("₱200.00 over your Food budget this month");
    expect(describeBudgetLeft(0, "Fun", "this month", "PHP")).toBe("₱0.00 left in Fun this month");
  });

  it("names an earlier month", () => {
    expect(describeBudgetLeft(5_000, "Food", "October 2026", "PHP")).toBe("₱50.00 left in Food for October 2026");
  });
});
