"use client";

import { useActionState, useEffect, useRef } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, DescriptionItem } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FileInput, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Table, TBody, TD, TH, THead, TR, TableCard } from "@/components/ui/table";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { formatDate, formatDateTime } from "@/lib/format";
import type { ProfessionalDocument, ProfessionalProfile } from "@/lib/types";
import {
  deleteDocumentAction,
  submitForVerificationAction,
  uploadDocumentAction,
} from "../actions";

/** The document kinds a professional can file, matching `App\Enums\DocumentType`. */
const DOCUMENT_TYPES = [
  { value: "national_id", label: "National ID", required: true },
  { value: "certificate", label: "Trade certificate", required: false },
  { value: "license", label: "Practising licence", required: false },
  { value: "insurance", label: "Insurance cover", required: false },
  { value: "other", label: "Other document", required: false },
];

/** A checklist line, ticked or not. */
function Requirement({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span
        aria-hidden="true"
        className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
          done ? "bg-success-50 text-success" : "bg-surface text-muted-foreground"
        }`}
      >
        {done ? "✓" : "○"}
      </span>
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

/**
 * Identity documents and the application to be reviewed.
 *
 * Filing a document and asking to be reviewed are separate on purpose: a
 * professional may add a licence today and apply next week, and the queue
 * should not fill with half-finished applications in the meantime.
 */
export function VerificationPanel({
  profile,
  documents,
}: {
  profile: ProfessionalProfile;
  documents: ProfessionalDocument[];
}) {
  const [uploadState, uploadAction] = useActionState(uploadDocumentAction, INITIAL_FORM_STATE);
  const [submitState, submitAction] = useActionState(
    submitForVerificationAction,
    INITIAL_FORM_STATE,
  );

  const uploadFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (uploadState.status === "success") uploadFormRef.current?.reset();
  }, [uploadState]);

  // Mirrors `VerificationController::missingRequirements()` — the server is the
  // authority and re-checks on submit, but the professional deserves to see
  // what is outstanding before they press the button and get a 422.
  const hasActiveService = profile.services.some((offering) => offering.is_active);
  const hasIdentity = documents.some((document) => document.type === "national_id");
  const ready = hasActiveService && hasIdentity;

  const canApply =
    profile.verification_status === "pending" || profile.verification_status === "rejected";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified professionals are the only ones customers can find and book. It normally takes
          one working day.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your status</CardTitle>
          <StatusBadge status={profile.verification_status} />
        </CardHeader>

        <CardBody className="flex flex-col gap-5">
          {profile.verification_notes ? (
            <FormMessage tone="error">{profile.verification_notes}</FormMessage>
          ) : null}

          <dl className="grid gap-4 sm:grid-cols-2">
            <DescriptionItem term="Application status">
              {profile.verification_label}
            </DescriptionItem>
            <DescriptionItem term="Approved on">
              {profile.verified_at ? formatDate(profile.verified_at) : "—"}
            </DescriptionItem>
          </dl>

          <div>
            <p className="text-sm font-medium">Before you can apply</p>
            <ul className="mt-1 divide-y divide-line">
              <Requirement
                done={hasActiveService}
                label="At least one active service"
              />
              <Requirement done={hasIdentity} label="A national ID on file" />
            </ul>
          </div>

          {submitState.message ? (
            <FormMessage tone={submitState.status === "success" ? "success" : "error"}>
              {submitState.message}
            </FormMessage>
          ) : null}

          {/* A form rather than a button with an onClick: applying is a state
              change on the server, and it must not be triggerable by a crawler
              following a link. */}
          <form action={submitAction}>
            <SubmitButton
              variant="accent"
              disabled={!ready || !canApply}
              pendingLabel="Submitting…"
            >
              {profile.verification_status === "rejected"
                ? "Resubmit for review"
                : "Submit for review"}
            </SubmitButton>
          </form>

          {profile.is_verified ? (
            <p className="text-sm text-muted-foreground">
              You are verified. Adding or changing documents later does not affect that.
            </p>
          ) : canApply && !ready ? (
            <p className="text-sm text-muted-foreground">
              Complete the items above and this button will unlock.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your documents</CardTitle>
          <span className="text-sm text-muted-foreground">
            {documents.length} on file
          </span>
        </CardHeader>

        <CardBody className="flex flex-col gap-5">
          {documents.length === 0 ? (
            <EmptyState
              title="No documents yet"
              description="Start with your national ID — it is the only one we require."
            />
          ) : (
            <TableCard>
              <Table>
                <THead>
                  <TR>
                    <TH>Document</TH>
                    <TH>Status</TH>
                    <TH>Filed</TH>
                    <TH>Reviewer notes</TH>
                    <TH />
                  </TR>
                </THead>

                <TBody>
                  {documents.map((document) => (
                    <TR key={document.id}>
                      <TD className="font-medium">
                        {document.type_label}
                        {document.type === "national_id" ? (
                          <Badge tone="neutral" className="ml-2">
                            Required
                          </Badge>
                        ) : null}
                      </TD>

                      <TD>
                        <StatusBadge status={document.status} />
                      </TD>

                      <TD className="text-muted-foreground">
                        {formatDate(document.created_at)}
                        {document.reviewed_at ? (
                          <span className="block text-xs">
                            reviewed {formatDateTime(document.reviewed_at)}
                          </span>
                        ) : null}
                      </TD>

                      <TD className="text-muted-foreground">{document.notes ?? "—"}</TD>

                      <TD>
                        <div className="flex items-center justify-end gap-2">
                          {document.url ? (
                            <a
                              href={document.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-brand hover:underline"
                            >
                              View
                            </a>
                          ) : null}

                          {/* Only withdrawable before review — the API refuses
                              the rest, so offering the button would be a lie. */}
                          {document.status === "pending" || document.status === "rejected" ? (
                            <form action={deleteDocumentAction}>
                              <input type="hidden" name="id" value={document.id} />
                              <Button type="submit" variant="ghost" size="sm">
                                Remove
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableCard>
          )}

          <form
            ref={uploadFormRef}
            action={uploadAction}
            className="flex flex-col gap-4 border-t border-line pt-5"
          >
            {uploadState.message ? (
              <FormMessage tone={uploadState.status === "success" ? "success" : "error"}>
                {uploadState.message}
              </FormMessage>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="type" label="Document type" errors={uploadState.errors?.type}>
                {(props) => (
                  <Select {...props} defaultValue="national_id">
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                        {type.required ? " (required)" : ""}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                name="document"
                label="File"
                hint="JPG, PNG or PDF, up to 5 MB."
                errors={uploadState.errors?.document}
              >
                {(props) => (
                  <FileInput
                    {...props}
                    accept="image/jpeg,image/png,application/pdf"
                    required
                  />
                )}
              </Field>
            </div>

            <div className="flex justify-end">
              <SubmitButton variant="secondary" pendingLabel="Uploading…">
                Upload document
              </SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
