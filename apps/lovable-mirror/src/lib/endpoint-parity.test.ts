import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(HERE, "..", "..");
const SRC_ROOT = join(APP_ROOT, "src");
const API_SOURCE = readFileSync(join(APP_ROOT, "..", "..", "functions", "api.ts"), "utf8");

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Route patterns the live Edge Function actually serves. */
function liveRouteMatchers(): RegExp[] {
  const matchers: RegExp[] = [];
  for (const m of API_SOURCE.matchAll(/path === "([^"]+)"/g)) {
    matchers.push(new RegExp(`^${escapeRegExp(m[1])}$`));
  }
  for (const m of API_SOURCE.matchAll(/path\.match\((\/\^.*?\/)\)/g)) {
    matchers.push(new RegExp(m[1].slice(1, -1)));
  }
  return matchers;
}

/**
 * Mock-only endpoints: implemented by MSW, never called in live mode by
 * design. Each entry needs its reason — add to this map, never silently.
 */
const MOCK_ONLY: { pattern: RegExp; reason: string }[] = [
  {
    // useSignOut calls this only when !insforgeLive; live sign-out is SDK-side.
    pattern: /^\/auth\/logout$/,
    reason: "mock-only by design: live sign-out is insforge.auth.signOut(), no server route",
  },
];

/**
 * Raw fetch() calls outside the apiFetch/liveFetch contract. No envelope
 * parsing, no parity safety — each needs its reason. New entries fail the
 * suite until they are either routed through apiFetch or justified here.
 */
const RAW_FETCH_ALLOWLIST: { pattern: RegExp; reason: string }[] = [
  {
    // Fire-and-forget heartbeat; viewing presence needs the SSE stream below.
    pattern: /^\/desk\/tickets\/[^/]+\/presence$/,
    reason: "no live realtime yet: heartbeat is a silent no-op live until /desk/events exists",
  },
  {
    pattern: /^\/desk\/events$/,
    reason: "no live realtime yet: desk SSE stream is mock-only, needs a realtime design",
  },
  {
    // CSV blob download — apiFetch only parses JSON envelopes.
    pattern: /^\/admin\/export$/,
    reason: "blob download: raw fetch reads the CSV body that apiFetch cannot parse",
  },
];

/** Mock infrastructure: these files ARE the mock server, not app callers. */
function isMockInfra(file: string): boolean {
  return file.includes("/mocks/") || file.endsWith("/mockSession.ts");
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

interface EndpointUse {
  endpoint: string;
  file: string;
}

function displayPath(file: string): string {
  return file.slice(SRC_ROOT.length + 1).replace(/\\/g, "/");
}

/**
 * Cut query-building expressions: keep simple ${ident} holes, drop the
 * rest (e.g. `${query}${query.includes("?") ? ...}` → `/desk/tickets${query}`).
 */
function normalizeEndpoint(literal: string): string {
  const cut = literal.search(/\$\{(?![A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\})/);
  return (cut >= 0 ? literal.slice(0, cut) : literal).split("?")[0];
}

/** Every apiFetch/liveFetch first-arg string literal starting with "/". */
function contractEndpoints(): EndpointUse[] {
  const uses: EndpointUse[] = [];
  const callPattern = /(?:apiFetch|liveFetch)(?:<[^>]*>)?\(\s*([`'"])((?:(?!\1)[\s\S])*)\1/g;
  for (const file of sourceFiles(SRC_ROOT)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(callPattern)) {
      if (!m[2].startsWith("/")) continue;
      uses.push({ endpoint: normalizeEndpoint(m[2]), file: displayPath(file) });
    }
  }
  return uses;
}

/** Raw fetch() literals containing an API path (bypasses the contract). */
function rawFetchEndpoints(): EndpointUse[] {
  const uses: EndpointUse[] = [];
  const fetchPattern = /(?<![A-Za-z_$])fetch\(\s*([`'"])((?:(?!\1)[\s\S])*)\1/g;
  const pathPattern = /\/(?:desk|tickets|attachments|admin|auth)\/[^\s`'"]*/;
  for (const file of sourceFiles(SRC_ROOT)) {
    if (isMockInfra(displayPath(file))) continue;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(fetchPattern)) {
      const hit = m[2].match(pathPattern);
      if (hit) uses.push({ endpoint: normalizeEndpoint(hit[0]), file: displayPath(file) });
    }
  }
  return uses;
}

/**
 * A frontend path is covered when some substitution of its ${ident} holes
 * (empty for query-string holes, "x…" for path segments) hits a live route.
 */
function isCovered(endpoint: string, matchers: RegExp[]): boolean {
  const holes = endpoint.match(/\$\{[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\}/g) ?? [];
  void holes;
  const samples = new Set<string>();
  for (const fill of ["", "x", "x/y", "x/y/z"]) {
    samples.add(endpoint.replace(/\$\{[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\}/g, fill));
  }
  samples.add(endpoint.replace(/\$\{[^}]*\}/g, "x"));
  return [...samples].some((sample) => matchers.some((route) => route.test(sample)));
}

function isAllowed(endpoint: string, allowlist: { pattern: RegExp; reason: string }[]): boolean {
  const sample = endpoint.replace(/\$\{[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\}/g, "x");
  return allowlist.some(({ pattern }) => pattern.test(sample));
}

describe("endpoint parity: every frontend call exists on the live backend", () => {
  const matchers = liveRouteMatchers();
  const contract = contractEndpoints();
  const raw = rawFetchEndpoints();

  it("extracts a non-empty inventory on both sides", () => {
    expect(matchers.length).toBeGreaterThan(10);
    expect(contract.length).toBeGreaterThan(10);
  });

  it("covers every apiFetch/liveFetch path", () => {
    const missing = contract.filter(
      ({ endpoint }) => !isCovered(endpoint, matchers) && !isAllowed(endpoint, MOCK_ONLY),
    );
    expect(
      missing.map(({ endpoint, file }) => `${endpoint} (${file})`),
      "frontend calls with no live backend route — uploads 404'd this way",
    ).toEqual([]);
  });

  it("justifies every raw fetch() outside the contract", () => {
    const unjustified = raw.filter(({ endpoint }) => !isAllowed(endpoint, RAW_FETCH_ALLOWLIST));
    expect(
      unjustified.map(({ endpoint, file }) => `${endpoint} (${file})`),
      "raw fetch() with no documented reason — route it through apiFetch or justify it",
    ).toEqual([]);
  });

  // The exact regression that stranded uploads with "Unknown endpoint.":
  // these three must always resolve against the live route table.
  it.each(["/tickets/x/attachments/presign", "/tickets/x/attachments/y/complete", "/attachments/y/url"])(
    "serves %s",
    (sample) => {
      expect(matchers.some((route) => route.test(sample))).toBe(true);
    },
  );
});
