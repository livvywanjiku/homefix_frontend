import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { getAvailability } from "@/lib/professional";
import { AvailabilityEditor } from "./availability-editor";

export const metadata: Metadata = { title: "Availability" };

export default async function ProfessionalAvailabilityPage() {
  const session = await requireRole("professional");
  const { days, exceptions } = await getAvailability(session.token);

  return <AvailabilityEditor days={days} exceptions={exceptions} />;
}
