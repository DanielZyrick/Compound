import { describe, expect, it } from "vitest";
import { saveContactSchema } from "@/lib/validation/contacts";
import { containsPattern, describeFollowUp } from "./follow-up";

describe("describeFollowUp", () => {
  const today = "2026-10-31";

  it("marks past dates as overdue and due", () => {
    expect(describeFollowUp("2026-10-28", today)).toEqual({ label: "Overdue · Oct 28", due: true });
  });

  it("says Today and Tomorrow", () => {
    expect(describeFollowUp(today, today)).toEqual({ label: "Today", due: true });
    expect(describeFollowUp("2026-11-01", today)).toEqual({ label: "Tomorrow", due: false });
  });

  it("counts days within a week, then shows the date", () => {
    expect(describeFollowUp("2026-11-05", today).label).toBe("In 5 days");
    expect(describeFollowUp("2026-12-08", today).label).toBe("Dec 8");
    expect(describeFollowUp("2027-01-04", today).label).toBe("Jan 4, 2027");
  });
});

describe("containsPattern", () => {
  it("wraps the search and escapes wildcards", () => {
    expect(containsPattern("ana")).toBe("%ana%");
    expect(containsPattern("50%_off")).toBe("%50\\%\\_off%");
  });
});

describe("saveContactSchema", () => {
  const id = "4f6f1a5e-2a43-4f7e-9d4b-6a3f3c1d2e10";

  it("saves empty optional fields as null", () => {
    const parsed = saveContactSchema.parse({ id, name: " Ana Cruz ", email: "", linkedin: "", followUpOn: "", goalId: "" });
    expect(parsed).toMatchObject({ name: "Ana Cruz", email: null, linkedin: null, followUpOn: null, goalId: null });
  });

  it("accepts a full contact", () => {
    const parsed = saveContactSchema.safeParse({
      id,
      name: "Ana Cruz",
      email: "ana@example.com",
      phone: "+63 917 555 0101",
      linkedin: "https://www.linkedin.com/in/anacruz",
      followUpOn: "2026-11-07",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects bad emails, phones and non-https links", () => {
    expect(saveContactSchema.safeParse({ id, name: "A", email: "not-an-email" }).success).toBe(false);
    expect(saveContactSchema.safeParse({ id, name: "A", phone: "call me" }).success).toBe(false);
    expect(saveContactSchema.safeParse({ id, name: "A", linkedin: "javascript:alert(1)" }).success).toBe(false);
    expect(saveContactSchema.safeParse({ id, name: "A", linkedin: "http://linkedin.com/in/a" }).success).toBe(false);
  });

  it("needs a name", () => {
    expect(saveContactSchema.safeParse({ id, name: "  " }).success).toBe(false);
  });
});
