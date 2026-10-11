import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { getLocations, getServices } from "@/lib/catalogue";
import { requireRole } from "@/lib/dal";
import { getServiceRequest } from "@/lib/requests";
import type { ServiceRequest } from "@/lib/types";
import { updateRequestAction } from "../../actions";
import { RequestForm } from "../../request-form";

export const metadata: Metadata = { title: "Edit request" };

/**
 * Editing a job that is still open.
 *
 * The API refuses once anyone has quoted — a professional who priced "replace
 * the trap" should not find it has become "replace the whole sink" — so an
 * uneditable request is sent straight back to its detail page rather than being
 * rendered as a form that would fail on submit.
 */
export default async function EditRequestPage({ params }: PageProps<"/dashboard/requests/[id]/edit">) {
  const session = await requireRole("customer");
  const { id } = await params;

  let request: ServiceRequest;

  try {
    request = await getServiceRequest(session.token, id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }

    throw error;
  }

  if (!request.is_editable) redirect(`/dashboard/requests/${request.id}`);

  const [services, locations] = await Promise.all([getServices(), getLocations()]);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/dashboard/requests" className="hover:text-foreground hover:underline">
          My requests
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <Link
          href={`/dashboard/requests/${request.id}`}
          className="hover:text-foreground hover:underline"
        >
          {request.reference}
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-foreground">Edit</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Edit your request</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You can edit this until the first professional quotes. Photos are added
          and removed on the request page itself.
        </p>
      </header>

      <Card className="p-6">
        <RequestForm
          action={updateRequestAction}
          services={services}
          locations={locations}
          request={request}
        />
      </Card>
    </div>
  );
}
