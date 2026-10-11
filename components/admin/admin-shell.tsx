"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { adminRoleLabel, can, navItemFor, visibleNav } from "@/lib/admin";
import type { Role } from "@/lib/roles";
import { logoutAction } from "@/lib/actions/session";
import {
  AdminIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "./icons";

export type AdminShellUser = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  roles: Role[];
  permissions: string[];
};

/**
 * The one layout every `/admin/*` screen renders inside.
 *
 * There is a single shell rather than a sidebar per page, so the console cannot
 * drift into looking like several different applications: the navigation, the
 * header and the page frame are declared here once and every screen supplies
 * only its own body.
 *
 * The navigation is filtered by the administrator's *permissions*, not by their
 * role. `admin` and `superadmin` receive the same component and see different
 * menus because they hold different grants — and a grant removed in the database
 * is reflected on the next request, since the list is read from the account
 * rather than baked into the session.
 *
 * A client component because the sidebar collapses, the drawer opens, and the
 * account menu toggles. None of that is data: everything rendered here arrived
 * as props from a Server Component that fetched it.
 */
export function AdminShell({
  user,
  children,
}: {
  user: AdminShellUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const groups = visibleNav(user.permissions);
  const current = navItemFor(pathname);
  const roleLabel = adminRoleLabel(user.roles);

  // A route change closes the mobile drawer and the account menu: leaving
  // either open would cover the screen the user just asked for.
  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="admin-surface min-h-screen bg-admin-bg text-admin-text">
      {/* Mobile drawer scrim. */}
      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-admin-primary/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <Sidebar
        groups={groups}
        pathname={pathname}
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        user={user}
        roleLabel={roleLabel}
        onToggle={() => setCollapsed((value) => !value)}
        onClose={() => setDrawerOpen(false)}
      />

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]"
        }`}
      >
        <header className="sticky top-0 z-20 border-b border-admin-border bg-admin-card">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="rounded-md p-2 text-admin-muted transition-colors hover:bg-admin-surface hover:text-admin-text lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <MenuIcon size={20} />
            </button>

            <div className="min-w-0">
              <Breadcrumb pathname={pathname} label={current?.label ?? "Administration"} />
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                {current?.label ?? "Administration"}
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {can(user.permissions, "view_users") ? (
                <form action="/admin/users" className="hidden md:block">
                  <label className="relative block">
                    <span className="sr-only">Search users</span>
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-admin-muted">
                      <SearchIcon size={16} />
                    </span>
                    <input
                      type="search"
                      name="q"
                      placeholder="Search users…"
                      className="w-48 rounded-md border border-admin-border bg-admin-bg py-2 pr-3 pl-9 text-sm text-admin-text placeholder:text-admin-muted focus:border-admin-accent focus:outline-none xl:w-64"
                    />
                  </label>
                </form>
              ) : null}

              {can(user.permissions, "view_notifications") ? (
                <Link
                  href="/admin/notifications"
                  className="rounded-md p-2 text-admin-muted transition-colors hover:bg-admin-surface hover:text-admin-text"
                  aria-label="Notifications"
                >
                  <BellIcon size={19} />
                </Link>
              ) : null}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-md py-1.5 pr-2 pl-1.5 transition-colors hover:bg-admin-surface"
                >
                  <Avatar name={user.name} src={user.avatarUrl} />
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block max-w-[10rem] truncate text-sm font-medium">
                      {user.name}
                    </span>
                    <span className="block text-xs text-admin-muted">{roleLabel}</span>
                  </span>
                  <span className="text-admin-muted">
                    <ChevronDownIcon size={16} />
                  </span>
                </button>

                {menuOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Close account menu"
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-lg border border-admin-border bg-admin-card shadow-lg"
                    >
                      <div className="border-b border-admin-border px-4 py-3">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        <p className="truncate text-xs text-admin-muted">{user.email}</p>
                        <p className="mt-1 text-xs font-medium text-admin-accent">{roleLabel}</p>
                      </div>

                      <MenuLink href="/admin/profile" icon={<UserIcon size={16} />}>
                        Admin profile
                      </MenuLink>

                      {can(user.permissions, "manage_settings") ? (
                        <MenuLink href="/admin/settings" icon={<SettingsIcon size={16} />}>
                          System settings
                        </MenuLink>
                      ) : null}

                      <form action={logoutAction} className="border-t border-admin-border">
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-admin-text transition-colors hover:bg-admin-surface"
                        >
                          <LogoutIcon size={16} />
                          Sign out
                        </button>
                      </form>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

        <footer className="border-t border-admin-border px-4 py-4 text-xs text-admin-muted sm:px-6">
          HomeFix Connect administration · signed in as {user.email}
        </footer>
      </div>
    </div>
  );
}

/* ── Sidebar ───────────────────────────────────────────────────────────── */

function Sidebar({
  groups,
  pathname,
  collapsed,
  drawerOpen,
  user,
  roleLabel,
  onToggle,
  onClose,
}: {
  groups: ReturnType<typeof visibleNav>;
  pathname: string;
  collapsed: boolean;
  drawerOpen: boolean;
  user: AdminShellUser;
  roleLabel: string;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-admin-primary text-white transition-transform duration-200 lg:translate-x-0",
        collapsed ? "w-[76px]" : "w-[264px]",
        drawerOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
        <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-admin-accent text-sm font-semibold">
            HF
          </span>
          {collapsed ? null : (
            <span className="truncate text-sm font-semibold tracking-tight">
              HomeFix <span className="text-admin-accent">Admin</span>
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Administration">
        {groups.length === 0 ? (
          <p className="px-2 text-xs text-white/60">
            Your account holds no administration permissions. Ask a super administrator to grant
            one.
          </p>
        ) : null}

        {groups.map((group) => (
          <div key={group.key} className="mb-5">
            {collapsed ? (
              <div className="mx-2 mb-2 border-t border-white/10" />
            ) : (
              <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-white/45 uppercase">
                {group.label}
              </p>
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                        collapsed ? "justify-center" : "",
                        active
                          ? "bg-admin-secondary font-medium text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white",
                      ].join(" ")}
                    >
                      <span className={active ? "text-admin-accent" : ""}>
                        <AdminIcon name={item.icon} size={18} />
                      </span>
                      {collapsed ? null : <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        {collapsed ? (
          <div className="flex justify-center">
            <Avatar name={user.name} src={user.avatarUrl} />
          </div>
        ) : (
          <div className="mb-2 flex items-center gap-2.5 rounded-md px-1 py-1.5">
            <Avatar name={user.name} src={user.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-white/55">{roleLabel}</p>
            </div>
          </div>
        )}

        <ul className="space-y-0.5">
          <li>
            <SidebarFooterLink href="/admin/profile" collapsed={collapsed} icon={<UserIcon size={16} />}>
              Admin profile
            </SidebarFooterLink>
          </li>
          <li>
            <SidebarFooterLink href="/admin/settings" collapsed={collapsed} icon={<SettingsIcon size={16} />}>
              Settings
            </SidebarFooterLink>
          </li>
          <li>
            <form action={logoutAction}>
              <button
                type="submit"
                title={collapsed ? "Sign out" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <LogoutIcon size={16} />
                {collapsed ? null : "Sign out"}
              </button>
            </form>
          </li>
        </ul>

        <button
          type="button"
          onClick={onToggle}
          className="mt-2 hidden w-full items-center justify-center gap-2 rounded-md px-2.5 py-2 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white lg:flex"
        >
          <span className={collapsed ? "rotate-180" : ""}>
            <ChevronLeftIcon size={16} />
          </span>
          {collapsed ? null : "Collapse"}
        </button>
      </div>
    </aside>
  );
}

function SidebarFooterLink({
  href,
  collapsed,
  icon,
  children,
}: {
  href: string;
  collapsed: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white ${
        collapsed ? "justify-center" : ""
      }`}
    >
      {icon}
      {collapsed ? null : children}
    </Link>
  );
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-admin-text transition-colors hover:bg-admin-surface"
    >
      {icon}
      {children}
    </Link>
  );
}

/**
 * The trail above the page title.
 *
 * Two levels: "Administration / Bookings". Deeper trails would need the page to
 * tell the shell what it is showing, and a breadcrumb the page has to remember
 * to supply is a breadcrumb that goes stale.
 */
function Breadcrumb({ pathname, label }: { pathname: string; label: string }) {
  const isHome = pathname === "/admin/dashboard" || pathname === "/admin";

  return (
    <nav aria-label="Breadcrumb" className="text-[11px] text-admin-muted">
      {isHome ? (
        <span>Administration</span>
      ) : (
        <>
          <Link href="/admin/dashboard" className="transition-colors hover:text-admin-text">
            Administration
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{label}</span>
        </>
      )}
    </nav>
  );
}

/**
 * Initials when there is no picture.
 *
 * An `<img>` with an empty source is a broken-image icon, which reads as a
 * failure; two letters read as a person.
 */
function Avatar({ name, src }: { name: string; src: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- the URL is an
      // arbitrary Laravel storage host, which next/image would need configured.
      <img
        src={src}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-admin-secondary text-xs font-semibold text-white">
      {initials || "?"}
    </span>
  );
}
