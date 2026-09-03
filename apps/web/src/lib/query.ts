import { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  me: ["auth", "me"] as const,
  myTickets: ["tickets", "mine"] as const,
  deskTickets: (query: string) => ["desk", "tickets", query] as const,
};

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  });
}
