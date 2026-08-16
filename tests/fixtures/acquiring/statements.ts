export const acquiringStatementFixture = {
  list: [
    {
      amount: 4_200,
      approvalCode: "662476",
      cancelList: [
        {
          amount: 1_000,
          approvalCode: "662477",
          ccy: 980,
          date: "2026-08-16T12:30:00Z",
          maskedPan: "444403******1902",
          rrn: "060189181769",
        },
      ],
      ccy: 980,
      date: "2026-08-16T12:00:00Z",
      destination: "Order 42",
      invoiceId: "invoice-42",
      maskedPan: "444403******1902",
      paymentScheme: "full",
      profitAmount: 4_100,
      reference: "reference-42",
      rrn: "060189181768",
      shortQrId: "OBJE",
      status: "success",
    },
  ],
} as const;
