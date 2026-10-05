import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth-server";
import { verifySession } from "@/lib/dal";

/** Revokes the current token at Laravel and clears the session cookie. */
export async function POST() {
  const session = await verifySession();

  await signOut(session?.token ?? null);

  return new NextResponse(null, { status: 204 });
}
