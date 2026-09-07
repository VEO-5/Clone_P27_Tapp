import { beforeEach, describe, expect, it } from "vitest";

import {
  addAgent,
  deactivateAdmin,
  deactivateAgent,
  getMockProfile,
  lookupMockIdentity,
  mockAdmins,
  mockAgents,
  resetAdmins,
  resetAgents,
  setMockSession,
  setMockSessionIdentity,
} from "@/mocks/fixtures";

// Email identity: invite-only elevation, demote-don't-exile, signed-out default.

describe("lookupMockIdentity", () => {
  beforeEach(() => {
    resetAgents();
    resetAdmins();
  });

  it("resolves named seeds to their roles", () => {
    expect(lookupMockIdentity("ada@pearl27.com")).toMatchObject({ role: "employee", demoted: false });
    expect(lookupMockIdentity("kofi@pearl27.com")).toMatchObject({ role: "agent", demoted: false });
    expect(lookupMockIdentity("admin@pearl27.com")).toMatchObject({ role: "admin", demoted: false });
  });

  it("normalizes case and whitespace", () => {
    expect(lookupMockIdentity("  Ada@Pearl27.com ")).toMatchObject({
      email: "ada@pearl27.com",
      role: "employee",
    });
  });

  it("rejects malformed and foreign addresses", () => {
    expect(lookupMockIdentity("godstime@")).toBeNull();
    expect(lookupMockIdentity("not-an-email")).toBeNull();
    expect(lookupMockIdentity("")).toBeNull();
    expect(lookupMockIdentity("ada@gmail.com")).toBeNull();
  });

  it("signs unknown company addresses in as employees (no account needed)", () => {
    expect(lookupMockIdentity("newhire@pearl27.com")).toMatchObject({
      email: "newhire@pearl27.com",
      role: "employee",
      demoted: false,
    });
  });

  it("invited agents resolve to agent (invite → sign-in loop)", () => {
    const agent = addAgent("future.agent@pearl27.com");
    expect(agent.status).toBe("invited");
    expect(lookupMockIdentity("future.agent@pearl27.com")).toMatchObject({
      role: "agent",
      demoted: false,
    });
  });

  it("deactivated accounts fall back to employee with demoted flag", () => {
    const agent = addAgent("doomed@pearl27.com");
    deactivateAgent(agent.id);
    expect(lookupMockIdentity("doomed@pearl27.com")).toMatchObject({
      role: "employee",
      demoted: true,
    });
    const admin = mockAdmins[1]!;
    deactivateAdmin(admin.id);
    expect(lookupMockIdentity(admin.email)).toMatchObject({ role: "employee", demoted: true });
  });
});

describe("getMockProfile", () => {
  beforeEach(() => {
    resetAgents();
    resetAdmins();
    setMockSession(null);
  });

  it("is signed out by default (no zombie sessions)", () => {
    expect(getMockProfile()).toBeNull();
  });

  it("demotes live when deactivation lands mid-session", () => {
    setMockSessionIdentity({ role: "agent", email: "agent1@pearl27.com", name: "Agent 1" });
    expect(getMockProfile()).toMatchObject({ role: "agent" });
    const record = mockAgents.find((a) => a.email === "agent1@pearl27.com")!;
    deactivateAgent(record.id);
    expect(getMockProfile()).toMatchObject({ role: "employee", demoted: true });
  });

  it("keeps stable seed ids for the demo accounts", () => {
    setMockSession("employee");
    expect(getMockProfile()).toMatchObject({ id: "u-employee-1", email: "ada@pearl27.com" });
    setMockSession(null);
    expect(getMockProfile()).toBeNull();
  });
});
