export const acquiringQrCashierListFixture = {
  list: [
    {
      amountType: "merchant",
      pageUrl: "https://pay.mbnk.biz/XJ_DiM4rTd5V",
      qrId: "XJ_DiM4rTd5V",
      shortQrId: "OBJE",
    },
    {
      amountType: "client",
      pageUrl: "https://pay.mbnk.biz/Qc7ZlA9pWm2N",
      qrId: "Qc7ZlA9pWm2N",
      shortQrId: "RAVN",
    },
  ],
} as const;

export const acquiringQrDetailsFixture = {
  amount: 4_200,
  ccy: 980,
  invoiceId: "4EwIUTA12JIZ",
  shortQrId: "OBJE",
} as const;
