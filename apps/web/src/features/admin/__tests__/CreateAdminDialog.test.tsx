import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreateAdminDialog } from "@/features/admin/CreateAdminDialog";
import { setMockSession } from "@/mocks/fixtures";
import { renderWithProviders } from "@/test/render";

describe("CreateAdminDialog", () => {
  it("non-pearl27 address is rejected inline before any request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<CreateAdminDialog onCreated={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Create admin" }));
    await user.type(screen.getByLabelText("Work email"), "someone@gmail.com");
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/pearl27\.com/);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("pearl27 address sends POST and the row appears as Invited", async () => {
    setMockSession("admin");
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(<CreateAdminDialog onCreated={onCreated} />);
    await user.click(screen.getByRole("button", { name: "Create admin" }));
    await user.type(screen.getByLabelText("Work email"), "ama@pearl27.com");
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(onCreated).toHaveBeenCalledOnce();
    expect(onCreated.mock.calls[0]?.[0]).toMatchObject({ email: "ama@pearl27.com", status: "invited" });
  });
});
