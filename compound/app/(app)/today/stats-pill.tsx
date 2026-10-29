import Link from "next/link";
import { CircleCheck, Flame, Target, Wallet, type LucideIcon } from "lucide-react";
import { formatMoney } from "@/lib/money/amount";
import { cn } from "@/lib/utils";

type Props = {
  streak: number;
  habitsDone: number;
  habitsDue: number;
  stepsThisWeek: number;
  spentCents: number;
  currency: string;
};

/** Today's numbers at a glance: one row on wide screens, two by two on phones. */
export function StatsPill({ streak, habitsDone, habitsDue, stepsThisWeek, spentCents, currency }: Props) {
  return (
    <section
      aria-label="Today at a glance"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border shadow-card lg:inline-grid lg:grid-cols-4 lg:rounded-full"
    >
      <Stat icon={Flame} iconClass="fill-orange-400 text-orange-500" value={String(streak)} label="day streak" />
      <Stat
        icon={CircleCheck}
        iconClass="text-success"
        value={habitsDue > 0 ? `${habitsDone}/${habitsDue}` : "Rest"}
        label={habitsDue > 0 ? "habits today" : "day today"}
      />
      <Stat icon={Target} iconClass="text-primary" value={String(stepsThisWeek)} label={stepsThisWeek === 1 ? "step this week" : "steps this week"} />
      <Link href="/money" className="bg-card hover:bg-muted">
        <Stat icon={Wallet} iconClass="text-primary" value={formatMoney(spentCents, currency)} label="spent today" bare />
      </Link>
    </section>
  );
}

function Stat({
  icon: Icon,
  iconClass,
  value,
  label,
  bare = false,
}: {
  icon: LucideIcon;
  iconClass: string;
  value: string;
  label: string;
  /** Without its own background, when wrapped in a link. */
  bare?: boolean;
}) {
  return (
    <p className={cn("flex items-center gap-2 px-4 py-2.5 lg:px-5", !bare && "bg-card")}>
      <Icon className={cn("size-4 shrink-0", iconClass)} aria-hidden />
      <span className="min-w-0 text-sm">
        <span className="font-semibold tabular-nums">{value}</span>{" "}
        <span className="text-muted-foreground">{label}</span>
      </span>
    </p>
  );
}
