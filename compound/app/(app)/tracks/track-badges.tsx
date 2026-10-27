import { Badge } from "@/components/ui/badge";
import type { TrackLevel, TrackType } from "@/lib/db/types";

const TYPE_LABELS: Record<TrackType, string> = { skill: "Skill", thinking: "Thinking", reading: "Reading" };
const LEVEL_LABELS: Record<TrackLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function TrackBadges({
  type,
  level,
  planSource,
}: {
  type: TrackType;
  level: TrackLevel;
  planSource: "ai" | "demo";
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">{TYPE_LABELS[type]}</Badge>
      <Badge variant="secondary">{LEVEL_LABELS[level]}</Badge>
      {planSource === "demo" && (
        <Badge variant="outline" title="Made without AI because no API key is set">
          Example plan
        </Badge>
      )}
    </span>
  );
}
