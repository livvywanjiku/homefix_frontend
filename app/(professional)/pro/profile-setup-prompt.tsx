import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shown by any workspace screen that has nothing to render without a profile.
 *
 * Every `/professional/*` reader except `/professional/profile` resolves the
 * profile from the signed-in account and answers 404 until one exists — the
 * lists genuinely belong to a profile, and the dashboard's figures are facts
 * about one. A professional who has just registered therefore meets that 404 on
 * every section of the workspace, so the sections share one sentence and one
 * way forward instead of each inventing its own.
 *
 * `description` is overridable because the reason differs by screen: the job
 * board is empty for want of services and areas, whereas verification documents
 * have nowhere to be filed at all.
 */
export function ProfileSetupPrompt({ description }: { description?: string }) {
  return (
    <EmptyState
      title="Set up your profile first"
      description={
        description ??
        "Your services, availability and portfolio all hang off your profile, so it needs to exist before this screen has anything to show."
      }
      action={<ButtonLink href="/pro/profile">Set up your profile</ButtonLink>}
    />
  );
}
