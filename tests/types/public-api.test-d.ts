import type {
  Account,
  AcquiringCardPayment,
  AcquiringEmployee,
  AcquiringEmployeeList,
  AcquiringQrCashier,
  AcquiringQrCashierList,
  AcquiringQrDetails,
  AcquiringStatement,
  AcquiringSubmerchant,
  AcquiringSubmerchantList,
  AcquiringWallet,
  AcquiringWalletCard,
  AcquiringWebhookPublicKey,
  BankSync,
  CancelInvoiceInput,
  CheckCorporateAccessInput,
  ClientInfo,
  CorporateRegistration,
  CorporateRegistrationStatusResult,
  CorporateSettings,
  CorporateSignatureInput,
  CorporateSigner,
  CorporateTokenRequest,
  CreateInvoiceInput,
  CreateInvoiceOptions,
  CurrencyRate,
  DocumentSignatory,
  DocumentSigningRequest,
  DocumentSigningStatus,
  GetAcquiringQrDetailsInput,
  GetAcquiringStatementsInput,
  GetCorporateClientInfoInput,
  GetCorporateClientStatementsInput,
  GetCorporateRegistrationStatusInput,
  GetCorporateSettingsInput,
  GetStatementsInput,
  Invoice,
  InvoiceCancellation,
  InvoiceFinalization,
  InvoiceFiscalChecks,
  InvoiceReceipt,
  MerchantDetails,
  NewInvoice,
  PayInvoiceDirectInput,
  PayWithCardTokenInput,
  PersonalWebhookEvent,
  RegisterCorporateCompanyInput,
  RequestCorporateAccessInput,
  RequestDocumentSigningInput,
  ResetAcquiringQrAmountInput,
  RetryOptions,
  SetCorporateWebhookInput,
  SigningDocument,
  SigningDocumentInput,
  StatementItem,
  StatementWindowInput,
  SyncInvoicePaymentInput,
  VerifyAcquiringWebhookSignatureInput,
} from "@liaugust/monobank-sdk";
import {
  AccountType,
  AcquiringPaymentInitiationKind,
  AcquiringPaymentScheme,
  AcquiringQrAmountType,
  acquiringQrCashierListSchema,
  AcquiringStatementStatus,
  acquiringSubmerchantListSchema,
  CashbackType,
  CorporateRegistrationStatus,
  corporateSettingsSchema,
  corporateTokenRequestSchema,
  defaultRetryableStatusCodes,
  DocumentSigningState,
  InvoicePaymentType,
  InvoiceStatus,
  MonobankAcquiringClient,
  MonobankCorporateClient,
  MonobankPersonalClient,
  MonobankPublicClient,
  parsePersonalWebhookEvent,
  SigningDocumentHashType,
  SigningDocumentType,
  verifyAcquiringWebhookSignature,
} from "@liaugust/monobank-sdk";
import { describe, expectTypeOf, test } from "vitest";

const publicClient = new MonobankPublicClient();
const personalClient = new MonobankPersonalClient({ token: "token" });
const acquiringClient = new MonobankAcquiringClient({ token: "token" });
const corporateSigner: CorporateSigner = () => Promise.resolve("c2ln");
const corporateClient = new MonobankCorporateClient({
  keyId: "28a75537175a018645e6f8b14be7681791e701e0",
  sign: ({ payload }: CorporateSignatureInput) => payload,
});

describe("client constructors", () => {
  test("accept the documented credentials", () => {
    expectTypeOf(
      new MonobankCorporateClient({ sign: corporateSigner }),
    ).toEqualTypeOf<MonobankCorporateClient>();
  });

  test("reject missing or foreign credentials", () => {
    // @ts-expect-error -- Personal token is required by the public constructor.
    new MonobankPersonalClient({});
    // @ts-expect-error -- Acquiring token is required by the public constructor.
    new MonobankAcquiringClient({});
    // @ts-expect-error -- A Corporate signer is always required.
    new MonobankCorporateClient({
      keyId: "28a75537175a018645e6f8b14be7681791e701e0",
    });
    // @ts-expect-error -- A Corporate token is not an accepted credential.
    new MonobankCorporateClient({ token: "token" });
  });

  test("do not bring back removed flat methods", () => {
    expectTypeOf<MonobankPersonalClient>().not.toHaveProperty("getBankSync");
    expectTypeOf<MonobankPersonalClient>().not.toHaveProperty(
      "getCurrencyRates",
    );
    expectTypeOf<MonobankAcquiringClient>().not.toHaveProperty(
      "getMerchantDetails",
    );
    expectTypeOf<MonobankAcquiringClient>().not.toHaveProperty("cancelInvoice");
    expectTypeOf<MonobankAcquiringClient>().not.toHaveProperty("createInvoice");
    expectTypeOf<MonobankAcquiringClient>().not.toHaveProperty(
      "finalizeInvoice",
    );
    expectTypeOf<MonobankAcquiringClient>().not.toHaveProperty(
      "getInvoiceFiscalChecks",
    );
    expectTypeOf<MonobankAcquiringClient>().not.toHaveProperty(
      "getInvoiceReceipt",
    );
    expectTypeOf<MonobankAcquiringClient>().not.toHaveProperty(
      "getInvoiceStatus",
    );
    expectTypeOf<MonobankAcquiringClient>().not.toHaveProperty("removeInvoice");
  });
});

describe("public client", () => {
  test("reads bank sync and currency rates", () => {
    expectTypeOf(publicClient.bank.getSync()).toEqualTypeOf<
      Promise<BankSync>
    >();
    expectTypeOf(publicClient.currency.getRates()).toEqualTypeOf<
      Promise<readonly CurrencyRate[]>
    >();
  });
});

describe("personal client", () => {
  test("reads client info", () => {
    expectTypeOf(personalClient.client.getInfo()).toEqualTypeOf<
      Promise<ClientInfo>
    >();
  });

  test("reads statements", () => {
    const input: GetStatementsInput = { from: new Date(0) };

    expectTypeOf(personalClient.statements.get(input)).toEqualTypeOf<
      Promise<readonly StatementItem[]>
    >();
    // @ts-expect-error -- Statement start time must be a Date or Unix number.
    void personalClient.statements.get({ account: "0", from: "2026-08-01" });
  });

  test("sets the webhook", () => {
    expectTypeOf(personalClient.webhooks.set({ webHookUrl: "" })).toEqualTypeOf<
      Promise<void>
    >();
  });

  test("parses webhook events from untrusted input", () => {
    expectTypeOf(parsePersonalWebhookEvent).parameter(0).toBeUnknown();
    expectTypeOf(
      parsePersonalWebhookEvent,
    ).returns.toEqualTypeOf<PersonalWebhookEvent>();
  });

  test("limits account and cashback types to documented wire values", () => {
    expectTypeOf(AccountType.Black).toExtend<AccountType>();
    expectTypeOf(CashbackType.UAH).toExtend<CashbackType>();
    expectTypeOf<AccountType>().toEqualTypeOf<
      | "black"
      | "eAid"
      | "fop"
      | "iron"
      | "madeInUkraine"
      | "platinum"
      | "white"
      | "yellow"
    >();
    expectTypeOf<CashbackType>().toEqualTypeOf<"Miles" | "None" | "UAH">();
    expectTypeOf<Account["type"]>().toEqualTypeOf<AccountType>();
    expectTypeOf<Account["cashbackType"]>().toExtend<
      CashbackType | undefined
    >();
  });
});

describe("acquiring client", () => {
  test("reads merchant details and statements", () => {
    const input: GetAcquiringStatementsInput = {
      code: "terminal-42",
      from: new Date(0),
    };

    expectTypeOf(acquiringClient.merchant.getDetails()).toEqualTypeOf<
      Promise<MerchantDetails>
    >();
    expectTypeOf(acquiringClient.statements.get(input)).toEqualTypeOf<
      Promise<AcquiringStatement>
    >();
    expectTypeOf(
      AcquiringStatementStatus.Success,
    ).toExtend<AcquiringStatementStatus>();
    expectTypeOf(
      AcquiringPaymentScheme.Full,
    ).toExtend<AcquiringPaymentScheme>();
    // @ts-expect-error -- Acquiring statement start time must be a Date or Unix number.
    void acquiringClient.statements.get({ from: "2026-08-01" });
  });

  test("lists submerchants as read-only data", () => {
    expectTypeOf(acquiringClient.submerchants.list()).toEqualTypeOf<
      Promise<AcquiringSubmerchantList>
    >();
    expectTypeOf(
      acquiringSubmerchantListSchema.parse({ list: [] }),
    ).toExtend<AcquiringSubmerchantList>();
    expectTypeOf<
      AcquiringSubmerchantList["list"]
    >().items.toEqualTypeOf<AcquiringSubmerchant>();
    expectTypeOf<AcquiringSubmerchantList["list"]>().not.toExtend<
      AcquiringSubmerchant[]
    >();
  });

  test("manages QR cashiers", () => {
    const detailsInput: GetAcquiringQrDetailsInput = { qrId: "XJ_DiM4rTd5V" };
    const resetInput: ResetAcquiringQrAmountInput = { qrId: "XJ_DiM4rTd5V" };

    expectTypeOf(acquiringClient.qr.list()).toEqualTypeOf<
      Promise<AcquiringQrCashierList>
    >();
    expectTypeOf(
      acquiringQrCashierListSchema.parse({ list: [] }),
    ).toExtend<AcquiringQrCashierList>();
    expectTypeOf<AcquiringQrCashierList["list"]>().not.toExtend<
      AcquiringQrCashier[]
    >();
    expectTypeOf(acquiringClient.qr.getDetails(detailsInput)).toEqualTypeOf<
      Promise<AcquiringQrDetails>
    >();
    expectTypeOf(acquiringClient.qr.resetAmount(resetInput)).toEqualTypeOf<
      Promise<void>
    >();
    expectTypeOf({
      shortQrId: "OBJE",
    } as const).toExtend<AcquiringQrDetails>();
    expectTypeOf({}).not.toExtend<AcquiringQrDetails>();
    expectTypeOf(
      AcquiringQrAmountType.Merchant,
    ).toExtend<AcquiringQrAmountType>();
    expectTypeOf<AcquiringQrAmountType>().toEqualTypeOf<
      "client" | "fix" | "merchant"
    >();
    // @ts-expect-error -- QR details require a cashier identifier.
    void acquiringClient.qr.getDetails({});
    // @ts-expect-error -- Clearing a QR amount requires a cashier identifier.
    void acquiringClient.qr.resetAmount({});
  });

  test("verifies webhook signatures", () => {
    const input: VerifyAcquiringWebhookSignatureInput = {
      body: new Uint8Array(),
      publicKey: "base64-key",
      signature: "base64-signature",
    };

    expectTypeOf(acquiringClient.webhooks.getPublicKey()).toEqualTypeOf<
      Promise<AcquiringWebhookPublicKey>
    >();
    expectTypeOf(verifyAcquiringWebhookSignature(input)).toEqualTypeOf<
      Promise<boolean>
    >();
  });

  test("manages invoices", () => {
    const createInput: CreateInvoiceInput = {
      amount: 4_200,
      paymentType: InvoicePaymentType.Hold,
    };
    const createOptions: CreateInvoiceOptions = {
      cms: "Synthetic Shop",
      cmsVersion: "1.2.3",
    };
    const cancelInput: CancelInvoiceInput = { invoiceId: "invoice-42" };
    const reference = { invoiceId: "invoice-42" };

    expectTypeOf(
      acquiringClient.invoices.create(createInput, createOptions),
    ).toEqualTypeOf<Promise<NewInvoice>>();
    expectTypeOf(acquiringClient.invoices.getStatus(reference)).toEqualTypeOf<
      Promise<Invoice>
    >();
    expectTypeOf(acquiringClient.invoices.cancel(cancelInput)).toEqualTypeOf<
      Promise<InvoiceCancellation>
    >();
    expectTypeOf(acquiringClient.invoices.finalize(reference)).toEqualTypeOf<
      Promise<InvoiceFinalization>
    >();
    expectTypeOf(acquiringClient.invoices.getReceipt(reference)).toEqualTypeOf<
      Promise<InvoiceReceipt>
    >();
    expectTypeOf(
      acquiringClient.invoices.getFiscalChecks(reference),
    ).toEqualTypeOf<Promise<InvoiceFiscalChecks>>();
    expectTypeOf(acquiringClient.invoices.remove(reference)).toEqualTypeOf<
      Promise<void>
    >();
    expectTypeOf(InvoiceStatus.Success).toExtend<InvoiceStatus>();
  });

  test("charges invoices directly and syncs wallet payments", () => {
    const directInput: PayInvoiceDirectInput = {
      amount: 4_200,
      cardData: { cvv: "123", exp: "0642", pan: "4242424242424242" },
    };
    const syncInput: SyncInvoicePaymentInput = {
      amount: 4_200,
      ccy: 980,
      googlePay: { eciIndicator: "02", exp: "0642", token: "token-42" },
    };

    expectTypeOf(acquiringClient.invoices.payDirect(directInput)).toEqualTypeOf<
      Promise<AcquiringCardPayment>
    >();
    expectTypeOf(acquiringClient.invoices.syncPayment(syncInput)).toEqualTypeOf<
      Promise<Invoice>
    >();
    void acquiringClient.invoices.payDirect({
      amount: 4_200,
      // @ts-expect-error -- Direct payments require full raw card details.
      cardData: { pan: "4242424242424242" },
    });
  });

  test("lists employees", () => {
    expectTypeOf(acquiringClient.employees.list()).toEqualTypeOf<
      Promise<AcquiringEmployeeList>
    >();
    expectTypeOf<
      AcquiringEmployeeList["list"][number]
    >().toEqualTypeOf<AcquiringEmployee>();
  });

  test("manages wallet cards", () => {
    const payInput: PayWithCardTokenInput = {
      amount: 4_200,
      cardToken: "card-token-42",
      ccy: 980,
      initiationKind: AcquiringPaymentInitiationKind.Client,
    };

    expectTypeOf(
      acquiringClient.wallet.list({ walletId: "wallet-42" }),
    ).toEqualTypeOf<Promise<AcquiringWallet>>();
    expectTypeOf<
      AcquiringWallet["wallet"][number]
    >().toEqualTypeOf<AcquiringWalletCard>();
    expectTypeOf(acquiringClient.wallet.pay(payInput)).toEqualTypeOf<
      Promise<AcquiringCardPayment>
    >();
    expectTypeOf(
      acquiringClient.wallet.deleteCard({ cardToken: "card-token-42" }),
    ).toEqualTypeOf<Promise<void>>();
    // @ts-expect-error -- Wallet card removal requires a card token.
    void acquiringClient.wallet.deleteCard({});
  });
});

describe("corporate client", () => {
  test("reads and parses company settings", () => {
    const input: GetCorporateSettingsInput = { requestId: "corp-request-id" };

    expectTypeOf(corporateClient.company.getSettings(input)).toEqualTypeOf<
      Promise<CorporateSettings>
    >();
    expectTypeOf(
      corporateSettingsSchema.parse({
        logo: "logo",
        name: "company",
        permission: "psf",
        pubkey: "pubkey",
      }),
    ).toEqualTypeOf<CorporateSettings>();
    // @ts-expect-error -- Corporate settings require a request identifier.
    void corporateClient.company.getSettings({});
  });

  test("registers a company before a key identifier exists", () => {
    const preRegistrationClient = new MonobankCorporateClient({
      sign: corporateSigner,
    });
    const registrationInput: RegisterCorporateCompanyInput = {
      contactPerson: "Contact Person",
      description: "Service description",
      email: "etc@example.com",
      logo: "bG9nbw==",
      name: "Company",
      phone: "380671234567",
      pubkey: "cHVia2V5",
    };
    const statusInput: GetCorporateRegistrationStatusInput = {
      pubkey: "cHVia2V5",
    };

    expectTypeOf(
      preRegistrationClient.company.register(registrationInput),
    ).toEqualTypeOf<Promise<CorporateRegistration>>();
    expectTypeOf(
      preRegistrationClient.company.getRegistrationStatus(statusInput),
    ).toEqualTypeOf<Promise<CorporateRegistrationStatusResult>>();
    expectTypeOf(CorporateRegistrationStatus.Approved).toExtend<
      CorporateRegistrationStatusResult["status"]
    >();
    expectTypeOf<"Pending">().toExtend<
      CorporateRegistrationStatusResult["status"]
    >();
    expectTypeOf<CorporateRegistrationStatusResult["keyId"]>().toEqualTypeOf<
      string | undefined
    >();
  });

  test("sets the company webhook", () => {
    const input: SetCorporateWebhookInput = {
      requestId: "corp-request-id",
      webHookUrl: "https://example.com/webhook",
    };

    expectTypeOf(corporateClient.company.setWebhook(input)).toEqualTypeOf<
      Promise<void>
    >();
    // @ts-expect-error -- The Corporate webhook mutation requires a request identifier.
    void corporateClient.company.setWebhook({
      webHookUrl: "https://example.com",
    });
  });

  test("requests and checks delegated access", () => {
    const requestInput: RequestCorporateAccessInput = {
      callbackUrl: "https://example.com/granted",
    };
    const checkInput: CheckCorporateAccessInput = { requestId: "req-1" };

    expectTypeOf(corporateClient.access.request(requestInput)).toEqualTypeOf<
      Promise<CorporateTokenRequest>
    >();
    expectTypeOf(corporateClient.access.request()).toEqualTypeOf<
      Promise<CorporateTokenRequest>
    >();
    expectTypeOf(corporateClient.access.check(checkInput)).toEqualTypeOf<
      Promise<void>
    >();
    expectTypeOf(
      corporateTokenRequestSchema.parse({}),
    ).toEqualTypeOf<CorporateTokenRequest>();
    // @ts-expect-error -- A delegated access check requires the request identifier.
    void corporateClient.access.check({});
  });

  test("reads delegated client data", () => {
    const infoInput: GetCorporateClientInfoInput = { requestId: "grant-1" };
    const statementsInput: GetCorporateClientStatementsInput = {
      account: "acc-1",
      from: new Date(0),
      requestId: "grant-1",
    };
    const window: StatementWindowInput = { from: 0 };

    expectTypeOf(corporateClient.clients.getInfo(infoInput)).toEqualTypeOf<
      Promise<ClientInfo>
    >();
    expectTypeOf(
      corporateClient.clients.getStatements(statementsInput),
    ).toEqualTypeOf<Promise<readonly StatementItem[]>>();
    expectTypeOf(window).toExtend<StatementWindowInput>();
    // @ts-expect-error -- A delegated statement read requires the grant identifier.
    void corporateClient.clients.getStatements({ from: 0 });
    void corporateClient.clients.getStatements({
      // @ts-expect-error -- A delegated statement start time must be a Date or Unix number.
      from: "2026-08-01",
      requestId: "grant-1",
    });
  });

  test("manages monoKEP document signing", () => {
    const document: SigningDocumentInput = {
      hash: "A421FD",
      hashType: SigningDocumentHashType.Dstu256,
      name: "Agreement",
      type: SigningDocumentType.Pdf,
    };
    const input: RequestDocumentSigningInput = {
      documents: [document],
      oneSigner: true,
    };

    expectTypeOf(corporateClient.documents.requestSigning(input)).toEqualTypeOf<
      Promise<DocumentSigningRequest>
    >();
    expectTypeOf(
      corporateClient.documents.getSigningStatus({ requestId: "req-1" }),
    ).toEqualTypeOf<Promise<DocumentSigningStatus>>();
    expectTypeOf(
      corporateClient.documents.cancelSigning({ requestId: "req-1" }),
    ).toEqualTypeOf<Promise<void>>();
    expectTypeOf(DocumentSigningState.Signed).toExtend<
      SigningDocument["status"]
    >();
    expectTypeOf(SigningDocumentHashType.Dstu256).toExtend<
      SigningDocument["hashType"]
    >();
    expectTypeOf<DocumentSignatory["name"]>().toEqualTypeOf<string>();
    expectTypeOf<"rtf">().not.toExtend<SigningDocumentType>();
    expectTypeOf<"Sha256">().not.toExtend<SigningDocumentHashType>();
    // @ts-expect-error -- A monoKEP signing request requires the document list.
    void corporateClient.documents.requestSigning({ oneSigner: true });
  });
});

describe("retry options", () => {
  test("accept a narrowed policy", () => {
    expectTypeOf({
      baseDelayMs: 1_000,
      maxAttempts: 3,
      maxDelayMs: 8_000,
      retryableStatusCodes: [500, 502, 503, 504],
    }).toExtend<RetryOptions>();
  });

  test("expose the default statuses as read-only", () => {
    expectTypeOf(defaultRetryableStatusCodes).toExtend<readonly number[]>();
    expectTypeOf(defaultRetryableStatusCodes).not.toExtend<number[]>();
  });
});
