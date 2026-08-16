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
