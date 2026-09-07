import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearMockJournal,
  lookupMockIdentity,
  readMockJournal,
  recordMockDirectory,
  resetAdmins,
  resetAgents,
  restoreMockDirectory,
} from "@/mocks/fixtures";

describe("mock directory journal (invite persistence)", () => {
  beforeEach(() => {
    resetAgents();
    resetAdmins();
    clearMockJournal();
  });

  afterEach(() => {
    clearMockJournal();
    resetAgents();
    resetAdmins();
  });

  it("round-trips invites through localStorage, last write wins", () => {
    expect(readMockJournal()).toEqual([]);
    recordMockDirectory({ role: "agent", email: "Newcomer@pearl27.com", status: "invited" });
    expect(readMockJournal()).toEqual([
      { role: "agent", email: "newcomer@pearl27.com", status: "invited" },
    ]);
    recordMockDirectory({ role: "agent", email: "newcomer@pearl27.com", status: "deactivated" });
    const journal = readMockJournal();
    expect(journal).toHaveLength(2);
    expect(journal[1]).toMatchObject({ status: "deactivated" });
  });

  it("ignores non-company addresses and garbage payloads", () => {
    recordMockDirectory({ role: "agent", email: "someone@gmail.com", status: "invited" });
    localStorage.setItem("p27_mock_directory_v1", JSON.stringify([{ nope: true }, null, "x"]));
    expect(readMockJournal()).toEqual([]);
  });

  it("restore re-creates the invite so lookup grants the desk role", () => {
    expect(lookupMockIdentity("newcomer@pearl27.com")?.role).toBe("employee");
    const applied = restoreMockDirectory(readMockJournal());
    expect(applied).toEqual({ agents: 0, admins: 0 });
    recordMockDirectory({ role: "agent", email: "newcomer@pearl27.com", status: "invited" });
    // Simulate a worker restart wiping the stores.
    resetAgents();
    expect(lookupMockIdentity("newcomer@pearl27.com")?.role).toBe("employee");
    const replayed = restoreMockDirectory(readMockJournal());
    expect(replayed).toEqual({ agents: 1, admins: 0 });
    expect(lookupMockIdentity("newcomer@pearl27.com")).toMatchObject({ role: "agent" });
  });

  it("restore honors deactivation (last wins) so refresh can't resurrect", () => {
    recordMockDirectory({ role: "agent", email: "newcomer@pearl27.com", status: "invited" });
    recordMockDirectory({ role: "agent", email: "newcomer@pearl27.com", status: "deactivated" });
    resetAgents();
    restoreMockDirectory(readMockJournal());
    expect(lookupMockIdentity("newcomer@pearl27.com")).toMatchObject({ role: "employee", demoted: true });
  });

  it("restore covers admin grants too", () => {
    recordMockDirectory({ role: "admin", email: "boss@pearl27.com", status: "invited" });
    resetAdmins();
    const replayed = restoreMockDirectory(readMockJournal());
    expect(replayed).toEqual({ agents: 0, admins: 1 });
    expect(lookupMockIdentity("boss@pearl27.com")).toMatchObject({ role: "admin" });
  });
});
