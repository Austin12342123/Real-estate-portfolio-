# Data schema v22 (plan, Nov 21 2026)

## 2. Data schema v22 (final for NOW; NEXT/LATER additions marked)
Envelope on every record: id (UUID v4, or UUID v5 for imported rows, see 2b), createdAt, updatedAt (ms, display only), deleted?, and from NEXT: hlc, rev, deviceId, fc (field clocks, mutable types only).
- Portfolio { id, schemaVersion: 22, updatedAt, assumptions, personal, entities[], accounts[], assets[], units[], leases[], loans[], ledger[], rules[], notes[], depreciables[] (NEXT, v23), closedMonths[] (NEXT), budgetOverrides (NEXT), meta { goal, deviceId, csvProfiles[], lastBackupAt, theme, moneyView, futureYear (C2; null = plan's last year), inflationMode (IF1; auto | custom), learn { done[] } } }
- Note { id, text, pinned, assetId? } (top-level, syncs per record; N1). meta.theme is one of oxford | clay | cottagecore | technoir | darkacademia | ember (TH1; a saved coastal, barbiecore or y2kcyber maps to oxford, clay or ember). Theme tokens: 11 colors plus fontDisplay, fontBody, radius, and optional fontWeightBody, fontWeightHeading, fontWeightNumbers, fontStroke (portfolio-plan/themes.json). meta.moneyView is today | future | todaySub, default today (C2).
- Snapshots live only in the local IndexedDB `snapshots` store. They are never synced and never part of Portfolio.
- Entity { id, name, kind: personal | llc | trust, taxTreatment: schedE | partnership | other (NEXT) }
- Account { id, entityId, name, kind: operating | reserve | deposit } (NEXT); LATER BankLink points at an Account.
- Asset = today's fields (money in cents) + entityId + landPct, placedInService, assumptionSource: manual | blended (NEXT) + market, groupTags[] (LATER)
- Unit { id, assetId, label } (top-level array)
- Lease { id, unitId, tenantName, rentCents, depositCents, start, end?, dueDay } (rentCents and dueDay required)
- Loan { id, assetId, lender, originalAmountCents, rate, termMonths, startDate, ioMonths, balloonMonth?, escrowTaxCents, escrowInsCents, rateType: fixed | arm, resetDate?, resetCap?, balanceAsOf { date, amountCents } }
- LedgerEntry { id, date YYYY-MM-DD, amountCents (signed: money in +, money out -), entityId, accountId?, assetId?, unitId?, category, memo, source: manual | csv | bank | receipt | rent, externalId?, needsReview?, oneOff?, loanId?, transferId?, receiptId?, importedTxnId?, splitGroupId? }
- Rule { id, match: contains | regex, text, amountSign?, category, assetId?, unitId?, priority } (top-level collection, not meta, so it syncs per record)
- Depreciable { id, assetId, basisCents, landCents, placedInService, lifeMonths: 330 | 468, disposedOn?, priorAccumulatedOverrideCents? } (NEXT)
- LATER collections: Membership, Invite, AuditEvent, ImportedTxn, BankLink, Receipt, RentPayment, Partner, ReportShare, ApiKey, WebhookEndpoint (fields as in later.md).
- Indexes: ledger by (entityId, date) and (assetId, date).

### 2b. Imported row ids (resolves NOW P16 vs NEXT P5.4)
- externalId = bank transaction id when present, else NOW's content hash sha1(date|cents|normalizedMemo|n).
- Ledger id for imported rows = UUIDv5(PORTFOLIO_NS, entityId|source|externalId). The same file imported on two devices produces the same id and merges as one row.
- A CSV row and a bank-feed row for the same payment have different externalIds; LATER's matcher pairs them in the ImportedTxn staging step (same cents, date within 3 days, same account) before either reaches the ledger.
