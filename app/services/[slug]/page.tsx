import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ServiceIcon } from "@/components/service-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getServiceCategory } from "@/lib/catalogue";

type Props = PageProps<"/services/[slug]">;

/**
 * Per-category metadata.
 *
 * Uses the category's own name and description, so a shared link previews as
 * "Plumbing · HomeFix Connect" rather than the generic site title.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getServiceCategory(slug);

  if (!category) return { title: "Category not found" };

  return {
    title: category.name,
    description:
      category.description ??
      `Book verified ${category.name.toLowerCase()} professionals on HomeFix Connect.`,
  };
}

export default async function ServiceCategoryPage({ params }: Props) {
  // `params` is a Promise in Next 16 — synchronous access was removed.
  const { slug } = await params;

  const category = await getServiceCategory(slug);

  if (!category) notFound();

  const services = category.services ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/services" className="hover:text-foreground hover:underline">
          Services
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
            <ServiceIcon slug={category.slug} size={32} className="shrink-0 text-brand" />
            {category.name}
          </h1>

          <p className="mt-3 text-base leading-7 text-muted-foreground">
            {category.description ??
              `Verified ${category.name.toLowerCase()} professionals across Kenya.`}
          </p>
        </div>

        <Link
          href={`/professionals?service_category_id=${category.id}`}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-navy transition-colors hover:bg-accent-600"
        >
          Find a {category.name} pro
        </Link>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          What we cover
        </h2>

        {services.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="No services listed yet"
              description={`We are still onboarding ${category.name.toLowerCase()} professionals for these services.`}
              action={
                <Button variant="secondary" className="pointer-events-none">
                  Check back soon
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.id}>
                <Card className="flex h-full flex-col gap-2 p-4">
                  <h3 className="font-medium text-foreground">{service.name}</h3>

                  {service.description ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {service.description}
                    </p>
                  ) : null}

                  {/*
                    The intended action, straight into the request wizard with
                    this service preselected. A guest is redirected to sign in by
                    `proxy.ts` and returned here afterwards with the whole target
                    — query string included — so the choice survives the round trip.
                  */}
                  <Link
                    href={`/dashboard/requests/new?service=${service.id}`}
                    className="mt-auto pt-2 text-sm font-medium text-brand hover:underline"
                  >
                    Request this service
                    <span aria-hidden="true"> →</span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
