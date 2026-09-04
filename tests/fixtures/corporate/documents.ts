export const documentSigningRequestFixture = {
  deeplink: "https://mbnk.app/sign/sGtN4FnxYORZQU5Me1HbYhQ",
  requestId: "sGtN4FnxYORZQU5Me1HbYhQ",
} as const;

export const documentSigningInputFixture = {
  documents: [
    {
      hash: "DE50349D679C55142B182DF0145D0B6EF6EF9879FB79B23D5D598CEB2E50643A",
      hashType: "Dstu256",
      name: "Договір на поставку товарів",
      type: "pdf",
    },
  ],
} as const;

export const documentSigningStatusFixture = {
  documents: [
    {
      hash: "DE50349D679C55142B182DF0145D0B6EF6EF9879FB79B23D5D598CEB2E50643A",
      hashType: "Dstu256",
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
