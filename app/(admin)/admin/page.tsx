import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import { requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Admin" };

type MeResponse = { data: { name: string; email: string } };

export default async function AdminDashboardPage() {
  const session = await requireRole("admin");
  const { data: user } = await apiFetch<MeResponse>("/auth/me", { token: session.token });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin console</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as {user.name} ({user.email}).
      </p>

      <p className="mt-8 rounded-lg border border-dashed border-black/12 px-4 py-6 text-sm text-zinc-500 dark:border-white/16 dark:text-zinc-400">
        Verification queue, complaints and platform analytics will appear here.
      </p>
    </div>
  );
}
