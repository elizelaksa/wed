# Verification after deployment

Local tests verify pure backend business rules only. All live checks below are still required. Do not preseed S01/E01; send them from the real Telegram account. Keep screenshots/links or observations in REQUIREMENT-AUDIT.md as you verify.

## First milestone
Run setup.sql, configure Vercel, Sheets and webhook. Start the bot, link your numeric ID to Richard using Svetlana's screen. Submit PRACTICE01 via Telegram as described in START-HERE-LV.md. Verify the saved Supabase row, Vercel view after refresh, one Sales row and Telegram confirmation. A failure must be corrected before proceeding. Remove only explicitly identified practice transactions and their Sheet rows before Test 1. No automatic cleanup/reset is included.

## Test 1
Start bot and link your ID to Richard, then send:
```text
/sale | S01 | Olivia Rose | A | One proud uncle and an emotional grandmother | 1000 | 50,30,20
```
Remap the SAME Telegram ID to Kevin in Svetlana's setup screen. Send:
```text
/expense | E01 | Rented suit and fake pearl necklace for the relatives | 120 | Materials | A
```
S01 must still show Richard, source telegram and its original chat ID in Supabase. Do not modify that chat ID when remapping.

Use website demonstration roles for the following:

| Reference | Role | Customer / Description | Project or allocation | Amount | Split or category |
|---|---|---|---|---:|---|
| S02 | Anastasia | Daniel King / University friends, dancing, and the stripping performance | B | 2000 | 0 / 50 / 50 |
| E02 | Kevin | Taxi for the grandmother; Kevin selected the wrong project | B | 80 | Travel |
| E03 | Kevin | Monthly company website subscription | Company overhead | 100 | Other |

Before decisions: S01/S02 pending; E01/E02 awaiting allocation; E03 allocated overhead. Approved income and commission zero, A/B results zero, company −€300. All five records must exist in Sheets, pending earned commissions zero and approved splits empty.

As Svetlana approve S01 unchanged, S02 with 20/40/40, E01 to A, E02 changed B→A. Check S01 notification still arrives in its original chat despite remapping. For website salesperson without mapping display “No Telegram recipient linked”. E03 needs no approval notification.

Expected: income A1000/B2000/company3000; commission A100/B200/company300; allocated expenses A200/B0; overhead100; awaiting0; results A700/B1800/company2400; earned Richard90/Anastasia110/Jean-Claude100. Check actual Sheets S02 original vs final split and E02 original B vs final A; exactly 2 sales rows and 3 expense rows. Refresh browser. Fix all failures before Test 2.

## Test 2 — retain all Test 1 data
Enter through website with the correct role:

| Ref | Role | Customer | Description | Project | Amount | Proposed split |
|---|---|---|---|---|---:|---|
| S03 | Jean-Claude | Emma Stonebridge | Premium relatives, including an uncle presented as a surgeon | A | 1500 | 40 / 40 / 20 |
| S04 | Richard | Lucas Green | Small group of loud university friends | B | 800 | 25 / 25 / 50 |
| S05 | Richard | Mia Brooks | Extra guests and an embarrassing speech | B | 600 | 100 / 0 / 0 |

Kevin enters:

| Ref | Description | Category | Amount | Proposed allocation |
|---|---|---|---:|---|
| E04 | Replacement costumes after an enthusiastic dance performance | Materials | 250 | B |
| E05 | Minibus for university friends; Kevin selected the wrong project again | Travel | 90 | A |
| E06 | Company telephone subscription | Other | 60 | Company overhead |
| E07 | Emergency replacement clothing; project allocation still needs checking | Materials | 140 | A |

Before approving S03 map your Telegram account to Jean-Claude. Change split to 20/30/50 and approve. Receive changed-split notification: pool150, Richard30, Anastasia45, Jean-Claude75. Approve S04 unchanged; leave S05 pending. Before approving E04/E05 remap to Kevin. Approve E04 to B, change E05 A→B. Verify €90 moved A→B notification. Leave E07 awaiting allocation. S05/E07 must have no approval notification.

Expected cumulative results (EUR):

| Metric | A | B | Company |
|---|---:|---:|---:|
| Approved income | 2500 | 2800 | 5300 |
| Commission | 250 | 280 | 530 |
| Allocated expenses | 200 | 340 | 540 |
| Result | 2050 | 2180 | 3930 |

Company overhead160, awaiting allocation140. Commission earned Richard140, Anastasia175, Jean-Claude215. Reconciliation 2050+2180−160−140=3930. Exactly 5 Sales and 7 Expenses rows; no duplicate reference. Pending S05 excludes600 from income and earns0. Awaiting E07 already reduces company by140.

## Processing-layer enforcement
Use browser DevTools Network to repeat `/api/action` POSTs with explicit role payloads (or curl); UI hiding is not sufficient. Save control totals before each attempt:
```json
{"action":"approve","actor":"richard","reference":"S05","input":{"split":[100,0,0]}}
```
Expected HTTP400, denied. Similarly try `action:sale,actor:kevin` with a fully populated sale; split60/30/20 as Richard; missing or zero expense amount as Kevin; a duplicate S01 or E01 reference. Each must return an error and leave totals/row counts unchanged. Retry S01 approval as Svetlana with any valid split; it must retain the first final decision and totals, with one notification event and one Sheet row. Invalid/unknown actor must fail. Unlinked Telegram accounts cannot submit or assign themselves a role.

## Sheets failure and recovery
After Test 2 use existing approved S01 to avoid changing control totals. Set Vercel `TEST_SHEETS_FAILURE=1`, redeploy, and invoke Retry on S01 (repeat idempotent approval via API is also supported). Verify Supabase record remains, status Sync failed, totals unchanged. Restore `TEST_SHEETS_FAILURE=0`, redeploy, click Retry. Verify Synced, same S01 row updated, no duplicate row/transaction, unchanged totals.
For a new-submission failure test, do it with a PRACTICE reference before official Test1: failure after save must still preserve the transaction and show Sync failed. Retry must not add another transaction.

## Telegram delivery failure
Perform before official tests with a PRACTICE sale and a linked user. Set `TEST_TELEGRAM_FAILURE=1`, redeploy; approve the practice sale. Verify decision and financial effects persist; `fi_notifications` approved event is Failed, never Sent. Restore switch0, redeploy, Retry; receive the approval and verify Sent. Do not test this by approving S05, which must remain pending. Overhead gets only submitted event. For ambiguous network timeout, check the chat before retrying; Telegram cannot guarantee exactly-once transport.

## Final checks
Verify GitHub excludes .env.local/private JSON/tokens, Vercel server variables are not NEXT_PUBLIC_, no client bundles contain secret values, Sheets link works as Viewer in private browsing (no public editing), GitHub link is accessible, and Vercel opens without login in a clean browser session. Enter one additional arbitrary-value practice transaction BEFORE official tests to verify dynamic totals. No fixture values are loaded by application code. Update audit evidence and only then submit the Vercel URL to your own Day4 cell.
