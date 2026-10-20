// Auth.js endpoints: /api/auth/signin, /api/auth/callback/github, /api/auth/signout, ...
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
