export const corporateSettingsFixture = {
  logo: "aVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQVVBQUFBQ0U=",
  name: 'ТОВ "Ворона"',
  permission: "psf",
  pubkey: "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemow",
  webhook: "https://example.com/mono/corp/webhook/synthetic",
} as const;

export const corporateRegistrationFixture = {
  status: "New",
} as const;

export const corporateRegistrationStatusFixture = {
  keyId: "28a75537175a018645e6f8b14be7681791e701e0",
  status: "Approved",
} as const;

export const corporateRegistrationInputFixture = {
  contactPerson: "Роман Шевченко",
  description: "Synthetic registration payload for contract tests",
  email: "etc@example.com",
  logo: "aVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQVVBQUFBQ0U=",
  name: 'ТОВ "Ворона"',
  phone: "380671234567",
  pubkey: "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemow",
} as const;
