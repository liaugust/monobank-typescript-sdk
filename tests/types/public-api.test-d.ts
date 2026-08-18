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
  ClientInfo,
  CorporateSettings,
  CorporateSignatureInput,
  CorporateSigner,
  CreateInvoiceInput,
  CreateInvoiceOptions,
  CurrencyRate,
  GetAcquiringQrDetailsInput,
  GetAcquiringStatementsInput,
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
  ResetAcquiringQrAmountInput,
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
  corporateSettingsSchema,
  InvoicePaymentType,
  InvoiceStatus,
  MonobankAcquiringClient,
  MonobankCorporateClient,
  MonobankPersonalClient,
  MonobankPublicClient,
  parsePersonalWebhookEvent,
  verifyAcquiringWebhookSignature,
} from "@liaugust/monobank-sdk";

const client = new MonobankPersonalClient({ token: "token" });
const publicClient = new MonobankPublicClient();
const acquiringClient = new MonobankAcquiringClient({ token: "token" });
const corporateClient = new MonobankCorporateClient({
  keyId: "28a75537175a018645e6f8b14be7681791e701e0",
  sign: ({ payload }: CorporateSignatureInput) => payload,
});
const corporateSettingsInput: GetCorporateSettingsInput = {
  requestId: "corp-request-id",
};
const corporateSettings: Promise<CorporateSettings> =
  corporateClient.company.getSettings(corporateSettingsInput);
const parsedCorporateSettings: CorporateSettings =
  corporateSettingsSchema.parse({
    logo: "logo",
    name: "company",
    permission: "psf",
    pubkey: "pubkey",
  });
const corporateSigner: CorporateSigner = () => Promise.resolve("c2ln");
const input: GetStatementsInput = { from: new Date(0) };
const bankSync: Promise<BankSync> = publicClient.bank.getSync();
const statements = client.statements.get(input);
const clientInfo: Promise<ClientInfo> = client.client.getInfo();
const rates: Promise<readonly CurrencyRate[]> =
  publicClient.currency.getRates();
const merchantDetails: Promise<MerchantDetails> =
  acquiringClient.merchant.getDetails();
const acquiringStatementInput: GetAcquiringStatementsInput = {
  code: "terminal-42",
  from: new Date(0),
};
const acquiringStatements: Promise<AcquiringStatement> =
  acquiringClient.statements.get(acquiringStatementInput);
const acquiringSubmerchants: Promise<AcquiringSubmerchantList> =
  acquiringClient.submerchants.list();
const parsedSubmerchants: AcquiringSubmerchantList =
  acquiringSubmerchantListSchema.parse({ list: [] });
const acquiringQrCashiers: Promise<AcquiringQrCashierList> =
  acquiringClient.qr.list();
const parsedQrCashiers: AcquiringQrCashierList =
  acquiringQrCashierListSchema.parse({ list: [] });
const acquiringQrDetailsInput: GetAcquiringQrDetailsInput = {
  qrId: "XJ_DiM4rTd5V",
};
const acquiringQrDetails: Promise<AcquiringQrDetails> =
  acquiringClient.qr.getDetails(acquiringQrDetailsInput);
const acquiringQrAmountType: AcquiringQrAmountType =
  AcquiringQrAmountType.Merchant;
const minimalQrDetails: AcquiringQrDetails = { shortQrId: "OBJE" };
const acquiringQrResetInput: ResetAcquiringQrAmountInput = {
  qrId: "XJ_DiM4rTd5V",
};
const acquiringQrReset: Promise<void> = acquiringClient.qr.resetAmount(
  acquiringQrResetInput,
);
const acquiringQrAmountTypesAreExact = {
  client: true,
  fix: true,
  merchant: true,
} satisfies Record<AcquiringQrAmountType, true>;
const webhookPublicKey: Promise<AcquiringWebhookPublicKey> =
  acquiringClient.webhooks.getPublicKey();
const signatureInput: VerifyAcquiringWebhookSignatureInput = {
  body: new Uint8Array(),
  publicKey: "base64-key",
  signature: "base64-signature",
};
const signatureMatches: Promise<boolean> =
  verifyAcquiringWebhookSignature(signatureInput);
const createInvoiceInput: CreateInvoiceInput = {
  amount: 4_200,
  paymentType: InvoicePaymentType.Hold,
};
const createInvoiceOptions: CreateInvoiceOptions = {
  cms: "Synthetic Shop",
  cmsVersion: "1.2.3",
};
const newInvoice: Promise<NewInvoice> = acquiringClient.invoices.create(
  createInvoiceInput,
  createInvoiceOptions,
);
const invoice: Promise<Invoice> = acquiringClient.invoices.getStatus({
  invoiceId: "invoice-42",
});
const cancelInput: CancelInvoiceInput = { invoiceId: "invoice-42" };
const cancellation: Promise<InvoiceCancellation> =
  acquiringClient.invoices.cancel(cancelInput);
const finalization: Promise<InvoiceFinalization> =
  acquiringClient.invoices.finalize({ invoiceId: "invoice-42" });
const receipt: Promise<InvoiceReceipt> = acquiringClient.invoices.getReceipt({
  invoiceId: "invoice-42",
});
const fiscalChecks: Promise<InvoiceFiscalChecks> =
  acquiringClient.invoices.getFiscalChecks({ invoiceId: "invoice-42" });
const removal: Promise<void> = acquiringClient.invoices.remove({
  invoiceId: "invoice-42",
});
const invoiceStatus: InvoiceStatus = InvoiceStatus.Success;
const acquiringStatementStatus: AcquiringStatementStatus =
  AcquiringStatementStatus.Success;
const acquiringPaymentScheme: AcquiringPaymentScheme =
  AcquiringPaymentScheme.Full;
const webhookUpdate: Promise<void> = client.webhooks.set({ webHookUrl: "" });
const accountType: AccountType = AccountType.Black;
const cashbackType: CashbackType = CashbackType.UAH;
const accountTypesAreExact = {
  black: true,
  eAid: true,
  fop: true,
  iron: true,
  platinum: true,
  white: true,
  yellow: true,
} satisfies Record<AccountType, true>;
const cashbackTypesAreExact = {
  Miles: true,
  None: true,
  UAH: true,
} satisfies Record<CashbackType, true>;
const acquiringEmployees: Promise<AcquiringEmployeeList> =
  acquiringClient.employees.list();
const acquiringWalletCards: Promise<AcquiringWallet> =
  acquiringClient.wallet.list({
    walletId: "wallet-42",
  });
const walletPaymentInput: PayWithCardTokenInput = {
  amount: 4_200,
  cardToken: "card-token-42",
  ccy: 980,
  initiationKind: AcquiringPaymentInitiationKind.Client,
};
const walletPayment: Promise<AcquiringCardPayment> =
  acquiringClient.wallet.pay(walletPaymentInput);
const walletCardRemoval: Promise<void> = acquiringClient.wallet.deleteCard({
  cardToken: "card-token-42",
});
const directPaymentInput: PayInvoiceDirectInput = {
  amount: 4_200,
  cardData: { cvv: "123", exp: "0642", pan: "4242424242424242" },
};
const directPayment: Promise<AcquiringCardPayment> =
  acquiringClient.invoices.payDirect(directPaymentInput);
const syncPaymentInput: SyncInvoicePaymentInput = {
  amount: 4_200,
  ccy: 980,
  googlePay: { eciIndicator: "02", exp: "0642", token: "token-42" },
};
const syncPayment: Promise<Invoice> =
  acquiringClient.invoices.syncPayment(syncPaymentInput);
declare const acquiringEmployee: AcquiringEmployee;
declare const acquiringWalletCard: AcquiringWalletCard;
declare const account: Account;
declare const acquiringSubmerchant: AcquiringSubmerchant;
declare const untrustedWebhookPayload: unknown;
const webhookEvent: PersonalWebhookEvent = parsePersonalWebhookEvent(
  untrustedWebhookPayload,
);

void bankSync;
void statements;
void clientInfo;
void rates;
void merchantDetails;
void acquiringStatements;
void acquiringSubmerchants;
void parsedSubmerchants;
void acquiringQrCashiers;
void parsedQrCashiers;
void acquiringQrDetails;
void acquiringQrAmountType;
void acquiringQrAmountTypesAreExact;
void minimalQrDetails;
void acquiringQrReset;
void webhookPublicKey;
void signatureMatches;
void newInvoice;
void invoice;
void cancellation;
void finalization;
void receipt;
void fiscalChecks;
void removal;
void invoiceStatus;
void acquiringStatementStatus;
void acquiringPaymentScheme;
void webhookUpdate;
void accountType;
void accountTypesAreExact;
void cashbackType;
void cashbackTypesAreExact;
void account;
void acquiringSubmerchant;
void webhookEvent;
void acquiringEmployees;
void acquiringWalletCards;
void walletPayment;
void walletCardRemoval;
void directPayment;
void syncPayment;
void acquiringEmployee;
void acquiringWalletCard;

const removedPersonalPublicMethod: Exclude<
  "getBankSync" | "getCurrencyRates",
  keyof MonobankPersonalClient
> = "getCurrencyRates";
void removedPersonalPublicMethod;
const removedFlatMerchantMethod: Exclude<
  "getMerchantDetails",
  keyof MonobankAcquiringClient
> = "getMerchantDetails";
void removedFlatMerchantMethod;
const removedFlatInvoiceMethod: Exclude<
  | "cancelInvoice"
  | "createInvoice"
  | "finalizeInvoice"
  | "getInvoiceFiscalChecks"
  | "getInvoiceReceipt"
  | "getInvoiceStatus"
  | "removeInvoice",
  keyof MonobankAcquiringClient
> = "createInvoice";
void removedFlatInvoiceMethod;

// @ts-expect-error -- Personal token is required by the public constructor.
new MonobankPersonalClient({});

// @ts-expect-error -- Acquiring token is required by the public constructor.
new MonobankAcquiringClient({});

// @ts-expect-error -- Statement start time must be a Date or Unix number.
void client.statements.get({ account: "0", from: "2026-08-01" });

// @ts-expect-error -- Acquiring statement start time must be a Date or Unix number.
void acquiringClient.statements.get({ from: "2026-08-01" });

// @ts-expect-error -- The validated submerchant list is not assignable to a mutable array.
const mutableSubmerchantList: AcquiringSubmerchant[] = parsedSubmerchants.list;
void mutableSubmerchantList;

// @ts-expect-error -- The validated QR cashier list is not assignable to a mutable array.
const mutableQrCashierList: AcquiringQrCashier[] = parsedQrCashiers.list;
void mutableQrCashierList;

// @ts-expect-error -- QR details require a cashier identifier.
void acquiringClient.qr.getDetails({});

// @ts-expect-error -- Clearing a QR amount requires a cashier identifier.
void acquiringClient.qr.resetAmount({});

// @ts-expect-error -- Validated QR details always carry the short identifier.
const qrDetailsWithoutShortId: AcquiringQrDetails = {};
void qrDetailsWithoutShortId;

// @ts-expect-error -- QR cashier amount types are limited to documented wire values.
const invalidQrAmountType: AcquiringQrAmountType = "operator";
void invalidQrAmountType;

void acquiringClient.invoices.payDirect({
  amount: 4_200,
  // @ts-expect-error -- Direct payments require full raw card details.
  cardData: { pan: "4242424242424242" },
});

// @ts-expect-error -- Wallet card removal requires a card token.
void acquiringClient.wallet.deleteCard({});

// @ts-expect-error -- Account types are limited to documented wire values.
const invalidAccountType: AccountType = "gold";

// @ts-expect-error -- Cashback types are limited to documented wire values.
const invalidCashbackType: CashbackType = "Cash";

void invalidAccountType;
void invalidCashbackType;

void corporateSettings;
void parsedCorporateSettings;
void corporateSigner;

// @ts-expect-error -- A Corporate key identifier and signer are both required.
new MonobankCorporateClient({
  keyId: "28a75537175a018645e6f8b14be7681791e701e0",
});

// @ts-expect-error -- A Corporate token is not an accepted credential.
new MonobankCorporateClient({ token: "token" });

// @ts-expect-error -- Corporate settings require a request identifier.
void corporateClient.company.getSettings({});
