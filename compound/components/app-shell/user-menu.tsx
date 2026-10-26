import { getCurrentUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { UserMenuDropdown } from "./user-menu-dropdown";

// Reads the session, so render it inside <Suspense>. The page itself still
// does the real auth check; this only shows who's signed in.
export async function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = await getCurrentUser();
  if (!user) return null;

  return <UserMenuDropdown name={user.name} email={user.email} image={user.image} compact={compact} />;
}

export function UserMenuSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-sidebar-accent",
        compact ? "size-8 rounded-full" : "h-11 rounded-lg",
      )}
    />
  );
}
