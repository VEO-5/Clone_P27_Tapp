import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { toast } from "sonner";

import { Toaster } from "@/components/shadcn/sonner";
import { renderWithProviders } from "@/test/render";

describe("Toast (FE-0.6)", () => {
  it("announces via the sonner live region", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <button type="button" onClick={() => toast.success("Assigned to you")}>
          Notify
        </button>
        <Toaster />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Notify" }));
    expect(await screen.findByText("Assigned to you")).toBeInTheDocument();
    // sonner renders an aria-live region for announcements
    expect(document.querySelector("[data-sonner-toaster]")).toBeInTheDocument();
  });
});
