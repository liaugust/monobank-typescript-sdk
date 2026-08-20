import { describe, expect, it } from "vitest";

import { decodeBase64 } from "./decode-base64.js";

describe("decodeBase64", () => {
  it("decodes standard base64 with padding", () => {
    expect(decodeBase64("aGVsbG8=")).toEqual(
      Uint8Array.from([104, 101, 108, 108, 111]),
    );
  });

  it("decodes an empty string to an empty buffer", () => {
    expect(decodeBase64("")).toEqual(new Uint8Array(0));
  });

  it("decodes bytes containing the + and / standard-alphabet characters", () => {
    expect(decodeBase64("Pj8+")).toEqual(Uint8Array.from([62, 63, 62]));
  });

  it("throws on base64url input using - and _ instead of + and /", () => {
    expect(() => decodeBase64("Pj8-")).toThrow();
  });
});
