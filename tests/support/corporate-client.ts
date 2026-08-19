import { MonobankCorporateClient } from "../../src/corporate/client/monobank-corporate-client.js";
import type { CorporateSigner } from "../../src/transport/corporate-signer.js";
import type { FetchLike } from "../../src/transport/fetch-like.js";

const corporateTestKeyId = "corporate-key-id";

export function createCorporateTestClient(
  fetch: FetchLike,
  sign: CorporateSigner = () => "c2ln",
): MonobankCorporateClient {
  return new MonobankCorporateClient({
    fetch,
    keyId: corporateTestKeyId,
    sign,
  });
}
