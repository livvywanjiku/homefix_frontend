import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import { requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Dashboard" };

type MeResponse = { data: { name: string; email: string } };

export default async function CustomerDashboardPage() {
  // The authoritative gate. `proxy.ts` also redirects here, but it only reads
  // the cookie and never talks to Laravel, so it cannot be the check that counts.
  const session = await requireRole("customer");

  // Fetched straight from Laravel on the server — no hop through our own route
  // handlers, which is the pattern every dashboard page below will follow.
  const { data: user } = await apiFetch<MeResponse>("/auth/me", { token: session.token });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as {user.email}.
      </p>

      <p className="mt-8 rounded-lg border border-dashed border-black/12 px-4 py-6 text-sm text-zinc-500 dark:border-white/16 dark:text-zinc-400">
        Your service requests, bookings and messages will appear here.
      </p>
    </div>
  );
}
