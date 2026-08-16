/**
 * Converts an ASN.1 DER ECDSA P-256 signature into Web Crypto's P1363 form.
 * @param signature DER-encoded ECDSA signature bytes.
 * @returns A 64-byte `r || s` signature.
 */
export function convertDerEcdsaSignature(
  signature: Uint8Array<ArrayBuffer>,
): Uint8Array<ArrayBuffer> {
  if (
    signature.length < 8 ||
    signature[0] !== 0x30 ||
    signature[1] !== signature.length - 2 ||
    signature[2] !== 0x02
  ) {
    throw new RangeError("Invalid DER ECDSA signature");
  }

  const rLength = Number(signature[3]);
  const rStart = 4;
  const sTag = rStart + rLength;
  const sLength = signature[sTag + 1];
  const sStart = sTag + 2;

  if (
    rLength < 1 ||
    rLength > 33 ||
    signature[sTag] !== 0x02 ||
    sLength === undefined ||
    sLength < 1 ||
    sLength > 33 ||
    sStart + sLength !== signature.length
  ) {
    throw new RangeError("Invalid DER ECDSA signature");
  }

  const output = new Uint8Array(64);

  copyInteger(signature.subarray(rStart, sTag), output.subarray(0, 32));
  copyInteger(
    signature.subarray(sStart, sStart + sLength),
    output.subarray(32),
  );

  return output;
}

function copyInteger(source: Uint8Array, destination: Uint8Array): void {
  const first = Number(source[0]);
  if (
    first >= 0x80 ||
    (source.length === 33 && first !== 0) ||
    (source.length > 1 && first === 0 && Number(source[1]) < 0x80)
  ) {
    throw new RangeError("Invalid DER ECDSA integer");
  }

  const normalized = first === 0 ? source.subarray(1) : source;
  destination.set(normalized, destination.length - normalized.length);
}
