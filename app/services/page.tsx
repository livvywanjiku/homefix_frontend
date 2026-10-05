import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getServiceCategories } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Browse every home service on HomeFix Connect — plumbing, electrical, cleaning, carpentry, painting and more.",
};

/**
 * The service catalogue grid (spec §5).
 *
 * A Server Component: the catalogue is public and identical for every visitor,
 * so there is no reason to ship it to the client or fetch it twice.
 */
export default async function ServicesPage() {
  const categories = await getServiceCategories();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Our services</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Fifteen categories covering everything from a leaking tap to a full
          rewiring. Pick a category to see the specific jobs professionals on
          HomeFix Connect take on.
        </p>
      </header>

      {categories.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="The catalogue is empty"
            description="No service categories have been published yet. Please check back shortly."
          />
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/services/${category.slug}`} className="group block h-full">
                <Card className="flex h-full flex-col gap-3 p-5 transition-shadow group-hover:shadow-md group-hover:ring-1 group-hover:ring-brand/20">
                  <span className="text-3xl" aria-hidden="true">
                    {category.icon ?? "🛠️"}
                  </span>

                  <h2 className="font-semibold tracking-tight text-foreground group-hover:text-brand">
                    {category.name}
                  </h2>

                  <p className="text-sm leading-6 text-muted-foreground">
                    {category.description ??
                      `Find verified ${category.name.toLowerCase()} professionals near you.`}
                  </p>

                  <p className="mt-auto pt-2 text-xs font-medium text-brand">
                    {category.services_count ?? 0}{" "}
                    {(category.services_count ?? 0) === 1 ? "service" : "services"}
                    <span aria-hidden="true"> →</span>
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
