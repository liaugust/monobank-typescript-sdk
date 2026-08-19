export const newAcquiringSubscriptionFixture = {
  pageUrl: "https://pay.mbnk.biz/s2_AbrCdXyZ13",
  subscriptionId: "s2_AbrCdXyZ13",
} as const;

export const acquiringSubscriptionFixture = {
  amount: 4_200,
  cancellationDesc: "Skasovano za zapytom korystuvacha",
  ccy: 980,
  endDate: "2024-06-20T09:30:15Z",
  interval: "1m",
  nextChargeDate: "2024-07-01T14:15:22Z",
  startDate: "2024-06-01T14:15:22Z",
  status: "active",
  subscriptionId: "s2_AbrCdXyZ13",
  summary: {
    totalFailed: 1,
    totalPaid: 3,
  },
  walletData: {
    cardToken: "67XZtXdR4NpKU3",
    failureDescription: "Nedostatno koshtiv na kartci",
    status: "created",
    walletId: "c1376a611e17b059aeaf96b73258da9c",
  },
} as const;

export const acquiringSubscriptionListFixture = {
  list: [
    {
      amount: 4_200,
      created: "2024-05-30T12:10:05Z",
      endDate: "2024-09-01T14:15:22Z",
      interval: "1m",
      nextChargeDate: "2024-07-01T14:15:22Z",
      startDate: "2024-06-01T14:15:22Z",
      status: "active",
      subscriptionId: "s2_AbrCdXyZ13",
    },
  ],
  pagination: {
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 5,
    totalPages: 1,
  },
} as const;

export const acquiringSubscriptionPaymentListFixture = {
  pagination: {
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 10,
    totalPages: 1,
  },
  payments: [
    {
      amount: 4_200,
      ccy: 980,
      chargedAt: "2024-06-01T14:15:22Z",
      status: "success",
    },
  ],
} as const;
