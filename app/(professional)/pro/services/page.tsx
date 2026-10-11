import type { Metadata } from "next";
import { getServices } from "@/lib/catalogue";
import { requireRole } from "@/lib/dal";
import { getOfferings } from "@/lib/professional";
import { ServiceManager } from "./service-manager";

export const metadata: Metadata = { title: "Your services" };

export default async function ProfessionalServicesPage() {
  const session = await requireRole("professional");

  const [offerings, services] = await Promise.all([
    getOfferings(session.token),
    getServices(),
  ]);

  return <ServiceManager offerings={offerings} services={services} />;
}
