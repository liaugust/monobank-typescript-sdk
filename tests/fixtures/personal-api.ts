export const currencyRateFixture = {
  currencyCodeA: 840,
  currencyCodeB: 980,
  date: 1_552_392_228,
  rateBuy: 27.2,
  rateSell: 27,
} as const;

export const bankSyncFixture = {
  serverKeyId: "2626ff34473bb66260b930af946fa9641a06bcd4",
  serverPubKey:
    "BNDZP+AGoRC+ER1plDSUCHOw2/aBNIocmD2gS/v34/b0iQ1HBo+oS3/f402e3OXA5uCxakSjuxGMP6X0XP9VIUk=",
  serverTimeMsec: 1_755_509_467_397,
} as const;

export const clientInfoFixture = {
  accounts: [
    {
      balance: 10_000_000,
      cashbackType: "UAH",
      creditLimit: 10_000_000,
      currencyCode: 980,
      iban: "UA733220010000026201234567890",
      id: "account-id",
      maskedPan: ["537541******1234"],
      sendId: "send-id",
      type: "black",
    },
  ],
  clientId: "client-id",
  jars: [
    {
      balance: 1_000_000,
      currencyCode: 980,
      description: "Redacted goal",
      goal: 10_000_000,
      id: "jar-id",
      sendId: "jar-send-id",
      title: "Redacted jar",
    },
  ],
  managedClients: [
    {
      accounts: [
        {
          balance: 10_000_000,
          creditLimit: 0,
          currencyCode: 980,
          iban: "UA733220010000026201234567891",
          id: "managed-account-id",
          type: "fop",
        },
      ],
      clientId: "managed-client-id",
      name: "Redacted Person",
      tin: 1_234_567_890,
    },
  ],
  name: "Redacted Person",
  permissions: "psfj",
  webHookUrl: "https://example.test/mono-hook",
} as const;

export const statementItemFixture = {
  amount: -12_345,
  balance: 9_987_655,
  cashbackAmount: 123,
  comment: "Redacted lunch",
  commissionRate: 0,
  counterEdrpou: "12345678",
  counterIban: "UA213220010000026007233566001",
  counterName: "Redacted Merchant",
  currencyCode: 980,
  description: "Redacted card payment",
  hold: false,
  id: "statement-item-id",
  invoiceId: "invoice-id",
  mcc: 5812,
  operationAmount: -12_345,
  originalMcc: 5812,
  receiptId: "receipt-id",
  time: 1_785_542_400,
} as const;

export const personalWebhookEventFixture = {
  data: {
    account: "account-id",
    statementItem: statementItemFixture,
  },
  type: "StatementItem",
} as const;
