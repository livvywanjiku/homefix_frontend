"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Location, Service, ServiceCategory } from "@/lib/types";

/** The sort keys the API accepts, with the wording shown to customers. */
const SORTS: { value: string; label: string; needsLocation?: boolean }[] = [
  { value: "rating", label: "Best rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "experience", label: "Most experienced" },
  { value: "price_low", label: "Lowest price first" },
  { value: "price_high", label: "Highest price first" },
  { value: "newest", label: "Newest on HomeFix" },
  { value: "distance", label: "Nearest first", needsLocation: true },
];

const DISTANCES = [5, 10, 25, 50, 100, 200];

const RATINGS = [4.5, 4, 3.5, 3];

/**
 * The search filter rail (spec §13).
 *
 * Every control here ends up as a query parameter on `/professionals`, which the
 * Server Component hands straight to Laravel. Nothing is filtered in the
 * browser — the results the customer sees are the rows the database returned.
 *
 * A plain GET form would work, but two controls depend on others (the service
 * list narrows to the chosen category, and "nearest first" is meaningless
 * without a location), so this is a client component to keep the form honest
 * about what it can actually do.
 */
export function ProfessionalFilters({
  categories,
  services,
  locations,
  current,
}: {
  categories: ServiceCategory[];
  services: Service[];
  locations: Location[];
  current: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [categoryId, setCategoryId] = useState(current.service_category_id ?? "");
  const [locationId, setLocationId] = useState(current.location_id ?? "");

  // Narrowing the catalogue client-side is presentation, not filtering: the
  // server still validates whatever is submitted against the real catalogue.
  const visibleServices = categoryId
    ? services.filter((service) => String(service.service_category_id) === categoryId)
    : services;

  function submit(formData: FormData) {
    const params = new URLSearchParams();

    const text = (key: string) => {
      const value = formData.get(key);
      return typeof value === "string" ? value.trim() : "";
    };

    for (const key of [
      "q",
      "service_category_id",
      "service_id",
      "location_id",
      "max_distance_km",
      "min_rating",
      "date",
    ]) {
      const value = text(key);
      if (value !== "") params.set(key, value);
    }

    // A max price is typed in whole shillings and sent as minor units, which is
    // the only form the API accepts.
    const maxPrice = text("max_price");
    if (maxPrice !== "") params.set("max_price_cents", String(Math.round(Number(maxPrice) * 100)));

    const sort = text("sort");
    // "Nearest first" without somewhere to measure from would be rejected by the
    // API; dropping it here means the customer gets results instead of an error.
    if (sort !== "" && !(sort === "distance" && text("location_id") === "")) {
      params.set("sort", sort);
    }

    startTransition(() => {
      router.push(params.size > 0 ? `/professionals?${params}` : "/professionals");
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="q" className="text-sm font-medium">
          What do you need?
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={current.q ?? ""}
          placeholder="e.g. leaking tap, rewiring"
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="service_category_id" className="text-sm font-medium">
          Category
        </label>
        <select
          id="service_category_id"
          name="service_category_id"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="service_id" className="text-sm font-medium">
          Service
        </label>
        <select
          id="service_id"
          name="service_id"
          defaultValue={current.service_id ?? ""}
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
        >
          <option value="">Any service</option>
          {visibleServices.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="location_id" className="text-sm font-medium">
          Location
        </label>
        <select
          id="location_id"
          name="location_id"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
        >
          <option value="">Anywhere in Kenya</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="max_distance_km" className="text-sm font-medium">
          Within
        </label>
        <select
          id="max_distance_km"
          name="max_distance_km"
          defaultValue={current.max_distance_km ?? ""}
          // A radius without an origin has nothing to measure from.
          disabled={locationId === ""}
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm disabled:opacity-50"
        >
          <option value="">Any distance</option>
          {DISTANCES.map((km) => (
            <option key={km} value={km}>
              {km} km
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="min_rating" className="text-sm font-medium">
          Rating
        </label>
        <select
          id="min_rating"
          name="min_rating"
          defaultValue={current.min_rating ?? ""}
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
        >
          <option value="">Any rating</option>
          {RATINGS.map((rating) => (
            <option key={rating} value={rating}>
              {rating} and above
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="max_price" className="text-sm font-medium">
          Starting price up to (KSh)
        </label>
        <input
          id="max_price"
          name="max_price"
          type="number"
          min={0}
          step={100}
          inputMode="numeric"
          defaultValue={
            current.max_price_cents ? String(Number(current.max_price_cents) / 100) : ""
          }
          placeholder="Any budget"
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="date" className="text-sm font-medium">
          Available on
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={current.date ?? ""}
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sort" className="text-sm font-medium">
          Sort by
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={current.sort ?? "rating"}
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
        >
          {SORTS.map((sort) => (
            <option
              key={sort.value}
              value={sort.value}
              disabled={sort.needsLocation === true && locationId === ""}
            >
              {sort.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </Button>

        <button
          type="reset"
          onClick={() => {
            setCategoryId("");
            setLocationId("");
            startTransition(() => router.push("/professionals"));
          }}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
