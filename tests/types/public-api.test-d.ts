import type {
  Account,
  AcquiringQrCashier,
  AcquiringQrCashierList,
  AcquiringQrDetails,
  AcquiringStatement,
  AcquiringSubmerchant,
  AcquiringSubmerchantList,
  AcquiringWebhookPublicKey,
  BankSync,
  CancelInvoiceInput,
  ClientInfo,
  CreateInvoiceInput,
  CreateInvoiceOptions,
  CurrencyRate,
  GetAcquiringQrDetailsInput,
  GetAcquiringStatementsInput,
  GetStatementsInput,
  Invoice,
  InvoiceCancellation,
  InvoiceFinalization,
  InvoiceFiscalChecks,
  InvoiceReceipt,
  MerchantDetails,
  NewInvoice,
  PersonalWebhookEvent,
  VerifyAcquiringWebhookSignatureInput,
} from "@liaugust/monobank-sdk";
import {
  AccountType,
  AcquiringPaymentScheme,
  AcquiringQrAmountType,
  acquiringQrCashierListSchema,
  AcquiringStatementStatus,
  acquiringSubmerchantListSchema,
  CashbackType,
  InvoicePaymentType,
  InvoiceStatus,
  MonobankAcquiringClient,
  MonobankPersonalClient,
  MonobankPublicClient,
  parsePersonalWebhookEvent,
  verifyAcquiringWebhookSignature,
} from "@liaugust/monobank-sdk";

const client = new MonobankPersonalClient({ token: "token" });
const publicClient = new MonobankPublicClient();
const acquiringClient = new MonobankAcquiringClient({ token: "token" });
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

// @ts-expect-error -- Validated QR details always carry the short identifier.
const qrDetailsWithoutShortId: AcquiringQrDetails = {};
void qrDetailsWithoutShortId;

// @ts-expect-error -- QR cashier amount types are limited to documented wire values.
const invalidQrAmountType: AcquiringQrAmountType = "operator";
void invalidQrAmountType;

// @ts-expect-error -- Account types are limited to documented wire values.
const invalidAccountType: AccountType = "gold";

// @ts-expect-error -- Cashback types are limited to documented wire values.
const invalidCashbackType: CashbackType = "Cash";

void invalidAccountType;
void invalidCashbackType;
