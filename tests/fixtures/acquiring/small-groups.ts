export const monopaySigningKeyListFixture = {
  result: [
    {
      expiresAt: "2026-02-02T15:04:05+03:00",
      keyId: "28F91hHGtzoSFJ",
      keyName: "my_key",
      keyValue: "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0K",
    },
  ],
} as const;

export const importedMonopaySigningKeyFixture = {
  result: {
    keyId: "28F91hHGtzoSFJ",
  },
} as const;

export const acquiringT2pTerminalListFixture = {
  list: [
    {
      code: "56f27a30b94c4e8db5c3912e7d6af8b1",
      name: "Cats n Cash inc.",
      terminal: "MT500001",
    },
  ],
} as const;

export const acquiringT2pPaymentFixture = {
  amount: 3_500,
  approvalCode: "125261",
  bank: "AT Universal Bank",
  cardMask: "visa",
  ccy: "UAH",
  countryCard: "804",
  dataTime: "2026-04-21 23:01:54",
  errorMessage: null,
  externalPaymentId: "18247112-4eac-4465-aa3c-c42c18f601eb",
  internalPaymentId: "f2224275-ba0a-4f58-b6f7-bd00df63b01c",
  maskedPan: "44179274******76",
  paymentType: "purchase",
  responseCode: "1",
  rrn: "448571901425",
  status: "success",
  terminal: "MT507582",
  transactionId: "23417832268",
} as const;

export const acquiringSplitReceiverListFixture = {
  list: [
    {
      edrpou: "1234567890",
      name: "FOP Ivanov Ivan Ivanovych",
      splitReceiverId: "sr_aB3dC5eF7g",
    },
  ],
} as const;

export const acquiringPosCancellationFixture = {
  status: "ok",
  tranId: "acq123456789",
} as const;
