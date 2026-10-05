/**
 * The shell shared by every authentication page.
 *
 * Typed explicitly rather than with the generated `LayoutProps`: those are
 * keyed by route, and a route group has no route of its own, so there is no
 * correct key to name here. Nothing below needs params.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
