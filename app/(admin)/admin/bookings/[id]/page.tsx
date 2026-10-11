import type { Metadata } from "next";
import Link from "next/link";
import {
  EmptyPanel,
  KeyValue,
  NoAccess,
  PageIntro,
  Panel,
  Pill,
  ToneDot,
  statusPillTone,
} from "@/components/admin/ui";
import { can, type AdminBookingHistoryEntry } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { TransitionBookingForm } from "./transition-form";

export const metadata: Metadata = { title: "Booking" };

/**
 * `show()` answers with the booking and its history side by side rather than
 * wrapping them in a resource envelope, because the history is not a property
 * of the booking — it is the record of how it got here.
 */
type BookingDetail = { booking: Booking; history: AdminBookingHistoryEntry[] };

/**
 * One piece of agreed work.
 *
 * The history is the point of this screen. When a dispute is open, the status
 * column cannot answer "who cancelled this, and what did they say at the time"
 * — only the timeline can, which is why every status write on the platform
 * records one, administrators included.
 */
export default async function AdminBookingPage(props: PageProps<"/admin/bookings/[id]">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_bookings")) {
    return <NoAccess permission="view_bookings" />;
  }

  const { id } = await props.params;
  const detail = await apiFetch<BookingDetail>(`/admin/bookings/${id}`, { token: session.token });
  const booking = detail.booking;

  const mayManage = can(account.permissions, "manage_bookings");

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            <Link href="/admin/bookings" className="hover:text-admin-accent">
              ← All bookings
            </Link>
          </>
        }
      >
        <Pill tone={statusPillTone(booking.status)}>{booking.status_label}</Pill>
        {booking.status === "disputed" ? <Pill tone="danger">Open dispute</Pill> : null}
        {booking.is_finished ? <Pill>Finished</Pill> : null}
      </PageIntro>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="The work" className="lg:col-span-2">
          <p className="text-base font-semibold">{booking.title}</p>
          {booking.description ? (
            <p className="mt-2 text-sm whitespace-pre-line">{booking.description}</p>
          ) : null}

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KeyValue label="Reference">{booking.reference}</KeyValue>
            <KeyValue label="Service">{booking.service?.name ?? "—"}</KeyValue>
            <KeyValue label="Location">{booking.location?.label ?? "—"}</KeyValue>
            <KeyValue label="Agreed">{formatDateTime(booking.agreed_at)}</KeyValue>
            <KeyValue label="Started">{formatDateTime(booking.started_at)}</KeyValue>
            <KeyValue label="Completed">{formatDateTime(booking.completed_at)}</KeyValue>
          </dl>

          {booking.cancelled_at ? (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger-50 px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-danger uppercase">
                Cancelled {formatDate(booking.cancelled_at)}
              </p>
              <p className="mt-1 text-sm">
                {booking.cancellation_reason ?? "No reason was recorded."}
              </p>
            </div>
          ) : null}
        </Panel>

        <Panel title="The agreement">
          <dl className="grid gap-4">
            <KeyValue label="Appointment">
              {booking.scheduled_for ? (
                <>
                  {formatDateTime(booking.scheduled_for)}
                  {booking.scheduled_time_slot_label ? (
                    <span className="block text-xs text-admin-muted">
                      {booking.scheduled_time_slot_label}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-admin-muted">Not scheduled</span>
              )}
            </KeyValue>
            <KeyValue label="Address">
              {booking.address ?? <span className="text-admin-muted">Not given</span>}
            </KeyValue>
          </dl>

          <dl className="mt-5 grid gap-2 border-t border-admin-border pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-admin-muted">Labour</dt>
              <dd className="tabular-nums">{formatMoney(booking.labour_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-admin-muted">Materials</dt>
              <dd className="tabular-nums">{formatMoney(booking.materials_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-admin-muted">Transport</dt>
              <dd className="tabular-nums">{formatMoney(booking.transport_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-admin-muted">Other</dt>
              <dd className="tabular-nums">{formatMoney(booking.other_cents)}</dd>
            </div>
            <div className="flex justify-between border-t border-admin-border pt-2 font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(booking.total_cents)}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Parties">
          <dl className="grid gap-4">
            <KeyValue label="Customer">
              {booking.customer?.id ? (
                <Link href={`/admin/users/${booking.customer.id}`} className="hover:text-admin-accent">
                  {booking.customer.name}
                </Link>
              ) : (
                "—"
              )}
            </KeyValue>
            <KeyValue label="Professional">
              {booking.professional?.business_name ?? booking.professional?.name ?? "—"}
            </KeyValue>
          </dl>
          <p className="mt-4 text-xs text-admin-muted">
            Payments and messaging between the two sides are not exposed to the console; what an
            administrator arbitrates is the booking itself.
          </p>
        </Panel>

        <Panel
          title="Move this booking"
          description="Subject to the same state machine as the customer's and professional's own screens."
          className="lg:col-span-2"
        >
          {mayManage ? (
            <div className="max-w-xl">
              <TransitionBookingForm
                id={booking.id}
                status={booking.status}
                statusLabel={booking.status_label}
                allowed={booking.allowed_transitions}
              />
            </div>
          ) : (
            <p className="text-sm text-admin-muted">
              Moving a booking requires the{" "}
              <span className="font-medium text-admin-text">manage_bookings</span> permission, which
              your role does not hold. The history below is still readable.
            </p>
          )}
        </Panel>
      </div>

      <Panel title="History" description="Every status change, in order, with who made it.">
        {detail.history.length === 0 ? (
          <EmptyPanel label="This booking has no recorded status changes." />
        ) : (
          <ol className="flex flex-col gap-4">
            {detail.history.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <ToneDot tone={entry.to === "disputed" || entry.to === "cancelled" ? "danger" : "accent"} />
                <div className="min-w-0">
                  <p className="text-sm">
                    {entry.from_label ? (
                      <>
                        <span className="text-admin-muted">{entry.from_label}</span> →{" "}
                      </>
                    ) : null}
                    <span className="font-medium">{entry.to_label}</span>
                  </p>
                  <p className="text-xs text-admin-muted">
                    {formatDateTime(entry.at)}
                    {entry.changed_by ? ` · ${entry.changed_by}` : " · recorded by the platform"}
                    {" · "}
                    {formatRelative(entry.at)}
                  </p>
                  {entry.note ? <p className="mt-1 text-sm text-admin-muted">{entry.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
