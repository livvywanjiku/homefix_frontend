import type { Metadata } from "next";
import { FormMessage } from "@/components/ui/form-message";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your HomeFix Connect account.",
};

/** `searchParams` values are `string | string[] | undefined`; keep only plain strings. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;

  const next = single(params.next);
  const justReset = single(params.reset) === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to manage your requests and bookings.
        </p>
      </div>

      {/* Set by resetPasswordAction, whose redirect ends every session. */}
      {justReset ? (
        <FormMessage tone="success">
          Your password has been reset. Sign in with your new password.
        </FormMessage>
      ) : null}

      <LoginForm next={next} />
    </div>
  );
}
