# Requirement audit

Delivery scope changed to a ZIP source package: user will upload to GitHub and Vercel. “Yes” below is limited to explicitly stated local evidence. “No — live” means not verified against the deployed final system; it is not a claim that the homework is complete. Earlier account setup is recorded separately. Complete every live row after deployment.

| Requirement | Implementation | Verified yes/no | Evidence / remaining check |
|---|---|---|---|
| Source homework inspected, all roles and requirements retained | Original DOCX read; requirements applied to source | Yes | Source extraction reviewed during build |
| Aesthetic responsive interface; user name | Cream/green finance desk, mobile layout, Elīze Ļaksa header/footer | Yes — build; No — final visual check | src/app/page.tsx, styles.css |
| Real Supabase source of truth, persistent records | fi_transactions; server REST; no in-memory app data | No — live | Run setup.sql, refresh live page |
| Clean GitHub structure, Vercel-friendly stack | Next.js/TypeScript, pnpm lockfile, server routes | Yes — local | Production build passes |
| Only missing resources created | Existing Supabase reused; dedicated full schema; existing bot/sheet links | Yes — setup inventory | Final schema not applied after ZIP-only request |
| GitHub repository code pushed / Vercel GitHub connection | Ready source archive | No — user deployment | START-HERE-LV.md sections1–3 |
| Real Telegram→Supabase→Vercel→Sheets first milestone | Webhook/shared backend/API sync | No — live | Must run PRACTICE01 before official tests |
| Five employees / demonstration role selector | Fixed employee catalog and select | Yes — local build | page.tsx, rules.mjs |
| Richard/Anastasia/Jean sales only; Kevin expenses only; Svetlana decisions | requireRole and DB RPC role checks | Yes — shared logic tests; No — final live RPC | 11 passing tests; backend HTTP tests still needed |
| Employees only own records; manager all results | Server filters records and joined notification queries | No — live | Test each role after deployment |
| Telegram numeric ID, no self-assignment, unlinked blocked | fi_chats / fi_mappings, manager mapping RPC | No — live | /start and mapping tests |
| Save original Telegram chat and reporter | Immutable source/actor/original_chat_id; webhook replay by update ID | No — live | S01 must survive remap to Kevin |
| Website recipient uses current employee mapping; start bot first | Mapping lookup at delivery, /start prerequisite | No — live | Map Jean after S03 creation, before approval |
| No recipient displays exact required text | “No Telegram recipient linked” status | Yes — source; No — live | server.ts and records UI |
| Required sale fields, timestamp, unique reference | validateSale, DB primary key, created_at default | Yes — validation tests; No — duplicate live test | S01–S05 supported |
| Positive amount, required customer/project/description | Shared validator, decimal cents | Yes | rules.test.mjs |
| Split each0–100, total exactly100 | Integer basis points validator | Yes | 110% test rejects |
| Expense reference/reporter/description/category/amount/proposal/time | validateExpense + fi_transactions | Yes — validation tests | finance.test.mjs |
| Duplicate references across sale/expense refused | One transaction PK, DB advisory lock | No — live | Repeat S01 and E01 through API |
| EUR2dp; no VAT; paid services; earned only | Formatting, labels; integer-cents totals | Yes | Code and calculation tests |
| Pending sale saved, excluded from income/commission, earned0 | Null decision and totals filter | Yes — unit; No — live | Test1 before approval |
| Svetlana approves unchanged/corrected split | approve→decide→atomic fi_decide | Yes — logic; No — live | Test1/Test2 |
| Pool10%, cents residual largest%, tie R/A/J | Shared commission() | Yes | Rounding tests including ties and varying values |
| Commission same project, never separate expense | Derived from approved sale, no expense entry | Yes | totals tests |
| Every expense immediately reduces company | totals subtracts every recorded expense once | Yes | Test1 pending result−300 |
| Overhead auto allocation | fi_create assigns decision overhead | No — final DB integration | Verify E03/E06 |
| Project expenses await allocation; no project deduction yet | Null decision, awaiting bucket | Yes — unit | Test2 E07 contributes company only |
| Confirm or change A/B/overhead without second deduction | Decision separate; totals count each expense once | Yes — unit | Dynamic expense reallocation test |
| Preserve proposal vs final; update same record | Immutable proposal JSON, decision column | Yes — unit; No — live | Original splits preserved tests |
| Repeat approved decision unchanged and no new event/row | DB row lock, return if decision; unique event | Yes — pure logic; No — DB live | Repeat-approval API check |
| May leave pending | Explicit approval only | Yes — unit | S05/E07 retained pending fixture |
| Project/company formula and reconciliation | totals(records) pure cents function | Yes | Both official fixture totals and arbitrary values |
| Dashboard A/B income/commissions/allocated expenses/result | Manager dashboard | Yes — build; No — live data | page.tsx |
| Company overhead/awaiting/total and three commissions | Manager dashboard | Yes — calculation tests | Test2 expected3930 and140/175/215 |
| Manager original proposals and correction controls | Queue + split/allocation forms | Yes — build; No — live | forms.tsx |
| Submission confirmation only after save; correction errors | submit persistence first, then outbox delivery | No — live | Real S01/E01 and invalid submission |
| Sale approval notification all amounts/percentages/change wording | notification(t,'approved') | Yes — message tests; No — transport | S03 message pool150, earned30/45/75 |
| Expense notification ref/amount/description/final/change | notification(t,'approved') | Yes — message test; No — transport | E05 A→B and90 |
| Overhead only initial notice; no S05/E07 approval notice | Events created only on first explicit decision | No — live | Query fi_notifications after Test2 |
| Google Sheet exactly Sales/Expenses with readable separate columns | Existing sheet; setup-integrations.mjs headers/format | Yes — earlier API header readback; No — final records |17 Sales,9 Expenses columns |
| Pending Sheets earned0/approved blank; proposed/final separate | sync() maps values | No — live | Inspect pending records and changed S02/E02 |
| Automatic submissions and decisions update Sheets by reference | Serialized writer, reference lookup, overwrite | No — live | Verify no append duplicates after retry |
| Sync failure preserves transaction, failure label, Retry | Status independent of financial record | No — live | TEST_SHEETS_FAILURE procedure |
| Retry no new transaction/row/totals change | Retry only external processing, row reference lookup | No — live | Failure recovery test |
| Google Cloud project, Sheets API, service account/key | Previously configured resources | Yes — prior setup | valued-crow-509815-j3; API read/write verified |
| Service account Editor; instructor Viewer; no public edit | Existing sharing settings | Yes — earlier UI; recheck final | Sheet link in README and app |
| All credentials and spreadsheet ID server-side Vercel env | server-only module and .env.example | Yes — package structure; No — deployed env | Secret scan before packaging; deploy manually |
| Telegram failure retains decision; failed not sent; retry | Separate notification rows, lease, status | No — live | TEST_TELEGRAM_FAILURE procedure |
| No duplicate webhook transaction on redelivery/remapping | Unique update ID and pre-mapping lookup | No — live | Replay same Telegram update |
| Practice cleanup before Test1 | Manual targeted cleanup procedure | No — live | No official data inserted by this package |
| Test1 actual S01/E01 bot; S02/E02/E03 website | Exact instructions supplied | No — live | docs/TESTING.md |
| Test1 before/after totals, notifications, Sheet corrections, refresh/no duplicates | Fixture calculations pass; live checklist | Yes — calculations only | Must inspect actual external records |
| Test2 retain Test1; all website inputs; remap and decisions | Exact instructions supplied | No — live | S03/S04/S05,E04–E07 |
| Test2 cumulative results, pending and reconciliation | Pure function fixture tests | Yes — calculations only | Not real integration evidence |
| Six rule-enforcement attempts leave totals unchanged | Shared tests and live API examples | Yes — five local logic scenarios; No — DB duplicate/live | Test all live before submission |
| Dynamic future transactions, no hardcoded totals/reset | Totals derived only from records | Yes | Arbitrary37.91 sale and2.73 expense test |
| Final app links/instructions/name | Footer, role help, Telegram/Sheets/GitHub | Yes — source/build | Check clean browser link access |
| Source ZIP secret-free and buildable | Explicit archive allowlist and scan | Yes — packaging check | No .env.local/keys/dependencies included |
| Final security: client bundle and GitHub/Vercel secret exposure | Server-only imports, ignored envs; local bundle scan | Yes — local; No — final deployment | Recheck deployment and repository |
| Clean browser Vercel access | User deployment required | No — live | Open production URL incognito |
| Submit one URL only own Day4 course cell | Manual final instructions | No — user action | No course spreadsheet modifications performed |
| No report/presentation/assessment app | Only app source, setup and required audit/testing documentation | Yes | ZIP contents |

No final deployed system or official homework completion is claimed. Remaining checks need the user's deployment and the real connected services; they are not silently waived.
