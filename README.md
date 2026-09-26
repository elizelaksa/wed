# Friends Included Finance

A Next.js + TypeScript finance desk for Elīze Ļaksa's Day 4 homework.
Start with **[START-HERE-LV.md](START-HERE-LV.md)** for GitHub, Supabase, Vercel, Google Sheets and Telegram setup.

- Supabase is the source of truth. `supabase/setup.sql` creates the complete schema and server-only RPCs without seeding transactions.
- Website and Telegram share validation, approval, cent rounding and notification logic.
- Sales remain pending until Svetlana approves; all paid expenses reduce company result immediately.
- Separate original proposals and final decisions; atomic idempotent approvals and unique references.
- Automatic Google Sheets API synchronization by reference with a serialized writer, row reuse and Retry.
- Telegram user ID mapping, original bot chat retention, separate delivery statuses and Retry.
- Open demonstration role selector; deliberately no production authentication system. Backend enforces allowed operations for the chosen role and exposes only its own records to employees.

**Delivery status:** source package built and tested locally. This package has not been deployed or end-to-end verified. Official Test 1 and Test 2 have not been inserted. Follow [the live test plan](docs/TESTING.md) and [requirement audit](docs/REQUIREMENT-AUDIT.md). Automated fixture tests do not replace real bot and Sheets evidence.

Node 24; `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`.
Store all six credentials/configuration variables on the server in Vercel. Never use `NEXT_PUBLIC_` for secrets. Never commit `.env.local` or Google JSON keys. `.env.example` contains no credentials.

Integration retries do not create new financial transactions. Network timeouts can leave Telegram delivery uncertain (Telegram sendMessage has no idempotency key); such a delivery is marked failed rather than falsely sent. Inspect the chat before retrying an uncertain delivery. A lost request process can leave a lease briefly active; retry after 3 minutes. Every retry reads current Supabase data.
