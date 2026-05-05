# Ritual Identity Generator

A **Next.js** app that forges stylized **1024×1024 profile cards** for avatars (X, Discord, etc.). The forge UI, ritual sequence, and **canvas** compositing run in the browser; portrait bytes are loaded from **same-origin API routes** (no third-party image API or remote model).

## What it does

- **Home** — Landing with a single CTA into the forge.
- **Forge (`/forge`)** — Two independent flows side by side:
  - **Binding parameters** — Pick archetype, element, intensity, mood, optional visual style, frame, and optional X handle. A deterministic seed maps your choices to one of **147** ritual portraits (metadata in `data/images.ts`, files under `private-assets/ritual/`) and generates a ritual name + rarity.
  - **Realm generator** — Optional handle, pick one of eight **worlds** (ocean, volcanic, …). Each world reads **`.png` or `.webp`** rasters from `private-assets/ritual/<world>/` on the server (safe basenames, no public directory listing). A protected API returns **one** random file per forge; if a folder is empty, it falls back to the main portrait pool.
- **Exports** — Download raw portrait PNG, full card PNG, tweak glitch/contrast on the result, optional post to X.
- **On-chain mint (Ritual)** — Mint the generated card as ERC-721 (`RitualPFP`) from the forge result screen. Metadata + artwork are embedded as a data URI in `tokenURI` (no IPFS). Gas estimate is prefetched after the card render completes, before pressing Mint.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) · React 19 · TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- Canvas-based card renderer in `src/lib/ritual-canvas.ts`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Production build:

```bash
npm run build
npm start
```

## On-chain mint setup (Ritual 1979)

Set these in `.env.local`:

```env
NEXT_PUBLIC_RITUAL_PFP_ADDRESS=0x...
NEXT_PUBLIC_RITUAL_RPC_URL=https://rpc.ritualfoundation.org
NEXT_PUBLIC_RITUAL_EXPLORER_URL=https://explorer.ritualfoundation.org
PRIVATE_KEY=0x...
RITUAL_RPC_URL=https://rpc.ritualfoundation.org
```

- `NEXT_PUBLIC_RITUAL_PFP_ADDRESS` is required to enable the mint panel.
- `PRIVATE_KEY` + `RITUAL_RPC_URL` are used by the Hardhat deploy script.
- Keep `.env.local` private and never commit real keys.

### Deploy contract

```bash
npm run deploy:pfp
```

Copy the deployed address into `NEXT_PUBLIC_RITUAL_PFP_ADDRESS`, then restart the app.

### Mint and gas notes

- Mint is free at contract level; users pay network gas in RITUAL.
- The gas number is from RPC simulation of the real `mint(tokenURI)` call (not random).
- Bigger on-chain image payloads usually cost more gas than tiny payloads.
- Wallet-confirmed final fee can differ slightly from the estimate.

## Assets (in repo)

`private-assets/ritual/` is **tracked in Git** (WebP for shipped art). Clone + `npm install` + `npm run build` is enough; no separate asset sync.

- **Main pool** — `ritual-001` … `ritual-147` as `.webp` or `.png`. Defaults assume **`.webp`** (`data/images.ts` via `src/lib/ritual-main-ext.ts`). For a **PNG-only** tree, set `NEXT_PUBLIC_RITUAL_IMAGE_EXT=png` and rebuild. The image route accepts either extension and can fall back if only one exists on disk.
- **Realm folders** — `private-assets/ritual/<world>/` with safe `*.png` or `*.webp` basenames (`src/lib/realm-raster-filename.ts`). Worlds: `ocean`, `volcanic`, `clockwork`, `glass`, `ancient`, `energy`, `mystical`, `cosmic`.

### New PNGs → WebP (batch)

```bash
npm run convert-webp -- --quality=92 --delete-png
```

See `private-assets/README.md`. Other options: `--lossless`, `--quality=N`. [oxipng](https://github.com/shssoichiro/oxipng) helps if you stay on PNG only.

### What should **not** be in Git

| Ignore (already in `.gitignore`) | Why |
|----------------------------------|-----|
| `node_modules/`, `.next/`, `out/` | Generated |
| `.env*` | Secrets / local overrides |
| `.vercel` | Local link to Vercel |

Do **not** commit OS junk if it appears (`.DS_Store` is ignored). Optional: add `*.psd`, `*.zip` at repo root if you keep sources next to the app.

Tiny **placeholder** main pool only (not realm art):

```bash
node scripts/write-ritual-pngs.mjs
```

## API routes (server)

| Route | Role |
|--------|------|
| `GET /api/ritual-image/[filename]` | Serves `ritual-NNN.png` or `.webp` from `private-assets/ritual/` |
| `GET /api/ritual-image/[filename]/[realmImage]` | Serves a realm raster; first segment is world slug |
| `POST /api/ritual-realm-pick` | Returns **one** chosen filename (never lists the folder) |
| `GET /api/ritual-cooldown` | Opaque blocked keys for global cooldown |
| `POST /api/ritual-assignment` | Registers a pick for cooldown (`file`, optional `world` for realm) |

There is **no** endpoint that enumerates all images.

## Deploying on Vercel

1. Push this repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Framework preset: **Next.js**. Build: `npm run build`, output: default.
3. **`private-assets/` ships with the repo** — API routes read it from the deployment filesystem at runtime. Watch your plan’s **total deployment / uncompressed size** limits if the asset tree grows large again.
4. PNG-only deploy: set `NEXT_PUBLIC_RITUAL_IMAGE_EXT=png` in the Vercel environment and redeploy.
5. **Cooldown store** is in-memory per server instance (`src/lib/ritual-cooldown-server.ts`). For many edge instances, replace with Redis / Upstash if you need a single global map.

**Self-hosted (`next start` on a VPS)** is also fine; same repo layout.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run deploy:pfp` | Deploy `RitualPFP` contract to Ritual network |
| `npm run convert-webp` | PNG → WebP under `private-assets/ritual/` (see script header for flags) |

## License

Private / all rights reserved unless you add a `LICENSE` file.
