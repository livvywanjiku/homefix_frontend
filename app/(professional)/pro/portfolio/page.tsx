import type { Metadata } from "next";
import { getLocations, getServices } from "@/lib/catalogue";
import { requireRole } from "@/lib/dal";
import { getMyProfile, getPortfolio } from "@/lib/professional";
import { ProfileSetupPrompt } from "../profile-setup-prompt";
import { PortfolioManager } from "./portfolio-manager";

export const metadata: Metadata = { title: "Portfolio" };

export default async function ProfessionalPortfolioPage() {
  const session = await requireRole("professional");
  const profile = await getMyProfile(session.token);

  // Portfolio items belong to a profile, so the list endpoint 404s until one exists.
  if (profile === null) {
    return <ProfileSetupPrompt />;
  }

  const [items, services, locations] = await Promise.all([
    getPortfolio(session.token),
    getServices(),
    getLocations(),
  ]);

  return <PortfolioManager items={items} services={services} locations={locations} />;
}
