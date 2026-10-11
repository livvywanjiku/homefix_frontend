"use client";

import { useEffect } from "react";
import { AlertIcon } from "@/components/admin/icons";

/**
 * The console's error boundary.
 *
 * Placed on the `(admin)` group rather than on the `admin` segment so that it
 * also catches a failure in the console's own layout — which is where the two
 * things most likely to fail live: the session check and the `/auth/me` call
 * that builds the sidebar. A boundary inside that layout could not catch its own
 * failure, and the administrator would get the framework's unstyled error page
 * instead.
 *
 * It therefore renders its own frame and applies the console's palette itself,
 * because the shell it would normally sit inside is exactly what may have
 * failed.
 *
 * `retry` rather than `reset`: Next 16 renamed the prop, and a stale `reset`
 * here would be a no-op button.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Kept in the console's own log so a digest on screen can be traced.
    console.error("Administration console error", error);
  }, [error]);

  return (
    <div className="admin-surface flex min-h-screen items-center justify-center bg-admin-bg px-6 py-12 text-admin-text">
      <div className="w-full max-w-lg rounded-xl border border-admin-border bg-admin-card px-6 py-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-danger">
            <AlertIcon size={20} />
          </span>

          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight">
              The administration console could not load
            </h1>

            <p className="mt-1 text-sm text-admin-muted">
              This is usually the HomeFix API being unreachable, or the signed-in account losing
              access while the page was open. Nothing has been changed.
            </p>

            {error.digest ? (
              <p className="mt-2 text-xs text-admin-muted">
                Reference <span className="font-mono">{error.digest}</span> — quote it when
                reporting this.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => retry()}
                className="rounded-md bg-admin-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-admin-secondary"
              >
                Try again
              </button>

              {/*
                A plain anchor rather than next/link: the client router is the
                thing that just failed, so this is deliberately a full reload.
              */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the router is the component that failed */}
              <a
                href="/admin/dashboard"
                className="rounded-md border border-admin-border px-4 py-2 text-sm font-medium transition-colors hover:bg-admin-surface"
              >
                Reload the dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
