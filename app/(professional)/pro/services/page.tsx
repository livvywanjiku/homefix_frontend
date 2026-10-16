import type { Metadata } from "next";
import { getServices } from "@/lib/catalogue";
import { requireRole } from "@/lib/dal";
import { getMyProfile, getOfferings } from "@/lib/professional";
import { ProfileSetupPrompt } from "../profile-setup-prompt";
import { ServiceManager } from "./service-manager";

export const metadata: Metadata = { title: "Your services" };

export default async function ProfessionalServicesPage() {
  const session = await requireRole("professional");
  const profile = await getMyProfile(session.token);

  // Offerings belong to a profile, so the list endpoint 404s until one exists.
  if (profile === null) {
    return <ProfileSetupPrompt />;
  }

  const [offerings, services] = await Promise.all([
    getOfferings(session.token),
    getServices(),
  ]);

  return <ServiceManager offerings={offerings} services={services} />;
}
