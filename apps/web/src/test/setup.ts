import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { resetAdminStore, resetCategories } from "@/mocks/admin";
import { resetConversations, resetPresence } from "@/mocks/conversations";
import { resetDeskStore } from "@/mocks/desk";
import { resetEmployeeStore } from "@/mocks/employee";
import { resetAdmins, resetAgents, setMockSession } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
  // jsdom has no blob URLs — UploadZone previews need the stub.
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => "blob:mock") as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
  }
  // Radix floating-ui layers (DropdownMenu, Tooltip) size via ResizeObserver.
  if (!("ResizeObserver" in globalThis)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  // user-event + Radix dispatch PointerEvents; jsdom doesn't implement them.
  if (!("PointerEvent" in globalThis)) {
    class PointerEventStub extends MouseEvent {
      constructor(type: string, params?: PointerEventInit) {
        super(type, params);
      }
    }
    globalThis.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
  }
  // floating-ui's `autoUpdate` (DropdownMenu/Tooltip/Select) drives positioning
// from rAF. jsdom's rAF is unthrottled and spins a busy loop that starves the
// event loop, hanging `userEvent` promises. Throttle to browser-like 16ms and
// unref so the loop can't pin the process after tests finish.
globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  const id = setTimeout(() => cb(performance.now()), 16);
  (id as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();
  return id as unknown as number;
}) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = ((id: number) =>
  clearTimeout(id)) as typeof cancelAnimationFrame;
});

afterEach(() => {
  server.resetHandlers();
  resetEmployeeStore();
  resetDeskStore();
  resetConversations();
  resetPresence();
  resetAdminStore();
  resetCategories();
  resetAgents();
  resetAdmins();
  setMockSession("employee");
});afterAll(() => server.close());
