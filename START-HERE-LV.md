# Friends Included — Elīze Ļaksa

Šis ZIP satur lietotnes pirmkodu, nevis jau izvietotu mājasdarbu. Tu pati ievieto kodu GitHub un izvieto Vercel. Nekādi testa darījumi netiek automātiski ievadīti, un summas nav iekodētas lietotnē. Oficiālie Test 1 un Test 2 jāizpilda pēc izvietošanas; S01 un E01 obligāti jānosūta īstajā Telegram botā.

## 1. GitHub
1. Atarhivē ZIP (Mac: dubultklikšķis).
2. Atver https://github.com/elizelaksa/friends-included-finance savā kontā.
3. Izvēlies **Add file → Upload files** (tukšā repozitorijā **uploading an existing file**).
4. Ievelc atarhivētās mapes SATURU, nevis pašu ZIP. Repozitorija saknē jābūt `package.json`, `src`, `supabase`, `scripts`, `pnpm-lock.yaml`.
5. Saglabā ar **Commit changes**. Repozitorijam jābūt pasniedzējam pieejamam.

Arhīvā nav `.env.local`, Google privātās atslēgas vai Telegram tokena. Ja Finder nerāda `.env.example` un `.gitignore`, nospied Command+Shift+punktu. Augšupielādē arī šos divus nekaitīgos paraugfailus. Nekad neaugšupielādē savu aizpildīto `.env.local`.

## 2. Supabase
Esošais projekts: `https://supabase.com/dashboard/project/onwwlgjitfbuihmklyem`.
Atver **SQL Editor → New query**, iekopē visu `supabase/setup.sql` un nospied **Run**. Šis fails izveido pilno shēmu ar `fi_` prefiksu un saglabā agrākās tabulas. Tas neievada pārbaudes darījumus. Neizmanto veco pirmā posma migrāciju — tā arhīvā nav iekļauta.

## 3. Vercel
1. Atver Vercel savā kontā → **Add New → Project**.
2. Importē GitHub repozitoriju `friends-included-finance`.
3. Framework: **Next.js**. Root Directory: mape, kurā atrodas `package.json` (parasti sakne). Node.js: **24.x**.
4. Zem **Environment Variables** ievadi tālāk norādītos servera mainīgos. Izmanto precīzus nosaukumus, bez `NEXT_PUBLIC_`.
5. Spied **Deploy**. Ja mainīgos pievieno vēlāk, veic **Redeploy**.

| Nosaukums | Ko ievadīt |
|---|---|
| `SUPABASE_URL` | `https://onwwlgjitfbuihmklyem.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings → API Keys esošā Secret key (`sb_secret_…`) vai legacy service_role atslēga |
| `TELEGRAM_BOT_TOKEN` | @weddingtask_bbot tokens no BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Nejauša gara slepena virkne; tā pati vērtība jāizmanto webhook uzstādīšanā |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Viss lejupielādētā Google service-account JSON faila saturs, ieskaitot `{}`; Vercel vērtības laukā bez papildu ārējām pēdiņām |
| `GOOGLE_SPREADSHEET_ID` | `1xEAkjsaR-hMR-qZTiCHCGokJ5Fxw6iJkmfBMhTKTrDs` |

Google JSON fails tika saglabāts Downloads mapē ar nosaukumu `valued-crow-509815-j3-57e8af76b60d.json`. Tas ir slepens un ZIP/GitHub nav vajadzīgs. Vercel vērtības laukā ielīmē tā saturu, nevis faila nosaukumu.

## 4. Google Sheets
Esošā tabula: https://docs.google.com/spreadsheets/d/1xEAkjsaR-hMR-qZTiCHCGokJ5Fxw6iJkmfBMhTKTrDs/edit
Google Cloud projekts: `valued-crow-509815-j3`.
Service account: `friends-included-sheets@valued-crow-509815-j3.iam.gserviceaccount.com`.
Sheets API jau ieslēgta; šim kontam jau piešķirts Editor, saites skatītājiem — Viewer. Pārbaudi šīs atļaujas pirms iesniegšanas. Publisku rediģēšanu neieslēdz.
Ja veido no jauna: izveido Google Cloud projektu, ieslēdz Sheets API, izveido service account un JSON key, izveido tabulu un kopīgo to kontam kā Editor. Pasniedzējam piešķir Viewer. Iestādes aizlieguma gadījumā nepieciešama Google Cloud administratora palīdzība; manuāla kopēšana neaizstāj API.

Tabulai vajag tieši divas datu lapas **Sales** un **Expenses**. Esošās galvenes ir sagatavotas. Pēc izvēles tās var atjaunot ar zemāk aprakstīto `sheets` komandu; darījumu rindas netiek dzēstas.

## 5. Telegram savienojums (obligāti pēc Vercel deploy)
Ar Vercel lapas izveidošanu vien nepietiek — jāreģistrē webhook.
Mac lietotnē **Терминал** atver atarhivēto projekta mapi. Vajadzīgs Node.js 24 no nodejs.org. Nokopē `.env.example` uz `.env.local` un aizpildi servera vērtības lokāli. Katra vērtība paraugā ir vienpēdiņās; Google JSON jāievieto vienā rindā, saglabājot tā `\n` simbolus.

Komandas projekta mapē:
```sh
node scripts/setup-integrations.mjs secret
```
Iegūto nejaušo virkni ielīmē `TELEGRAM_WEBHOOK_SECRET` gan Vercel, gan lokālajā `.env.local`. Ja Vercel vērtība mainīta, veic Redeploy. Pēc tam:
```sh
node scripts/setup-integrations.mjs webhook https://TAVA-LAPA.vercel.app
```
Aizstāj adresi ar savu publisko Vercel URL. Skripts pārbauda reģistrēto webhook adresi. Tas neizdrukā bot tokenu. Vercel lapai un `/api/telegram` jābūt publiski sasniedzamiem, bez Vercel deployment login aizsardzības; izmanto Production URL.

Ja nepieciešams atjaunot Sheets galvenes:
```sh
node scripts/setup-integrations.mjs sheets
```

Atver https://t.me/weddingtask_bbot un nosūti `/start`. Bots atbildēs ar tavu ciparu Telegram user ID. Mājaslapā izvēlies **Svetlana → Switch role → Telegram setup**, ievadi ID un izvēlies Richard. Telegram lietotājvārds `@…` šo ID neaizstāj.

## 6. Pirmā integrācijas pārbaude
Pirms oficiālajiem testiem nosūti botā:
```text
/sale | PRACTICE01 | Practice customer | A | Integration check | 12.34 | 50,30,20
```
Pārbaudi ierakstu Supabase `fi_transactions`, Vercel, Sheets Sales un bota atbildi. Tikai tad turpini oficiālos testus. Pirms Test 1 noņem PRACTICE ierakstus Supabase (ar saistītajiem paziņojumiem) un Sheets; neizdzēs galvenes vai oficiālos darījumus. `docs/TESTING.md` satur precīzāku pārbaudes plānu. Nav automātiskas datu atiestatīšanas.

## 7. Mājasdarba pabeigšana
Izpildi `docs/TESTING.md` secībā Test 1, pēc tam Test 2, saglabājot Test 1 datus. Pārbaudi reālo Telegram, Sheets, atkārtotas apstiprināšanas un kļūmju scenārijus. `docs/REQUIREMENT-AUDIT.md` skaidri nodala lokāli pārbaudīto no vēl nepārbaudītā.

Pēc visām pārbaudēm atver kursa tabulu:
https://docs.google.com/spreadsheets/d/1AZ__P96ArJzLLTs6kGVPPIDS8229bhYcKgGu6I8O7wk/edit
Ievieto vienu strādājošu Vercel URL tikai **Elīze Ļaksa** rindas **Day 4** mājasdarba ailē. Citu dalībnieku laukus nemaini.

## Lokāla izstrāde
```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```
Arhīvs neietver `node_modules`; Vercel atkarības instalēs pati. Aprēķinu testi ir izolēti un neievieto oficiālos datus Supabase vai Sheets.
