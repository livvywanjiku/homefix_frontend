import type { Metadata } from "next";
import { AvatarCard } from "@/components/account/avatar-card";
import { getMe } from "@/lib/account";
import { requireRole } from "@/lib/dal";
import { AccountForm } from "./account-form";

export const metadata: Metadata = { title: "Profile" };

/**
 * The customer's own profile.
 *
 * Until this page existed a customer could not change the name on their
 * postings or correct the phone number a professional is given after an award.
 * The avatar and the details live together because both describe the same
 * account.
 */
export default async function CustomerProfilePage() {
  const session = await requireRole("customer");
  const me = await getMe(session.token);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The name and number professionals see when you award them a job.
        </p>
      </header>

      <AvatarCard avatarUrl={me.avatar_url} name={me.name} />
      <AccountForm user={me} />
    </div>
  );
}
