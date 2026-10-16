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
  BOOKING_SORT_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  PAGE_SIZES,
  can,
} from "@/lib/admin";
import { currentAdmin, filters, one } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import type { Booking, Collection, Location, Paginated } from "@/lib/types";

export const metadata: Metadata = { title: "Bookings" };

/**
 * Every piece of agreed work.
 *
 * This is the platform's operational picture — what is scheduled, what is stuck,
 * and what was cancelled and by whom. The disputed status is the one an
 * administrator actually acts on, which is why it is called out beside the
 * status pill rather than left for the eye to find in a column.
 */
export default async function AdminBookingsPage(props: PageProps<"/admin/bookings">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_bookings")) {
    return <NoAccess permission="view_bookings" />;
  }

  const params = await props.searchParams;
  const search = filters(params, ["q", "status", "location_id", "sort", "per_page"]);
  const page = one(params.page);
  if (page) search.page = page;

  const [bookings, locations] = await Promise.all([
    apiFetch<Paginated<Booking>>("/admin/bookings", { token: session.token, search }),
    apiFetch<Collection<Location>>("/locations", { token: session.token }),
  ]);

  const filtered = Object.keys(search).some((key) => key !== "page" && key !== "per_page");

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {bookings.meta.total.toLocaleString()} booking{bookings.meta.total === 1 ? "" : "s"} match.
            Total value shown is what the two sides agreed, taken from the booking rather than the
            quotation behind it.
          </>
        }
      />

      <FilterBar action="/admin/bookings">
        <FilterField label="Search" className="min-w-[14rem] flex-1">
          <AdminInput
            type="search"
            name="q"
            defaultValue={one(params.q) ?? ""}
            placeholder="Reference, job title, customer or professional"
          />
        </FilterField>

        <FilterField label="Status">
          <AdminSelect name="status" defaultValue={one(params.status) ?? ""}>
            <option key="any-status" value="">Any status</option>
            {BOOKING_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Location">
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
            {BOOKING_SORT_OPTIONS.map((option) => (
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
            href="/admin/bookings"
            className="pb-2 text-xs font-medium text-admin-muted hover:text-admin-text"
          >
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Panel title="Bookings" bodyClassName="">
        {bookings.data.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyPanel
              label={filtered ? "No booking matches those filters." : "No work has been booked yet."}
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Booking</TH>
                <TH>Status</TH>
                <TH className="hidden md:table-cell">Appointment</TH>
                <TH className="hidden lg:table-cell">Professional</TH>
                <TH>Value</TH>
              </TR>
            </THead>
            <TBody>
              {bookings.data.map((booking) => (
                <TR key={booking.id}>
                  <TD>
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="font-medium hover:text-admin-accent"
                    >
                      {booking.title}
                    </Link>
                    <p className="text-xs text-admin-muted">
                      {booking.reference} · {booking.customer?.name ?? "Unknown customer"}
                    </p>
                  </TD>
                  <TD>
                    <Pill tone={statusPillTone(booking.status)}>{booking.status_label}</Pill>
                    {booking.status === "disputed" ? (
                      <span className="mt-1 block text-xs text-danger">Needs a decision</span>
                    ) : null}
                  </TD>
                  <TD className="hidden text-xs md:table-cell">
                    {booking.scheduled_for ? (
                      <>
                        {formatDate(booking.scheduled_for)}
                        {booking.scheduled_time_slot_label ? (
                          <span className="block text-admin-muted">
                            {booking.scheduled_time_slot_label}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-admin-muted">Not scheduled</span>
                    )}
                  </TD>
                  <TD className="hidden text-xs lg:table-cell">
                    {booking.professional?.business_name ?? booking.professional?.name ?? "—"}
                  </TD>
                  <TD className="text-xs tabular-nums">{formatMoney(booking.total_cents)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Pagination links={paginationLinks(bookings, "/admin/bookings")} />
    </div>
  );
}
