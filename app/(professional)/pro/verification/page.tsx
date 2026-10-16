import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { getDocuments, getMyProfile } from "@/lib/professional";
import { ProfileSetupPrompt } from "../profile-setup-prompt";
import { VerificationPanel } from "./verification-panel";

export const metadata: Metadata = { title: "Verification" };

export default async function ProfessionalVerificationPage() {
  const session = await requireRole("professional");
  const profile = await getMyProfile(session.token);

  /*
   * Documents belong to a profile, so without one there is nothing to attach
   * them to. The API would 404 on the list endpoint too — this turns that into
   * a sentence and a way forward.
   */
  if (profile === null) {
    return (
      <ProfileSetupPrompt description="Verification documents are filed against your profile, so it needs to exist before you can upload anything." />
    );
  }

  const documents = await getDocuments(session.token);

  return <VerificationPanel profile={profile} documents={documents} />;
}
