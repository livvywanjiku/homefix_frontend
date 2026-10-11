/**
 * The shape a Server Action returns to `useActionState`.
 *
 * The definition moved to `lib/form-state.ts` when the professional workspace
 * gained its own Server Actions, so that one state type serves every form in
 * the app. It is re-exported here because the auth forms import it by this path.
 */
export { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";
