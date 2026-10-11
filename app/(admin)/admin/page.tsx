import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Administration" };

/**
 * `/admin` is not a screen of its own.
 *
 * It redirects rather than rendering a second overview, so there is exactly one
 * dashboard and no way for two of them to drift apart. The layout above this
 * page has already established that the visitor is an administrator, so this is
 * a routing convenience rather than a gate.
 */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
