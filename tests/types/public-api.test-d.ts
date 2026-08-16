import type {
  Account,
  AcquiringWebhookPublicKey,
  BankSync,
  CancelInvoiceInput,
  ClientInfo,
  CreateInvoiceInput,
  CreateInvoiceOptions,
  CurrencyRate,
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
declare const untrustedWebhookPayload: unknown;
const webhookEvent: PersonalWebhookEvent = parsePersonalWebhookEvent(
  untrustedWebhookPayload,
);

void bankSync;
void statements;
void clientInfo;
void rates;
void merchantDetails;
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
void webhookUpdate;
void accountType;
void accountTypesAreExact;
void cashbackType;
void cashbackTypesAreExact;
void account;
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

// @ts-expect-error -- Account types are limited to documented wire values.
const invalidAccountType: AccountType = "gold";

// @ts-expect-error -- Cashback types are limited to documented wire values.
const invalidCashbackType: CashbackType = "Cash";

void invalidAccountType;
void invalidCashbackType;
