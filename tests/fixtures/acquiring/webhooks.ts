export const acquiringWebhookPublicKeyFixture = {
  key: "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFQUc1LzZ3NnZubGJZb0ZmRHlYWE4vS29CbVVjTgo3NWJSUWg4MFBhaEdldnJoanFCQnI3OXNSS0JSbnpHODFUZVQ5OEFOakU1c0R3RmZ5Znhub0ZJcmZBPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==",
} as const;

export const validAcquiringWebhookSignatureFixture = {
  body: `{
  "invoiceId": "fixture-invoice",
  "status": "success"
}`,
  publicKey:
    "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFZGZkUEZGSkNscExuRlBtbTBTYWc1QVVqd2VZUApFSGk3b2ljMVFxQTNnTDduUGZvTVVwZzM5cFEvY09EaTlqSEhlWDBYaTVnREdLc2N3MVJxWDhXSFpnPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==",
  signature:
    "MEUCIFlQB5//AmyHBOh1IgwCxwAJen1LuxOP1dHuAMIaWkmKAiEArcVDB/yKg3VKSnDw/cWQ3IeHMXsuNS8atAB7AjAspzA=",
} as const;
