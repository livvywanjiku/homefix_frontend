"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * TanStack Query is deliberately not the app's default data layer — Server
 * Components fetch directly. It is mounted so the two surfaces that genuinely
 * need client-side polling (the message thread and the notification bell) have
 * a provider available.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Created lazily in state so a re-render never discards the cache, while
  // each server render still gets its own client.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
