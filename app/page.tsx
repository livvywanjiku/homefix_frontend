import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { getLocations } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Find trusted home professionals",
  description:
    "Describe the job, compare quotes from verified tradespeople, and track the work from booking through to review.",
};

/**
 * The three steps from spec §28, in the order a visitor experiences them.
 *
 * Static content on the landing page: it explains the model before anyone has
 * an account, so it must not depend on a Laravel call that could be slow or
 * down — a broken landing page is the worst possible first impression.
 */
const STEPS = [
  {
    term: "Describe the job",
    detail:
      "Post what needs doing with photos, a location and a budget range. It takes a minute and costs nothing.",
  },
  {
    term: "Compare quotes",
    detail:
      "Verified professionals send itemised quotations — labour, materials and transport, broken out.",
  },
  {
    term: "Track and review",
    detail:
      "Follow the booking from scheduled to completed, message in-app, then rate the work.",
  },
];

const POPULAR = [
  "Plumbing",
  "Electrical",
  "Cleaning",
  "Carpentry",
  "Painting",
  "Appliance Repair",
];

export default async function Home() {
  // The location picker is the one part of the hero that is real data. It is a
  // small, public, cacheable list, and fetching it server-side keeps the search
  // form working with JavaScript disabled.
  const locations = await getLocations();

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-navy px-4 py-20 text-white sm:px-6">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Find trusted home professionals
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">
            Reliable professionals. Quality service. Compare quotes from verified
            tradespeople and book with confidence.
          </p>

          {/*
            A plain GET form, so search works before any JavaScript loads and
            the result is a real, shareable URL.
          */}
          <form
            action="/professionals"
            method="get"
            className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-xl bg-white p-3 text-left sm:flex-row"
          >
            <div className="flex-1">
              <label htmlFor="q" className="sr-only">
                What service do you need?
              </label>
              <Input
                id="q"
                name="q"
                type="search"
                placeholder="🔍 What service do you need?"
                className="border-transparent bg-surface"
              />
            </div>

            <div className="sm:w-56">
              <label htmlFor="location" className="sr-only">
                Your location
              </label>
              <Select
                id="location"
                name="location"
                defaultValue=""
                className="border-transparent bg-surface"
              >
                <option value="">📍 Any location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    📍 {location.label}
                  </option>
                ))}
              </Select>
            </div>

            <Button type="submit" variant="accent" className="shrink-0 sm:w-auto">
              Find a Pro
            </Button>
          </form>

          <p className="mt-5 text-sm text-white/60">
            Popular:{" "}
            {POPULAR.map((service, index) => (
              <span key={service}>
                {index > 0 ? " · " : ""}
                <Link
                  href={`/professionals?q=${encodeURIComponent(service)}`}
                  className="underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {service}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          How HomeFix Connect works
        </h2>

        <dl className="mt-8 grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ term, detail }, index) => (
            <div key={term}>
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                {index + 1}
              </span>
              <dt className="mt-3 font-medium">{term}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-line bg-surface px-4 py-16 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Are you a professional?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Create a profile, get verified, set your own prices and service
              area, and receive job requests from customers near you.
            </p>
          </div>

          <Link
            href="/register?role=professional"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-navy transition-colors hover:bg-accent-600"
          >
            Join as a professional
          </Link>
        </div>
      </section>
    </div>
  );
}
