import { describe, expect, it } from "vitest";

import { createCorporateSignatureInput } from "./corporate-signature.js";

const url = new URL(
  "https://api.monobank.ua/personal/statement/0/1554466347?extend=true",
);

describe("createCorporateSignatureInput", () => {
  it("signs the time and url without the request id", () => {
    const input = createCorporateSignatureInput(
      { requestId: "req-1", variant: "time-and-url" },
      "1554466347",
      url,
    );

    expect(input.payload).toBe(
      "1554466347/personal/statement/0/1554466347?extend=true",
    );
    expect(input.requestId).toBe("req-1");
    expect(input.url).toBe(url);
  });

  it("signs the time, request id, and url for delegated reads", () => {
    const input = createCorporateSignatureInput(
      { requestId: "req-1", variant: "time-request-id-and-url" },
      "1554466347",
      url,
    );

    expect(input.payload).toBe(
      "1554466347req-1/personal/statement/0/1554466347?extend=true",
    );
  });

  it("omits an absent request id rather than signing an empty one", () => {
    const input = createCorporateSignatureInput(
      { variant: "time-and-url" },
      "1554466347",
      new URL("https://api.monobank.ua/personal/auth/registration"),
    );

    expect(input).not.toHaveProperty("requestId");
    expect(input.payload).toBe("1554466347/personal/auth/registration");
  });
});
