import type {
  Account,
  ClientInfo,
  CurrencyRate,
  GetStatementsInput,
  PersonalWebhookEvent,
} from "@liaugust/monobank-sdk";
import {
  AccountType,
  CashbackType,
  MonobankPersonalClient,
} from "@liaugust/monobank-sdk";

const client = new MonobankPersonalClient({ token: "token" });
const input: GetStatementsInput = { from: new Date(0) };
const statements = client.getStatements(input);
const clientInfo: Promise<ClientInfo> = client.getClientInfo();
const rates: Promise<readonly CurrencyRate[]> = client.getCurrencyRates();
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
declare const webhookEvent: PersonalWebhookEvent;

void statements;
void clientInfo;
void rates;
void accountType;
void accountTypesAreExact;
void cashbackType;
void cashbackTypesAreExact;
void account;
void webhookEvent;

// @ts-expect-error -- Personal token is required by the public constructor.
new MonobankPersonalClient({});

// @ts-expect-error -- Statement start time must be a Date or Unix number.
void client.getStatements({ account: "0", from: "2026-08-01" });

// @ts-expect-error -- Account types are limited to documented wire values.
const invalidAccountType: AccountType = "gold";

// @ts-expect-error -- Cashback types are limited to documented wire values.
const invalidCashbackType: CashbackType = "Cash";

void invalidAccountType;
void invalidCashbackType;
