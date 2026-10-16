import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminInput,
  AdminSelect,
  EmptyPanel,
  FilterBar,
  FilterField,
  FilterSubmit,
  NoAccess,
  PageIntro,
  Panel,
  Pill,
  statusPillTone,
} from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  PAGE_SIZES,
  PROFESSIONAL_SORT_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  can,
} from "@/lib/admin";
import { currentAdmin, filters, one } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import type { Collection, Location, Paginated, ProfessionalProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Professionals" };

/**
 * The professional directory.
 *
 * Distinct from the verification queue, which answers "what needs deciding".
 * This answers "who is on the platform and how are they doing" — every status,
 * including the suspended ones, with the trading figures beside each name.
 *
 * The location filter is a `<select>` over the whole location set, which is
 * small and already fetched by the public catalogue: a free-text id box would
 * be asking an administrator to remember a database key.
 */
export default async function AdminProfessionalsPage(props: PageProps<"/admin/professionals">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_professionals")) {
    return <NoAccess permission="view_professionals" />;
  }

  const params = await props.searchParams;
  const search = filters(params, ["q", "verification_status", "location_id", "sort", "per_page"]);
  const page = one(params.page);
  if (page) search.page = page;

  const [professionals, locations] = await Promise.all([
    apiFetch<Paginated<ProfessionalProfile>>("/admin/professionals", {
      token: session.token,
      search,
    }),
    apiFetch<Collection<Location>>("/locations", { token: session.token }),
  ]);

  const filtered = Object.keys(search).some((key) => key !== "page" && key !== "per_page");

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {professionals.meta.total.toLocaleString()} professional
            {professionals.meta.total === 1 ? "" : "s"} match. Suspending a listing hides it from
            customers and stops it being booked; the account behind it can be suspended separately.
          </>
        }
      >
        {can(account.permissions, "verify_professional") ? (
          <Link
            href="/admin/verification"
            className="text-xs font-medium text-admin-accent hover:underline"
          >
            Open the verification queue
          </Link>
        ) : null}
      </PageIntro>

      <FilterBar action="/admin/professionals">
        <FilterField label="Search" className="min-w-[14rem] flex-1">
          <AdminInput
            type="search"
            name="q"
            defaultValue={one(params.q) ?? ""}
            placeholder="Trading name, person or email"
          />
        </FilterField>

        <FilterField label="Verification">
          <AdminSelect name="verification_status" defaultValue={one(params.verification_status) ?? ""}>
            <option key="any-status" value="">Any status</option>
            {VERIFICATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Base location">
          <AdminSelect name="location_id" defaultValue={one(params.location_id) ?? ""}>
            <option key="any-location" value="">Any location</option>
            {locations.data.map((location) => (
              <option key={location.id} value={String(location.id)}>
                {location.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Order">
          <AdminSelect name="sort" defaultValue={one(params.sort) ?? "recent"}>
            {PROFESSIONAL_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Per page">
          <AdminSelect name="per_page" defaultValue={one(params.per_page) ?? "25"}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={String(size)}>
                {size}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterSubmit>Apply</FilterSubmit>

        {filtered ? (
          <Link
            href="/admin/professionals"
            className="pb-2 text-xs font-medium text-admin-muted hover:text-admin-text"
          >
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Panel title="Directory" bodyClassName="">
        {professionals.data.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyPanel
              label={
                filtered
                  ? "No professional matches those filters."
                  : "No professional has created a profile yet."
              }
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Professional</TH>
                <TH>Verification</TH>
                <TH className="hidden md:table-cell">Rating</TH>
                <TH className="hidden md:table-cell">Jobs</TH>
                <TH className="hidden xl:table-cell">Base location</TH>
                <TH className="hidden xl:table-cell">Joined</TH>
              </TR>
            </THead>
            <TBody>
              {professionals.data.map((professional) => (
                <TR key={professional.id}>
                  <TD>
                    <Link
                      href={`/admin/professionals/${professional.id}`}
                      className="font-medium hover:text-admin-accent"
                    >
                      {professional.business_name}
                    </Link>
                    <p className="text-xs text-admin-muted">
                      {professional.user?.name}
                      {professional.services_count !== undefined
                        ? ` · ${professional.services_count} service${professional.services_count === 1 ? "" : "s"}`
                        : ""}
                      {professional.documents_count !== undefined
                        ? ` · ${professional.documents_count} document${professional.documents_count === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </TD>
                  <TD>
                    <Pill tone={statusPillTone(professional.verification_status)}>
                      {professional.verification_label}
                    </Pill>
                  </TD>
                  <TD className="hidden text-xs md:table-cell">
                    {professional.rating_count === 0 ? (
                      <span className="text-admin-muted">No ratings</span>
                    ) : (
                      <>
                        {professional.rating_avg.toFixed(1)}
                        <span className="text-admin-muted"> ({professional.rating_count})</span>
                      </>
                    )}
                  </TD>
                  <TD className="hidden text-xs tabular-nums md:table-cell">
                    {professional.completed_jobs_count}
                  </TD>
                  <TD className="hidden text-xs text-admin-muted xl:table-cell">
                    {professional.base_location?.name ?? "Not set"}
                  </TD>
                  <TD className="hidden text-xs text-admin-muted xl:table-cell">
                    {formatDate(professional.created_at)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Pagination links={paginationLinks(professionals, "/admin/professionals")} />
    </div>
  );
}
