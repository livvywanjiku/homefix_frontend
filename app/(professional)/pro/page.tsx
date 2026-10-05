import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import { requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Professional dashboard" };

type MeResponse = { data: { name: string; email: string } };

export default async function ProfessionalDashboardPage() {
  const session = await requireRole("professional");
  const { data: user } = await apiFetch<MeResponse>("/auth/me", { token: session.token });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Hello, {user.name}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as {user.email}.
      </p>

      <p className="mt-8 rounded-lg border border-dashed border-black/12 px-4 py-6 text-sm text-zinc-500 dark:border-white/16 dark:text-zinc-400">
        Finish your profile and services to start receiving requests.
      </p>
    </div>
  );
}
