import type { Metadata } from "next";
import { isSelfAssignableRole } from "@/lib/roles";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Join HomeFix Connect as a homeowner or as a verified home-services professional.",
};

export default async function RegisterPage(props: PageProps<"/register">) {
  const params = await props.searchParams;
  const role = typeof params.role === "string" ? params.role : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Request work as a homeowner, or offer your services as a professional.
        </p>
      </div>

      <RegisterForm defaultRole={isSelfAssignableRole(role) ? role : undefined} />
    </div>
  );
}
