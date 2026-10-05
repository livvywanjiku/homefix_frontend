import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your HomeFix Connect account.",
};

export default async function ResetPasswordPage(props: PageProps<"/reset-password/[token]">) {
  // Both are async in Next 16; a missed await yields a Promise-shaped runtime
  // error rather than a type error in some positions.
  const { token } = await props.params;
  const params = await props.searchParams;
  const email = typeof params.email === "string" ? params.email : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose a password you have not used here before.
        </p>
      </div>

      <ResetPasswordForm token={token} email={email} />
    </div>
  );
}
