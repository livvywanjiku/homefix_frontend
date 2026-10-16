import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { getAvailability, getMyProfile } from "@/lib/professional";
import { ProfileSetupPrompt } from "../profile-setup-prompt";
import { AvailabilityEditor } from "./availability-editor";

export const metadata: Metadata = { title: "Availability" };

export default async function ProfessionalAvailabilityPage() {
  const session = await requireRole("professional");
  const profile = await getMyProfile(session.token);

  // Working hours are stored on the profile, so there is nothing to read yet.
  if (profile === null) {
    return <ProfileSetupPrompt />;
  }

  const { days, exceptions } = await getAvailability(session.token);

  return <AvailabilityEditor days={days} exceptions={exceptions} />;
}
