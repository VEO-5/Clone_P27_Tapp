import { describe, expect, it } from "vitest";

import {
  COMPRESS_LONG_EDGE,
  compressTarget,
  isCompressibleImage,
  markCompressed,
  wasCompressed,
} from "./image-compress";

describe("isCompressibleImage", () => {
  it("accepts still rasters", () => {
    expect(isCompressibleImage({ type: "image/jpeg" })).toBe(true);
    expect(isCompressibleImage({ type: "image/png" })).toBe(true);
    expect(isCompressibleImage({ type: "image/webp" })).toBe(true);
  });

  it("passes through animation, documents, and unknowns", () => {
    expect(isCompressibleImage({ type: "image/gif" })).toBe(false);
    expect(isCompressibleImage({ type: "application/pdf" })).toBe(false);
    expect(isCompressibleImage({ type: "text/plain" })).toBe(false);
    expect(isCompressibleImage({ type: "" })).toBe(false);
  });
});

describe("compressed tracking", () => {
  it("starts unmarked and marks without leaking across files", () => {
    const a = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const b = new File(["x"], "b.jpg", { type: "image/jpeg" });
    expect(wasCompressed(a)).toBe(false);
    markCompressed(a);
    expect(wasCompressed(a)).toBe(true);
    expect(wasCompressed(b)).toBe(false);
  });
});
describe("compressTarget", () => {
  it("leaves small images untouched", () => {
    expect(compressTarget(800, 600)).toEqual({ width: 800, height: 600 });
    expect(compressTarget(COMPRESS_LONG_EDGE, 100)).toEqual({ width: COMPRESS_LONG_EDGE, height: 100 });
  });

  it("shrinks the long edge to the cap, preserving aspect", () => {
    // The 5K wallpaper from the field report: 5356x3263.
    const target = compressTarget(5356, 3263);
    expect(target.width).toBe(COMPRESS_LONG_EDGE);
    expect(target.height).toBe(Math.round((3263 * COMPRESS_LONG_EDGE) / 5356));
  });

  it("handles portrait orientation", () => {
    const target = compressTarget(1000, 4000);
    expect(target.height).toBe(COMPRESS_LONG_EDGE);
    expect(target.width).toBe(Math.round((1000 * COMPRESS_LONG_EDGE) / 4000));
  });

  it("rejects garbage dimensions", () => {
    expect(compressTarget(0, 100)).toEqual({ width: 0, height: 0 });
    expect(compressTarget(NaN, 100)).toEqual({ width: 0, height: 0 });
  });
});
