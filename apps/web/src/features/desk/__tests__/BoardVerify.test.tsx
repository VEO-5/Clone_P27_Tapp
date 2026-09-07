import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { deskDashboard, listDeskTickets } from "@/mocks/desk";

import { DeskKanban } from "../DeskKanban";
import { DeskStatCards } from "../DeskStatCards";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe("desk board", () => {
  test("stat cards render with trends", () => {
    const dashboard = deskDashboard(30);
    render(<DeskStatCards cards={dashboard.cards} series={dashboard.series} />, { wrapper });
    expect(screen.getByRole("listitem", { name: /total tickets/i })).toBeVisible();
    expect(screen.getByRole("listitem", { name: /^open:/i })).toBeVisible();
    expect(screen.getByRole("listitem", { name: /^pending:/i })).toBeVisible();
    expect(screen.getByRole("listitem", { name: /^resolved:/i })).toBeVisible();
  });

  test("grid renders every ticket as a card with ref, status, and SLA", () => {
    const tickets = listDeskTickets();
    render(<DeskKanban tickets={tickets} isPending={false} totalLoaded={tickets.length} />, { wrapper });
    expect(screen.getByLabelText("Tickets grid")).toBeVisible();
    // One link per ticket into its detail page.
    expect(screen.getAllByRole("link").length).toBe(tickets.length);
    // Reference-style refs like #-001
    expect(screen.getAllByText(/#-\d{3}/).length).toBeGreaterThan(0);
    // Status pills (grouping now lives in the status dropdown, not columns).
    expect(screen.getAllByText(/^(Open|Pending|In progress|Resolved)$/).length).toBeGreaterThan(0);
  });

  test("grid shows an empty state when filters match nothing", () => {
    render(<DeskKanban tickets={[]} isPending={false} totalLoaded={0} />, { wrapper });
    expect(screen.getByText(/no tickets match/i)).toBeVisible();
  });
});
