import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { config } from "./config";

/**
 * Phase 0 stub for lib/sse.ts. Full EventSource with reconnect + query
 * invalidation lands in Phase 3. Renders the Live/Reconnecting indicator.
 */
export function useDeskEvents(enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled || config.apiMock) return;
    const source = new EventSource(`${config.apiUrl}/desk/events`, { withCredentials: true });
    source.addEventListener("ticket.updated", () => {
      void queryClient.invalidateQueries({ queryKey: ["desk"] });
    });
    return () => source.close();
  }, [enabled, queryClient]);
}
