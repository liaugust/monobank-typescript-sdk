export const merchantDetailsFixture = {
  edrpou: "4242424242",
  merchantId: "12o4Vv7EWy",
  merchantName: "Your Favourite Company",
} as const;

export const newInvoiceFixture = {
  invoiceId: "invoice-42",
  pageUrl: "https://pay.example.test/invoice-42",
} as const;

export const invoiceStatusFixture = {
  amount: 4_200,
  ccy: 980,
  createdDate: "2026-08-16T11:00:00Z",
  finalAmount: 4_200,
  invoiceId: "invoice-42",
  modifiedDate: "2026-08-16T11:01:00Z",
  status: "success",
} as const;

export const cancellationFixture = {
  createdDate: "2026-08-16T12:00:00Z",
  modifiedDate: "2026-08-16T12:01:00Z",
  status: "processing",
} as const;

export const finalizationFixture = { status: "success" } as const;

export const receiptFixture = { file: "base64-pdf" } as const;

export const fiscalChecksFixture = {
  checks: [
    {
      fiscalizationSource: "monopay",
      id: "check-42",
      status: "done",
      type: "sale",
    },
  ],
} as const;
