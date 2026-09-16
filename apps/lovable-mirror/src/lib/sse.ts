import { useEffect, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { SseMessageCreated, SsePresence, SseTicketUpdated } from "@pearl27/contracts";

import { config } from "./config";

export type SseStatus = "live" | "reconnecting" | "off";

/** Reconnect delays: 1s doubling to a 30s cap (FE-3.13). */
export const SSE_MIN_DELAY = 1000;
export const SSE_MAX_DELAY = 30000;

interface DeskTicketLike {
  id: string;
  [key: string]: unknown;
}

interface DeskPageLike {
  items: DeskTicketLike[];
  nextCursor: string | null;
}

/** Patch a visible row in place — no refetch (FE-3.12). Exported for tests. */
export function patchTicketInCache(queryClient: QueryClient, payload: SseTicketUpdated) {
  queryClient.setQueriesData<DeskPageLike>(
    { queryKey: ["desk", "tickets"], exact: false },
    (page) => {
      if (!page || !Array.isArray(page.items)) return page;
      if (!page.items.some((item) => item.id === payload.id)) return page;
      return {
        ...page,
        items: page.items.map((item) =>
          item.id === payload.id
            ? { ...item, version: payload.version, status: payload.status, assignee: payload.assignee }
            : item,
        ),
      };
    },
  );
}

export interface DeskEvents {
  status: SseStatus;
  /** Latest presence payload (Phase 4 renders the PresenceBar from this). */
  presence: SsePresence | null;
}

/**
 * Live desk updates over the API's SSE stream. Reconnects with backoff,
 * patches rows in place, and reports Live / Reconnecting for the indicator.
 */
export function useDeskEvents(enabled: boolean): DeskEvents {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SseStatus>("off");
  const [presence, setPresence] = useState<SsePresence | null>(null);
  const attempt = useRef(0);

  // Render-time adjustment (allowed): dropping to idle when disabled.
  if (!enabled && status !== "off") {
    setStatus("off");
  }

  useEffect(() => {
    if (!enabled) return;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const onTicketUpdated = (event: MessageEvent) => {
      try {
        patchTicketInCache(queryClient, JSON.parse(event.data) as SseTicketUpdated);
      } catch {
        // Malformed payload — heartbeat keeps us honest.
      }
    };
    const onMessageCreated = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as SseMessageCreated;
        void queryClient.invalidateQueries({ queryKey: ["desk", "tickets"] });
        void queryClient.invalidateQueries({ queryKey: ["desk", "ticket"] });
        void queryClient.invalidateQueries({ queryKey: ["desk", "activity"] });
        void payload;
      } catch {
        // ignore
      }
    };
    const onPresence = (event: MessageEvent) => {
      try {
        setPresence(JSON.parse(event.data) as SsePresence);
      } catch {
        // ignore
      }
    };

    function connect() {
      if (cancelled) return;
      let next: EventSource;
      try {
        next = new EventSource(`${config.apiUrl}/desk/events`, { withCredentials: true } as EventSourceInit);
      } catch {
        // Constructor threw synchronously — retry on a tick (async, no render cascade).
        attempt.current += 1;
        timer = setTimeout(() => {
          if (cancelled) return;
          setStatus("reconnecting");
          connect();
        }, Math.min(SSE_MIN_DELAY * 2 ** (attempt.current - 1), SSE_MAX_DELAY));
        return;
      }
      source = next;
      source.addEventListener("ticket.updated", onTicketUpdated as EventListener);
      source.addEventListener("message.created", onMessageCreated as EventListener);
      source.addEventListener("presence", onPresence as EventListener);
      source.onopen = () => {
        attempt.current = 0;
        setStatus("live");
      };
      source.onerror = () => {
        source?.close();
        scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      if (cancelled) return;
      attempt.current += 1;
      setStatus("reconnecting");
      const delay = Math.min(SSE_MIN_DELAY * 2 ** (attempt.current - 1), SSE_MAX_DELAY);
      timer = setTimeout(connect, delay);
    }

    connect();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      source?.close();
      attempt.current = 0;
    };
  }, [enabled, queryClient]);

  return { status, presence };
}
