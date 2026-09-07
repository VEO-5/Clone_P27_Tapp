import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Ticket } from "@pearl27/contracts";

import { CsatPrompt } from "@/features/tickets/CsatPrompt";
import { renderWithProviders } from "@/test/render";

const ticket = {
  id: "t-100004",
  reference: "PRL-100004",
  title: "New laptop keyboard repeats keys",
  description: "Keys repeat on the new laptop.",
  categoryId: "hardware",
  status: "resolved",
  priority: "low",
  requesterId: "u-ada",
  version: 1,
  createdAt: "2026-09-06T12:00:00Z",
  updatedAt: "2026-09-06T12:00:00Z",
} as Ticket;

describe("CsatPrompt thanks state", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps Thanks visible before notifying the parent", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/csat")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });
    const onRated = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<CsatPrompt ticket={ticket} onRated={onRated} />);

    await user.click(screen.getByRole("radio", { name: /5 out of 5/i }));
    await user.click(screen.getByRole("button", { name: /send rating/i }));

    // Thanks paints immediately; the parent is only notified after a delay
    // so the confirmation is actually seen instead of flashing away.
    expect(await screen.findByText(/thanks for rating PRL-100004/i)).toBeInTheDocument();
    expect(onRated).not.toHaveBeenCalled();

    await vi.waitFor(() => expect(onRated).toHaveBeenCalledTimes(1), { timeout: 5000 });
  });
});
