import { statementItemFixture } from "./statements.js";

export const personalWebhookEventFixture = {
  data: {
    account: "account-id",
    statementItem: statementItemFixture,
  },
  type: "StatementItem",
} as const;
