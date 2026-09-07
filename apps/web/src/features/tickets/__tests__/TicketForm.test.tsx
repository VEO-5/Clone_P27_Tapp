import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TicketForm } from "@/features/tickets/TicketForm";
import { renderWithProviders } from "@/test/render";

function png(name: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

describe("TicketForm", () => {
  it("FE-2.1: empty submit shows errors, focuses title, sends no request", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderWithProviders(<TicketForm />);
    await user.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(await screen.findByText(/at least 5 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issue title/i)).toHaveFocus();
    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("/tickets"), expect.anything());
    spy.mockRestore();
  });

  it("FE-2.2: short title and description show the contract messages", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TicketForm />);
    await user.type(screen.getByLabelText(/issue title/i), "abcd");
    await user.type(screen.getByLabelText(/describe the issue/i), "only nineteen chars");
    await user.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(await screen.findByText(/at least 5 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/at least 20 characters/i)).toBeInTheDocument();
  });

  it("FE-2.3: oversized PNG and .exe rejected inline, valid file retained", async () => {
    renderWithProviders(<TicketForm />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const big = png("big.png", 7 * 1024 * 1024);
    const exe = new File(["x"], "run.exe", { type: "application/x-msdownload" });
    const good = png("good.png");
    fireEvent.change(input, { target: { files: [big, exe, good] } });
    expect(await screen.findByText(/too large|limit is 5/i)).toBeInTheDocument();
    expect(await screen.findByText(/only PNG/i)).toBeInTheDocument();
    expect(screen.getByText("good.png")).toBeInTheDocument();
  });

  it("FE-2.4: sixth file rejected with the count message", async () => {
    renderWithProviders(<TicketForm />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [png("a.png"), png("b.png"), png("c.png"), png("d.png"), png("e.png"), png("f.png")] },
    });
    expect(await screen.findByText(/at most 5 files|up to 5 files/i)).toBeInTheDocument();
    expect(screen.queryByText("f.png")).not.toBeInTheDocument();
  });

  it("FE-2.5: drag-and-drop highlights the zone and adds the file", async () => {
    renderWithProviders(<TicketForm />);
    const zone = screen.getByRole("button", { name: /attach screenshots or files/i });
    fireEvent.dragOver(zone);
    expect(zone.className).toMatch(/iris/);
    fireEvent.drop(zone, { dataTransfer: { files: [png("drop.png")] } });
    expect(await screen.findByText("drop.png")).toBeInTheDocument();
  });

  it("FE-2.8: double submit sends a single POST", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderWithProviders(<TicketForm />);
    await user.type(screen.getByLabelText(/issue title/i), "VPN keeps dropping every day");
    await user.type(
      screen.getByLabelText(/describe the issue/i),
      "The VPN drops every twenty minutes since the client update yesterday.",
    );
    await user.selectOptions(screen.getByLabelText(/what does this relate to/i), "network");
    const button = screen.getByRole("button", { name: /submit ticket/i });
    await user.click(button);
    await user.click(button);
    await screen.findByText(/your ticket is with system support/i);
    const posts = spy.mock.calls.filter(
      ([url, init]) => String(url).endsWith("/tickets") && (init as RequestInit)?.method === "POST",
    );
    expect(posts).toHaveLength(1);
    spy.mockRestore();
  });
});
