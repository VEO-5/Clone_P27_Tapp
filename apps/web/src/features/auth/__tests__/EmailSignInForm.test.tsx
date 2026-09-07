import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "@/test/render";
import { resetAdmins, resetAgents, setMockSession } from "@/mocks/fixtures";

import { EmailSignInForm } from "../EmailSignInForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

describe("EmailSignInForm", () => {
  beforeEach(() => {
    push.mockClear();
    resetAgents();
    resetAdmins();
    setMockSession(null);
  });

  it("empty submit shows an inline error and creates no session", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailSignInForm />);
    await user.click(screen.getByRole("button", { name: /continue with email/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/work email/i);
    expect(push).not.toHaveBeenCalled();
  });

  it("foreign addresses are rejected with an inline error", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailSignInForm />);
    await user.type(screen.getByLabelText(/work email/i), "ada@gmail.com");
    await user.click(screen.getByRole("button", { name: /continue with email/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/pearl27\.com/i);
    expect(push).not.toHaveBeenCalled();
  });

  it("a new company address signs in as an employee on /tickets", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailSignInForm />);
    await user.type(screen.getByLabelText(/work email/i), "newhire@pearl27.com");
    await user.click(screen.getByRole("button", { name: /continue with email/i }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/tickets"));
  });
});
