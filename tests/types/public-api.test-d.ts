import type {
  Account,
  ClientInfo,
  CurrencyRate,
  GetStatementsInput,
  PersonalWebhookEvent,
} from "@liaugust/monobank-sdk";
import { MonobankPersonalClient } from "@liaugust/monobank-sdk";

const client = new MonobankPersonalClient({ token: "token" });
const input: GetStatementsInput = { account: "0", from: new Date(0) };
const statements = client.getStatements(input);
const clientInfo: Promise<ClientInfo> = client.getClientInfo();
const rates: Promise<readonly CurrencyRate[]> = client.getCurrencyRates();
declare const account: Account;
declare const webhookEvent: PersonalWebhookEvent;

void statements;
void clientInfo;
void rates;
void account;
void webhookEvent;

// @ts-expect-error -- Personal token is required by the public constructor.
new MonobankPersonalClient({});

// @ts-expect-error -- Statement start time must be a Date or Unix number.
void client.getStatements({ account: "0", from: "2026-08-01" });
