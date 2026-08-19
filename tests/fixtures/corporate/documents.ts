export const documentSigningRequestFixture = {
  deeplink: "https://mbnk.app/sign/sGtN4FnxYORZQU5Me1HbYhQ",
  requestId: "sGtN4FnxYORZQU5Me1HbYhQ",
} as const;

export const documentSigningInputFixture = {
  documents: [
    {
      hash: "A421FD4D4AB19BE76EC02A0F84AC2379822943FE85EB6ED7F22B30F73CB9CAF9",
      name: "Договір на поставку товарів",
      type: "pdf",
    },
  ],
} as const;

export const documentSigningStatusFixture = {
  documents: [
    {
      hash: "A421FD4D4AB19BE76EC02A0F84AC2379822943FE85EB6ED7F22B30F73CB9CAF9",
      link: "https://example.com/agreement.pdf",
      name: "Договір на поставку товарів",
      signers: [
        {
          certSerial: "382367105294AF970400000058B38300BAE33C02",
          company: 'ТОВ "Сорока"',
          date: "2025-01-21T18:15:00.000Z",
          edrpou: "12345678",
          name: "Шевченко Роман Петрович",
          post: "Директор",
          signature: "MIIJQwIBADANBgkqhkiG9w0BAQEFAASCCS0wggkp",
          tin: "1234567890",
        },
      ],
      status: "signed",
      type: "pdf",
    },
  ],
} as const;
