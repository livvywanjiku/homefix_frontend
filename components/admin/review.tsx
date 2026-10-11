"use client";

import { useActionState, useState } from "react";
import { AdminTextarea, FormField, Pill, statusPillTone } from "@/components/admin/ui";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { reviewDocumentAction, reviewProfessionalAction } from "@/app/(admin)/admin/verification/actions";

/**
 * The two decisions the verification queue is for.
 *
 * They live here rather than beside the queue because the professional detail
 * page offers the same controls: an administrator who arrived from the
 * directory rather than the queue should not have to navigate back to the
 * queue to act on the person they are already looking at.
 *
 * Both forms deliberately show the adverse path's requirements up front. A note
 * field that only becomes mandatory once you have already chosen "reject" is
 * one you discover by being refused, which on a screen about someone's
 * livelihood is the wrong way to find out.
 */

type Decision = "verify" | "reject" | "suspend";

const DECISIONS: { value: Decision; label: string; hint: string }[] = [
  { value: "verify", label: "Verify", hint: "Listed, searchable and bookable by customers." },
  { value: "reject", label: "Reject", hint: "Not listed. They may correct the application and resubmit." },
  { value: "suspend", label: "Suspend", hint: "Stood down after being verified. Only an administrator lifts it." },
];

/** Verify, reject or suspend one professional's application. */
export function VerificationDecisionForm({
  id,
  currentStatus,
}: {
  id: number;
  currentStatus: string;
}) {
  const [state, formAction] = useActionState(reviewProfessionalAction, INITIAL_FORM_STATE);
  const [decision, setDecision] = useState<Decision>("verify");

  const adverse = decision !== "verify";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="professional_id" value={id} />

      <p className="text-sm">
        This application is currently <Pill tone={statusPillTone(currentStatus)}>{currentStatus}</Pill>
      </p>

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      {state.errors?.decision ? (
        <FormMessage tone="error">{state.errors.decision.join(" ")}</FormMessage>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium tracking-wide text-admin-muted uppercase">
          Decision
        </legend>
        {DECISIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              decision === option.value
                ? "border-admin-accent bg-admin-accent-soft"
                : "border-admin-border hover:bg-admin-surface"
            }`}
          >
            <input
              type="radio"
              name="decision"
              value={option.value}
              checked={decision === option.value}
              onChange={() => setDecision(option.value)}
              className="mt-1 accent-admin-accent"
            />
            <span>
              <span className="font-medium">{option.label}</span>
              <span className="block text-xs text-admin-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <FormField
        label={adverse ? "Reason (required)" : "Note (optional, kept privately)"}
        error={state.errors?.notes}
        hint={
          adverse
            ? "Shown to the professional so they can put it right."
            : undefined
        }
      >
        <AdminTextarea
          name="notes"
          rows={3}
          maxLength={1000}
          required={adverse}
          placeholder={
            adverse
              ? "The national ID is expired — upload a current one."
              : "Certificates checked against the issuing body."
          }
        />
      </FormField>

      <div>
        <SubmitButton
          variant={decision === "verify" ? "primary" : "danger"}
          pendingLabel="Recording…"
        >
          {decision === "verify"
            ? "Verify this professional"
            : decision === "reject"
              ? "Reject this application"
              : "Suspend this professional"}
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * Approve or reject one uploaded document.
 *
 * A rejection always carries a reason, because a document bounced without one
 * leaves its owner guessing at what to replace it with. Approval clears any
 * earlier reason, which is why the note field only appears on the adverse path.
 */
export function DocumentReviewControls({
  documentId,
  professionalId,
  status,
}: {
  documentId: number;
  professionalId: number;
  status: string;
}) {
  const [state, formAction] = useActionState(reviewDocumentAction, INITIAL_FORM_STATE);
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      {state.errors?.notes ? (
        <FormMessage tone="error">{state.errors.notes.join(" ")}</FormMessage>
      ) : null}

      {rejecting ? (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="document_id" value={documentId} />
          <input type="hidden" name="professional_id" value={professionalId} />
          <input type="hidden" name="decision" value="reject" />
          <AdminTextarea
            name="notes"
            rows={2}
            maxLength={1000}
            required
            placeholder="Why this document cannot be accepted."
          />
          <div className="flex items-center gap-2">
            <SubmitButton size="sm" variant="danger" pendingLabel="Rejecting…">
              Confirm rejection
            </SubmitButton>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="text-xs font-medium text-admin-muted hover:text-admin-text"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="document_id" value={documentId} />
          <input type="hidden" name="professional_id" value={professionalId} />
          <input type="hidden" name="decision" value="approve" />
          <SubmitButton size="sm" variant="primary" pendingLabel="Approving…">
            Approve
          </SubmitButton>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="text-xs font-medium text-danger hover:underline"
          >
            Reject…
          </button>
        </form>
      )}
    </div>
  );
}
