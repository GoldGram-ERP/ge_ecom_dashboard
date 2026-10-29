# GoldGram staff dashboard

The staff tool for the GoldGram shop: prices, orders, customers and KYC, the catalog, discount
rules, administrators, payment methods, geography, settings and the outbox (the local stand-in
for email). Next.js 16 (App Router, TypeScript), Tailwind CSS v4, and library components:
animate-ui first (`src/components/animate-ui`), shadcn/ui where animate-ui has none
(`src/components/ui`). No raw HTML controls and nothing the browser draws by itself (selects,
date pickers, number spinners, scrollbars). `GoldGram Dashboard Admin.html` decides the screens
and the business rules, not the look. English, with an `EN / ع` switch. The contract it
follows is `docs/SPEC.md` (section 5 "Admin", AC-20 to AC-28).

## Run

```powershell
pnpm install
pnpm dev        # http://localhost:3101
```

The backend (`apps/backend`, port 4000) must be running. The admin login is in `apps/backend/.env`
(`ADMIN_EMAIL`, `ADMIN_PASSWORD`).

| Command | What it does |
|---|---|
| `pnpm dev` | Development server on port 3101 |
| `pnpm build` then `pnpm start` | Production build, served on port 3101 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `next typegen` then `tsc --noEmit` |
| `pnpm test` | Unit tests (Vitest) |
| `npx e2e run` in `e2e-tests` (project root) | End-to-end tests of every screen, on the running apps |
| `npx e2e run tests/visual.e2e.ts` in `e2e-tests` | Every screen against its stored image, at desktop and phone width (`-u` after an intended change) |

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `API_URL` | `http://localhost:4000` | Where the backend listens |

Copy `.env.example` to `.env.local` to change it.

## How it talks to the backend

- The browser only calls same-origin `/api/...`; `next.config.ts` rewrites that to `API_URL`.
  No CORS, and nothing is kept in `localStorage`.
- Server Components call `API_URL` directly and forward the `gg_admin` cookie (`src/lib/api-server.ts`).
- The layout of the `(app)` route group checks `GET /api/admin/auth/me` and redirects to `/login` on `401`.
- Amounts are integer piastres in the API and EGP on screen; the conversion is in `src/lib/money.ts`
  and never uses floating point.

## Layout of the code

- `src/app/login` is the sign-in page; `src/app/(app)` holds every protected page. Each page file
  reads top to bottom: fetch the data, then the table or form as plain JSX. A page that changes
  data has its client files next to it (`prices/price-forms.tsx`, `orders/order-filters.tsx`).
- `src/components` holds what repeats across screens: the shell (sidebar and top bar), the modal,
  the toast, the count cards, the paging row, the switch, the inline number field and the order
  action button.
- `src/lib` holds the API helpers (`api.ts` for the browser, `api-server.ts` for Server
  Components), `use-send.ts` (send a change, toast, reload), money, labels, date formatting, URL
  query helpers and the types that mirror section 5 of the spec.

The dashboard shows what the API returns. It never works out a price or a total, and the order
buttons are only a convenience: the server decides whether a status change is allowed.

## Deploying to Hostinger

Hostinger's build servers cannot compile Next 16 (their GLIBC is 2.28), so the app is uploaded ready-made. On a Linux machine with Docker (the VPS will do), from a checkout or an exported `git archive` of `master`:

```bash
API_URL=https://goldgram-api.178-16-130-122.sslip.io scripts/hostinger-zip.sh app.zip
```

It builds the standalone server in `node:22`, zips it with a no-op build script, then unzips that zip and starts it to prove it runs. Upload the zip to the site as `app.zip` and start a Node.js build (Next.js, pnpm, Node 22, output `.next`). `API_URL` is baked into the `/api` rewrite at build time, so it must be the live backend.
