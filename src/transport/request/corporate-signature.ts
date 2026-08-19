import type { CorporateSignatureInput } from "../corporate-signer.js";

/**
 * Signed-payload composition an endpoint uses.
 *
 * Monobank documents two, and they do not follow from the headers sent:
 * `/personal/corp/settings` and `/personal/corp/webhook` send `X-Request-Id`
 * while signing the variant that excludes it, so each operation states its own.
 */
export type CorporateSignatureSpec =
  | {
      /**
       * Marks the two registration endpoints, which sign before Monobank has
       * issued a key: `X-Key-Id` is not sent and no configured `keyId` is
       * required. No request identifier may accompany it, because neither
       * registration endpoint sends one.
       */
      readonly preRegistration: true;
      readonly requestId?: never;
      readonly variant: "time-and-url";
    }
  | {
      readonly preRegistration?: never;
      readonly requestId: string;
      readonly variant: "time-request-id-and-url";
    }
  | {
      readonly preRegistration?: never;
      readonly requestId?: string;
      readonly variant: "time-and-url";
    };

/**
 * Builds the signing input for one Corporate request attempt.
 * @param spec Payload variant and request identifier the endpoint documents.
 * @param time Current UTC time in whole seconds as a decimal string.
 * @param url Absolute request URL.
 * @returns Payload to sign together with the components it was built from.
 */
export function createCorporateSignatureInput(
  spec: CorporateSignatureSpec,
  time: string,
  url: URL,
): CorporateSignatureInput {
  const target = `${url.pathname}${url.search}`;
  const payload =
    spec.variant === "time-request-id-and-url"
      ? `${time}${spec.requestId}${target}`
      : `${time}${target}`;

  return {
    payload,
    ...(spec.requestId === undefined ? {} : { requestId: spec.requestId }),
    time,
    url,
  };
}
