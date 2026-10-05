import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";

/**
 * Reports who is signed in, for client components that need the role before
 * deciding what to render — the notification bell, for instance.
 *
 * Read-only, and it exposes only the identity already sealed in the cookie:
 * the token stays server-side, and Laravel still authorises every data call.
 */
export async function GET() {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ code: "unauthenticated" }, { status: 401 });
  }

  return NextResponse.json({ userId: session.userId, role: session.role });
}
