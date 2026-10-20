import { signIn, signOut } from "@/auth";

// Both buttons are plain forms that call a server action, so they work
// without any client-side JavaScript.

export function SignInWithGitHub() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/today" });
      }}
    >
      <button
        type="submit"
        className="w-full rounded-lg bg-foreground px-4 py-3 font-medium text-background hover:opacity-90"
      >
        Sign in with GitHub
      </button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className="text-sm underline underline-offset-4 hover:opacity-70">
        Sign out
      </button>
    </form>
  );
}
