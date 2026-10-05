/**
 * A form-level message: a failed submission, or a confirmation.
 *
 * Errors announce assertively because the user just acted and needs to hear
 * the result; a success message is merely a status update.
 */
export function FormMessage({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: React.ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-danger/30 bg-danger-50 text-danger dark:bg-danger/15 dark:text-red-300"
      : "border-success/30 bg-success-50 text-success dark:bg-success/15 dark:text-green-300";

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${styles}`}
    >
      {children}
    </p>
  );
}
