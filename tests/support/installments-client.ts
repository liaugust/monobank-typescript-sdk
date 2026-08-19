import { MonobankInstallmentsClient } from "../../src/installments/client/monobank-installments-client.js";
import type { FetchLike } from "../../src/transport/fetch-like.js";

export const installmentsTestStoreSecret = "secret_98765432--123-123";

export function createInstallmentsTestClient(
  fetch: FetchLike,
): MonobankInstallmentsClient {
  return new MonobankInstallmentsClient({
    fetch,
    storeId: "test_store_with_confirm",
    storeSecret: installmentsTestStoreSecret,
  });
}
