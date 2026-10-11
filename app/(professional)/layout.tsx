import type { ReactNode } from "react";
import { requireRole } from "@/lib/dal";
import { ProNav } from "./pro-nav";

/**
 * The professional workspace shell.
 *
 * The gate is repeated here rather than left to the pages: a layout renders for
 * every route beneath it, so this is the one place that guarantees no `/pro`
 * screen — including one added later — is reachable without the role.
 */
export default async function ProfessionalLayout({ children }: { children: ReactNode }) {
  await requireRole("professional");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <ProNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
