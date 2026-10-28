// Fixed reading plans. Each day is a passage reference only: the app never
// shows, writes or paraphrases scripture text. Readers open the passage in a
// real translation through a link, then write their own reflection.

export type ReadingPlanDay = { day: number; passage: string };

export type ReadingPlan = {
  id: string;
  title: string;
  description: string;
  days: ReadingPlanDay[];
};

/** One chapter a day: "John 1", "John 2", ... */
function chapters(book: string, count: number): ReadingPlanDay[] {
  return Array.from({ length: count }, (_, i) => ({ day: i + 1, passage: `${book} ${i + 1}` }));
}

export const READING_PLANS = [
  {
    id: "john-21",
    title: "The Gospel of John in 21 days",
    description: "One chapter a day through the life and words of Jesus.",
    days: chapters("John", 21),
  },
  {
    id: "proverbs-31",
    title: "Proverbs in 31 days",
    description: "A chapter of practical wisdom for each day of the month.",
    days: chapters("Proverbs", 31),
  },
  {
    id: "psalms-30",
    title: "Psalms 1–30 in 30 days",
    description: "Prayers and songs for every kind of day, one psalm at a time.",
    days: chapters("Psalm", 30),
  },
] as const satisfies readonly ReadingPlan[];

export type ReadingPlanId = (typeof READING_PLANS)[number]["id"];
export const READING_PLAN_IDS = READING_PLANS.map((p) => p.id) as [ReadingPlanId, ...ReadingPlanId[]];

export function findReadingPlan(id: string | null): ReadingPlan | undefined {
  return READING_PLANS.find((p) => p.id === id);
}

/** The translation opened on Bible Gateway. */
export const BIBLE_VERSION = "NIV";

/** A link to read a passage in a real translation on Bible Gateway. */
export function bibleGatewayUrl(passage: string, version = BIBLE_VERSION): string {
  const params = new URLSearchParams({ search: passage, version });
  return `https://www.biblegateway.com/passage/?${params}`;
}

// Fixed, human-written prompts (never AI) that guide each day's reflection.
export const REFLECTION_PROMPTS = [
  "What stood out to you in this passage, and why?",
  "What does this passage show you about God, about people, or about yourself?",
  "What is one way you can live this out today?",
  "Is there a verse you want to remember? Write it down in your own words and say why it matters to you.",
];

/** The prompt for a day, cycling through the list. */
export function reflectionPrompt(dayNumber: number): string {
  return REFLECTION_PROMPTS[(dayNumber - 1) % REFLECTION_PROMPTS.length];
}
