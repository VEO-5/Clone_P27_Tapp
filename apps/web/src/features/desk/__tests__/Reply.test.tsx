import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Message, TicketEvent } from "@pearl27/contracts";

import { ConversationStream } from "@/features/desk/ConversationStream";
import { Composer } from "@/features/desk/Composer";
import { setMockSession } from "@/mocks/fixtures";
import { renderWithProviders } from "@/test/render";

const MESSAGES: Message[] = [
  { id: "m1", ticketId: "t", authorRole: "agent", text: "Looking into it now.", createdAt: "2026-09-03T10:00:00Z" },
  { id: "m2", ticketId: "t", authorRole: "employee", text: "Thanks, waiting.", createdAt: "2026-09-03T11:00:00Z" },
];
const EVENTS: TicketEvent[] = [
  { id: "e1", ticketId: "t", type: "status_changed", actor: "agent", message: "Kofi set In progress", createdAt: "2026-09-03T09:00:00Z" },
  { id: "e2", ticketId: "t", type: "internal_note", actor: "agent", message: "Check gateway logs", createdAt: "2026-09-03T09:30:00Z" },
];

describe("ConversationStream (FE-4.1)", () => {
  it("mixes messages, status events, and internal notes in time order", () => {
    renderWithProviders(<ConversationStream messages={MESSAGES} events={EVENTS} />);
    expect(screen.getByText("Looking into it now.")).toBeInTheDocument();
    expect(screen.getByText("Thanks, waiting.")).toBeInTheDocument();
    expect(screen.getByText(/kofi set in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/internal — not visible to the employee/i)).toBeInTheDocument();
    expect(screen.getByText("Check gateway logs")).toBeInTheDocument();
  });
});

function composer(props: Partial<Parameters<typeof Composer>[0]> = {}) {
  const onSent = vi.fn();
  const onConflict = vi.fn();
  const onLocked = vi.fn();
  renderWithProviders(
    <Composer ticketId="t-desk-1" version={2} willAutoClaim={false} onSent={onSent} onConflict={onConflict} onLocked={onLocked} {...props} />,
  );
  return { onSent, onConflict, onLocked };
}

describe("Composer", () => {
  it("FE-4.2: text only → Send message, Chat helper, { text, version } payload", async () => {
    setMockSession("agent");
    const spy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    const { onSent } = composer();
    await user.type(screen.getByLabelText(/message to the employee/i), "Restart your client please");
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
    expect(screen.getByText(/goes to the employee in google chat/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSent).toHaveBeenCalledOnce();
    const sendCall = spy.mock.calls.find(([url, init]) => String(url).includes("/send") && (init as RequestInit)?.method === "POST")!;
    const body = JSON.parse(String((sendCall[1] as RequestInit).body));
    expect(body).toMatchObject({ text: "Restart your client please", version: 2 });
    expect(body.status).toBeUndefined();
    spy.mockRestore();
  });

  it("FE-4.3: status only → Change status with timeline helper", async () => {
    setMockSession("agent");
    const spy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    composer();
    await user.selectOptions(screen.getByLabelText("Status"), "in_progress");
    expect(screen.getByRole("button", { name: "Change status" })).toBeInTheDocument();
    expect(screen.getByText(/timeline, google chat, and email/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change status" }));
    const sendCall = spy.mock.calls.find(([url, init]) => String(url).includes("/send") && (init as RequestInit)?.method === "POST")!;
    expect(JSON.parse(String((sendCall[1] as RequestInit).body))).toMatchObject({ status: "in_progress" });
    spy.mockRestore();
  });

  it("FE-4.4: text + Resolved → Send and change status with both", async () => {
    setMockSession("agent");
    const spy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    composer();
    await user.type(screen.getByLabelText(/message to the employee/i), "Fixed in the latest release");
    await user.selectOptions(screen.getByLabelText("Status"), "resolved");
    expect(screen.getByRole("button", { name: "Send and change status" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send and change status" }));
    const sendCall = spy.mock.calls.find(([url, init]) => String(url).includes("/send") && (init as RequestInit)?.method === "POST")!;
    expect(JSON.parse(String((sendCall[1] as RequestInit).body))).toMatchObject({ text: "Fixed in the latest release", status: "resolved" });
    spy.mockRestore();
  });

  it("FE-4.5: internal note disables status and sends { text, internal: true }", async () => {
    setMockSession("agent");
    const spy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    composer();
    await user.click(screen.getByLabelText(/internal note/i));
    expect(screen.getByLabelText("Status")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add note" })).toBeInTheDocument();
    expect(screen.getByText(/visible to agents only/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/message to the employee/i), "Waiting on IT security");
    await user.click(screen.getByRole("button", { name: "Add note" }));
    const sendCall = spy.mock.calls.find(([url, init]) => String(url).includes("/send") && (init as RequestInit)?.method === "POST")!;
    expect(JSON.parse(String((sendCall[1] as RequestInit).body))).toMatchObject({ text: "Waiting on IT security", internal: true });
    spy.mockRestore();
  });

  it("FE-4.6: version conflict keeps the draft and reports it", async () => {
    setMockSession("agent");
    const user = userEvent.setup();
    const { onConflict } = composer({ version: 0 });
    await user.type(screen.getByLabelText(/message to the employee/i), "My important draft");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onConflict).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/message to the employee/i)).toHaveValue("My important draft");
  });

  it("FE-4.7: locked ticket reports the owner", async () => {
    setMockSession("agent");
    const user = userEvent.setup();
    // t-desk-7 is locked to Ada Osei; store version is 2.
    const { onLocked } = composer({ ticketId: "t-desk-7", version: 2 });
    await user.type(screen.getByLabelText(/message to the employee/i), "Hello?");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onLocked).toHaveBeenCalledWith("Ada Osei");
  });

  it("FE-4.15: Ctrl+Enter sends", async () => {
    setMockSession("agent");
    const user = userEvent.setup();
    const { onSent } = composer();
    await user.type(screen.getByLabelText(/message to the employee/i), "Quick reply");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSent).toHaveBeenCalledOnce();
  });

  it("FE-4.18: Pending is disabled with a system tooltip", async () => {
    setMockSession("agent");
    renderWithProviders(
      <Composer ticketId="t-desk-1" version={2} willAutoClaim={false} onSent={vi.fn()} onConflict={vi.fn()} onLocked={vi.fn()} />,
    );
    const pending = screen.getByRole("option", { name: /pending/i });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("title", "Set by the system");
  });
});
