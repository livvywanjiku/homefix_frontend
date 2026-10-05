import { NextResponse } from "next/server";
import { register } from "@/lib/auth-server";
import { registerSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/errors";

/**
 * Creates a customer or professional account, then signs them in.
 *
 * `role` is constrained by the shared schema to the self-assignable roles, and
 * independently re-checked by Laravel — an admin account cannot be created
 * through this endpoint even if the schema were relaxed.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "The given data was invalid.", errors: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  const { name, email, phone, password, password_confirmation, role } = parsed.data;

  const result = await register(
    { name, email, phone: phone || undefined, password, password_confirmation, role },
    request.headers.get("user-agent") ?? "unknown",
  );

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, errors: result.errors },
      { status: result.status },
    );
  }

  return NextResponse.json({ role: result.role }, { status: 201 });
}
