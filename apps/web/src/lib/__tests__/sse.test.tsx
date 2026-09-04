import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { patchTicketInCache, SSE_MAX_DELAY, SSE_MIN_DELAY, useDeskEvents } from "@/lib/sse";
import { renderWithProviders } from "@/test/render";

type Listener = (event: { data: string }) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  listeners = new Map<string, Listener[]>();
  onclose: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: Listener) {
    const list = this.listeners.get(type) ?? [];
    list.push(cb);
    this.listeners.set(type, list);
  }

  onopen: (() => void) | null = null;

  open() {
    this.onopen?.();
  }

  onerror: (() => void) | null = null;

  emit(type: string, data: unknown) {
    for (const cb of this.listeners.get(type) ?? []) cb({ data: JSON.stringify(data) });
  }

  fail() {
    this.onerror?.();
  }

  close() {
    this.closed = true;
  }
}

function Harness({ enabled }: { enabled: boolean }) {
  const { status } = useDeskEvents(enabled);
  return <p aria-label="sse-status">{status}</p>;
}

describe("lib/sse", () => {
  it("FE-3.12: ticket.updated patches the query cache with no network request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.stubGlobal("EventSource", FakeEventSource);
    FakeEventSource.instances = [];
    try {
      const client = new QueryClient();
      client.setQueryData(["desk", "tickets", "?tab=mine"], {
        items: [{ id: "t-1", status: "pending", assignee: null, version: 1 }],
        nextCursor: null,
      });
      render(
        <QueryClientProvider client={client}>
          <Harness enabled />
        </QueryClientProvider>,
      );
      const source = FakeEventSource.instances[0]!;
      expect(source.url).toContain("/desk/events");
      act(() => {
        source.open();
      });
      act(() => {
        source.emit("ticket.updated", { id: "t-1", version: 2, status: "open", assignee: { id: "u-1", name: "Kofi" } });
      });
      const page = client.getQueryData<{ items: { status: string; version: number }[] }>(["desk", "tickets", "?tab=mine"]);
      expect(page?.items[0]).toMatchObject({ status: "open", version: 2 });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      fetchSpy.mockRestore();
    }
  });

  it("FE-3.13: connection drops reconnect with 1s → 30s capped backoff", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", FakeEventSource);
    FakeEventSource.instances = [];
    try {
      renderWithProviders(<Harness enabled />);
      expect(screen.getByLabelText("sse-status")).toBeTruthy();
      expect(FakeEventSource.instances).toHaveLength(1);
      act(() => {
        FakeEventSource.instances[0]!.open();
      });
      expect(screen.getByLabelText("sse-status")).toHaveTextContent("live");

      // Drop the connection → reconnecting + scheduled retry.
      act(() => {
        FakeEventSource.instances[0]!.fail();
      });
      expect(screen.getByLabelText("sse-status")).toHaveTextContent("reconnecting");
      expect(FakeEventSource.instances).toHaveLength(1);

      // First retry after 1s.
      await act(async () => {
        vi.advanceTimersByTime(SSE_MIN_DELAY);
      });
      expect(FakeEventSource.instances).toHaveLength(2);

      // Backoff doubles (2s) then caps at 30s.
      act(() => {
        FakeEventSource.instances[1]!.fail();
      });
      await act(async () => {
        vi.advanceTimersByTime(SSE_MIN_DELAY * 2);
      });
      expect(FakeEventSource.instances).toHaveLength(3);

      for (let i = 0; i < 8; i++) {
        act(() => {
          FakeEventSource.instances[FakeEventSource.instances.length - 1]!.fail();
        });
        await act(async () => {
          vi.advanceTimersByTime(SSE_MAX_DELAY);
        });
      }
      const count = FakeEventSource.instances.length;
      act(() => {
        FakeEventSource.instances[FakeEventSource.instances.length - 1]!.fail();
      });
      // Capped: advancing less than 30s must not reconnect.
      await act(async () => {
        vi.advanceTimersByTime(SSE_MAX_DELAY - 1);
      });
      expect(FakeEventSource.instances).toHaveLength(count);
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(FakeEventSource.instances).toHaveLength(count + 1);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it("patchTicketInCache leaves other pages untouched", () => {
    const client = new QueryClient();
    client.setQueryData(["desk", "tickets", "?tab=all"], {
      items: [{ id: "t-9", status: "pending", version: 1 }],
      nextCursor: null,
    });
    patchTicketInCache(client, { id: "t-1", version: 2, status: "open", assignee: null });
    expect(client.getQueryData(["desk", "tickets", "?tab=all"])).toEqual({
      items: [{ id: "t-9", status: "pending", version: 1 }],
      nextCursor: null,
    });
  });
});
