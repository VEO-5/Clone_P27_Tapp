import { randomInt } from "node:crypto";

/**
 * Human-friendly ticket references, e.g. `PRL-7K4M2X`.
 *
 * The alphabet omits O/0 and I/1 so an employee can read a reference off a
 * screen or read it out over the phone without ambiguity. 32^6 ≈ 1.07 billion
 * combinations, and creation additionally retries on the unique-index conflict.
 */
export const REFERENCE_PREFIX = "PRL";
export const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REFERENCE_LENGTH = 6;
export const REFERENCE_PATTERN = /^PRL-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export function generateReference(): string {
  let code = "";
  for (let i = 0; i < REFERENCE_LENGTH; i += 1) {
    code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }
  return `${REFERENCE_PREFIX}-${code}`;
}

/** Accepts `prl-7k4m2x`, `7K4M2X`, or a pasted reference with stray spaces. */
export function normaliseReference(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, "").replace(/^PRL-?/, "");
  return `${REFERENCE_PREFIX}-${cleaned}`;
}

export function isValidReference(input: string): boolean {
  return REFERENCE_PATTERN.test(normaliseReference(input));
}
