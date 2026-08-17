export const acquiringWalletFixture = {
  wallet: [
    {
      cardToken: "67XZtXdR4NpKU3",
      country: "804",
      maskedPan: "424242******4242",
    },
  ],
} as const;

export const acquiringCardPaymentFixture = {
  amount: 4_200,
  ccy: 980,
  createdDate: "2026-08-16T10:15:00Z",
  invoiceId: "2210012MPLYwJjVUzchj",
  modifiedDate: "2026-08-16T10:15:30Z",
  status: "success",
} as const;
