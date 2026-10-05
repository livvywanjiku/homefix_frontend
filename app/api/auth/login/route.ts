import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth-server";
import { loginSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/errors";

/**
 * Signs a user in and seals the Sanctum token into an httpOnly cookie.
 *
 * The token is never part of the response body — the browser has no way to
 * read or forward it, which is the whole point of routing through this layer.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "The given data was invalid.", errors: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  const result = await signIn(
    parsed.data.email,
    parsed.data.password,
    request.headers.get("user-agent") ?? "unknown",
  );

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, errors: result.errors },
      { status: result.status },
    );
  }

  return NextResponse.json({ role: result.role });
}
