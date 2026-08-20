# Security Policy

Report vulnerabilities privately through GitHub Security Advisories for this
repository. Do not open public issues, discussions, or pull requests that
contain credentials or banking payloads.

Credential material includes Personal and Acquiring tokens, Corporate `X-Sign`
values and key identifiers, Corporate private keys, Installments store secrets,
stored-card tokens, and monopay private keys. Sensitive payloads include webhook
URLs and raw authenticated bodies, account identifiers, statements, client
profiles, raw PAN/CVV data, Apple Pay or Google Pay crypto-containers,
split-receiver business identifiers, and Installments guarantee-letter identity
documents. Never paste, log, serialize, or commit any of them.

If you need to demonstrate a problem, use redacted fixtures or synthetic data.
The SDK test suite must keep using injected Fetch stubs and must not require
live Monobank credentials.
