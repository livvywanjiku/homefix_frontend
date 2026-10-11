import type { Metadata } from "next";
import { getLocations } from "@/lib/catalogue";
import { requireRole } from "@/lib/dal";
import { getMyProfile } from "@/lib/professional";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfessionalProfilePage() {
  const session = await requireRole("professional");

  // Two independent reads, so they go out together rather than in sequence.
  const [profile, locations] = await Promise.all([
    getMyProfile(session.token),
    getLocations(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what customers see when they find you in search.
        </p>
      </div>

      <ProfileForm profile={profile} locations={locations} />
    </div>
  );
}
