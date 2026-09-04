import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { resetConversations, resetPresence } from "@/mocks/conversations";
import { resetDeskStore } from "@/mocks/desk";
import { resetEmployeeStore } from "@/mocks/employee";
import { resetAgents, setMockSession } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
  // jsdom has no blob URLs — UploadZone previews need the stub.
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => "blob:mock") as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
  }
});
afterEach(() => {
  server.resetHandlers();
  resetEmployeeStore();
  resetDeskStore();
  resetConversations();
  resetPresence();
  resetAgents();
  setMockSession("employee");
});afterAll(() => server.close());
