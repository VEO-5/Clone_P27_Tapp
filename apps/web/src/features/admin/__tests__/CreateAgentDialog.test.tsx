import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreateAgentDialog } from "@/features/admin/CreateAgentDialog";
import { renderWithProviders } from "@/test/render";

describe("CreateAgentDialog", () => {
  it("FE-1.5: non-pearl27 address is rejected inline before any request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<CreateAgentDialog onCreated={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Create agent" }));
    await user.type(screen.getByLabelText("Work email"), "someone@gmail.com");
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/pearl27\.com/);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("FE-1.6: pearl27 address sends POST and the row appears as Invited", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(<CreateAgentDialog onCreated={onCreated} />);
    await user.click(screen.getByRole("button", { name: "Create agent" }));
    await user.type(screen.getByLabelText("Work email"), "ada@pearl27.com");
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(onCreated).toHaveBeenCalledOnce();
    expect(onCreated.mock.calls[0]?.[0]).toMatchObject({ email: "ada@pearl27.com", status: "invited" });
  });
});
