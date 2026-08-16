import type {
  Account,
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
} from "@liaugust/monobank-sdk";

const client = new MonobankPersonalClient({ token: "token" });
const publicClient = new MonobankPublicClient();
const acquiringClient = new MonobankAcquiringClient({ token: "token" });
const input: GetStatementsInput = { from: new Date(0) };
const bankSync: Promise<BankSync> = publicClient.getBankSync();
const statements = client.getStatements(input);
const clientInfo: Promise<ClientInfo> = client.getClientInfo();
const rates: Promise<readonly CurrencyRate[]> = publicClient.getCurrencyRates();
const merchantDetails: Promise<MerchantDetails> =
  acquiringClient.getMerchantDetails();
const createInvoiceInput: CreateInvoiceInput = {
  amount: 4_200,
  paymentType: InvoicePaymentType.Hold,
};
const createInvoiceOptions: CreateInvoiceOptions = {
  cms: "Synthetic Shop",
  cmsVersion: "1.2.3",
};
const newInvoice: Promise<NewInvoice> = acquiringClient.createInvoice(
  createInvoiceInput,
  createInvoiceOptions,
);
const invoice: Promise<Invoice> = acquiringClient.getInvoiceStatus({
  invoiceId: "invoice-42",
});
const cancelInput: CancelInvoiceInput = { invoiceId: "invoice-42" };
const cancellation: Promise<InvoiceCancellation> =
  acquiringClient.cancelInvoice(cancelInput);
const finalization: Promise<InvoiceFinalization> =
  acquiringClient.finalizeInvoice({ invoiceId: "invoice-42" });
const receipt: Promise<InvoiceReceipt> = acquiringClient.getInvoiceReceipt({
  invoiceId: "invoice-42",
});
const fiscalChecks: Promise<InvoiceFiscalChecks> =
  acquiringClient.getInvoiceFiscalChecks({ invoiceId: "invoice-42" });
const removal: Promise<void> = acquiringClient.removeInvoice({
  invoiceId: "invoice-42",
});
const invoiceStatus: InvoiceStatus = InvoiceStatus.Success;
const webhookUpdate: Promise<void> = client.setWebhook({ webHookUrl: "" });
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

// @ts-expect-error -- Personal token is required by the public constructor.
new MonobankPersonalClient({});

// @ts-expect-error -- Acquiring token is required by the public constructor.
new MonobankAcquiringClient({});

// @ts-expect-error -- Statement start time must be a Date or Unix number.
void client.getStatements({ account: "0", from: "2026-08-01" });

// @ts-expect-error -- Account types are limited to documented wire values.
const invalidAccountType: AccountType = "gold";

// @ts-expect-error -- Cashback types are limited to documented wire values.
const invalidCashbackType: CashbackType = "Cash";

void invalidAccountType;
void invalidCashbackType;
