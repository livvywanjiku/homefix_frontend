import type { Metadata } from "next";
import { getLocations, getServices } from "@/lib/catalogue";
import { requireRole } from "@/lib/dal";
import { getPortfolio } from "@/lib/professional";
import { PortfolioManager } from "./portfolio-manager";

export const metadata: Metadata = { title: "Portfolio" };

export default async function ProfessionalPortfolioPage() {
  const session = await requireRole("professional");

  const [items, services, locations] = await Promise.all([
    getPortfolio(session.token),
    getServices(),
    getLocations(),
  ]);

  return <PortfolioManager items={items} services={services} locations={locations} />;
}
