import { describe, expect, it } from "vitest";

import { convertDerEcdsaSignature } from "./der-ecdsa-signature.js";

describe("convertDerEcdsaSignature", () => {
  it.each([
    new Uint8Array([0x30, 0x06, 0x02, 0x00, 0x02, 0x02, 0x01, 0x01]),
    derSignature(new Uint8Array(34).fill(1), new Uint8Array([1])),
    new Uint8Array([0x30, 0x06, 0x02, 0x02, 1, 1, 0x03, 0x00]),
    new Uint8Array([0x30, 0x06, 0x02, 0x03, 1, 1, 1, 0x02]),
    derSignature(new Uint8Array([1, 1]), new Uint8Array()),
    derSignature(new Uint8Array([1]), new Uint8Array(34).fill(1)),
    new Uint8Array([0x30, 0x07, 0x02, 0x01, 1, 0x02, 0x01, 1, 1]),
  ])("rejects invalid DER sequence structure", (signature) => {
    expect(() => convertDerEcdsaSignature(signature)).toThrow(RangeError);
  });

  it.each([
    derSignature(new Uint8Array([0x80]), new Uint8Array([1])),
    derSignature(new Uint8Array(33).fill(1), new Uint8Array([1])),
    derSignature(new Uint8Array([0, 0x7f]), new Uint8Array([1])),
  ])("rejects invalid DER integer encodings", (signature) => {
    expect(() => convertDerEcdsaSignature(signature)).toThrow(RangeError);
  });
});

function derSignature(r: Uint8Array, s: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([
    0x30,
    r.length + s.length + 4,
    0x02,
    r.length,
    ...r,
    0x02,
    s.length,
    ...s,
  ]);
}
