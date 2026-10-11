import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while Laravel runs the search.
 *
 * Mirrors the real layout — rail on the left, two-up results on the right — so
 * the page does not jump when the results arrive.
 */
export default function LoadingProfessionals() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-5 w-full max-w-2xl" />

      <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_1fr] lg:items-start">
        <div className="rounded-xl border border-line bg-card p-5">
          <Skeleton className="h-5 w-20" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2" aria-busy="true" aria-live="polite">
          <span className="sr-only">Searching…</span>

          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="size-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </div>
              </div>

              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
