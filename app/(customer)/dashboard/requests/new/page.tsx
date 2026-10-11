import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { getLocations, getServices } from "@/lib/catalogue";
import { requireRole } from "@/lib/dal";
import { getPublicProfessional } from "@/lib/discovery";
import { createRequestAction } from "../actions";
import { RequestForm } from "../request-form";

export const metadata: Metadata = { title: "Post a job" };

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** A numeric query value, or null when it is absent or not a number. */
function numeric(value: string | string[] | undefined): number | null {
  const raw = single(value);
  if (raw === undefined) return null;

  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Posting a job (spec §8).
 *
 * The form is prefilled from two kinds of link: a service page ("Request this
 * service") and a professional's profile ("Request this professional"). Neither
 * binds the job to that professional — the request goes on the open board — and
 * the page says so rather than letting the customer assume otherwise.
 */
export default async function NewRequestPage(props: PageProps<"/dashboard/requests/new">) {
  await requireRole("customer");

  const params = await props.searchParams;
  const serviceId = numeric(params.service);
  const professionalId = numeric(params.professional);

  const [services, locations, professional] = await Promise.all([
    getServices(),
    getLocations(),
    professionalId === null ? null : getPublicProfessional(professionalId),
  ]);

  // A professional's first active offering and their base town, as the best
  // guess at what the customer came here to ask them for.
  const suggestedServiceId = professional?.profile.services.find((entry) => entry.is_active)?.service_id ?? null;
  const suggestedLocationId = professional?.profile.base_location?.id ?? null;

  // The link's own service wins over the professional's, because it is the more
  // specific thing the customer clicked.
  const chosenServiceId = serviceId ?? suggestedServiceId;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/dashboard/requests" className="hover:text-foreground hover:underline">
          My requests
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-foreground">Post a job</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Tell us what needs doing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The more detail you give, the more accurate the quotes. Verified
          professionals covering your town will see the job on their board.
        </p>
      </header>

      {professional ? (
        <Card className="border-brand/25 bg-brand-50/60 p-4 text-sm dark:bg-brand/10">
          <p>
            We have pre-filled <strong>{professional.profile.business_name}</strong>&rsquo;s main
            service and town. Your job is posted to the open board, so every
            verified professional covering that town can quote — including{" "}
            {professional.profile.business_name}.
          </p>
        </Card>
      ) : null}

      <Card className="p-6">
        <RequestForm
          action={createRequestAction}
          services={services}
          locations={locations}
          defaultServiceId={chosenServiceId}
          defaultLocationId={suggestedLocationId}
        />
      </Card>
    </div>
  );
}
