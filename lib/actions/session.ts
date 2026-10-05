"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth-server";
import { verifySession } from "@/lib/dal";

/*
 * Kept out of `app/(auth)/actions.ts` because signing out is not an auth-page
 * concern: the site header and every dashboard need it too.
 */

/**
 * Signs out and returns to the landing page.
 *
 * Takes no arguments, so it can be passed straight to a `<form action={…}>`.
 */
export async function logoutAction(): Promise<void> {
  const session = await verifySession();

  await signOut(session?.token ?? null);

  redirect("/");
}
