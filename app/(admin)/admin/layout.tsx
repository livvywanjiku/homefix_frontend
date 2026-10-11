import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { apiFetch } from "@/lib/api";
import { requireRole } from "@/lib/dal";
import { isRole, type Role } from "@/lib/roles";

/**
 * The administration console's shell.
 *
 * Placed on the `/admin` segment rather than on the route group so that it wraps
 * every screen beneath it — including any added later — and so that the public
 * pages that share the group are unaffected.
 *
 * The gate is repeated from `proxy.ts` on purpose. The proxy is an optimistic
 * redirect on a path matcher; this is the check that actually holds, because a
 * Server Action or an unmatched route never passes through the proxy at all.
 */
export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · HomeFix Admin" },
};

type MeResponse = {
  data: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    roles?: string[];
    /**
     * Present because the resource includes an administrator's own grants on
     * their own row — which is what lets the sidebar be built from permissions
     * rather than from a role name.
     */
    permissions?: string[];
  };
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRole("admin", "superadmin");

  const { data: account } = await apiFetch<MeResponse>("/auth/me", { token: session.token });

  const roles: Role[] = (account.roles ?? [session.role]).filter(isRole);

  return (
    <AdminShell
      user={{
        id: account.id,
        name: account.name,
        email: account.email,
        avatarUrl: account.avatar_url,
        roles,
        permissions: account.permissions ?? [],
      }}
    >
      {children}
    </AdminShell>
  );
}
