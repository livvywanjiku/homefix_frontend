import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password reset link for your HomeFix Connect account.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter your email address and we will send you a link to set a new one.
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
