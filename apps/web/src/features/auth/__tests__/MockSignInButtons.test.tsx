import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { MockSignInButtons } from "@/features/auth/MockSignInButtons";
import { SESSION_COOKIE } from "@/lib/auth";
import { renderWithProviders } from "@/test/render";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("MockSignInButtons", () => {
  it("sets the session cookie and navigates to the role landing", async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const user = userEvent.setup();
    renderWithProviders(<MockSignInButtons next="/" />);
    await user.click(screen.getByRole("button", { name: /continue as ada obi/i }));
    expect(document.cookie).toContain(`${SESSION_COOKIE}=mock-employee`);
    expect(push).toHaveBeenCalledWith("/tickets");
  });

  it("respects ?next= when it points at the role area", async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const user = userEvent.setup();
    renderWithProviders(<MockSignInButtons next="/tickets/PRL-100001" />);
    await user.click(screen.getByRole("button", { name: /continue as ada obi/i }));
    expect(push).toHaveBeenCalledWith("/tickets/PRL-100001");
  });
});
