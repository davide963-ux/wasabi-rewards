# WASABI · HODL Rewards (v3 — UI overhaul)

Same backend as v2 (Postgres on Neon, Helius polling, DexScreener mcap, admin
panel, 7-day duration tier rules) — totally rebuilt UI to match the
wasabicheese.com brand: dark mint, hot pink, ALL CAPS punchy headlines,
Spicy-O-Meter, mascot bobbing, marquee live ticker.

## What's new in v3

- **SCSS modules** instead of plain CSS (`sass` package added)
- **New visual system**: dark mint/black palette, Bricolage Grotesque display
  font, pink hot accent, cheese/spice emojis drifting in the background
- **Hero** with sunglasses Wasabi mascot bobbing, "BIGGER BAGS. HOTTER REWARDS."
- **Spicy-O-Meter** — the mcap progress bar reimagined as a heat gauge with
  Mild → Medium → Spicy → Nuclear zones and the mascot riding the bar
- **Live ticker** marquee scrolling holder activity
- **Tier cards** with flame badges (🔥 → 🔥🔥🔥🔥) and hover tilt animations
- **How it works** — 3-step visual with buff Wasabi mascot crashing in
- **Leaderboard** with streak heat indicators (🔥 / 🔥🔥 / 🔥🔥🔥 by days held)
- **Past winners** "Faces Melted" section with trophy cards
- **Community footer** with social blocks, contract address with copy button,
  smoking Wasabi mascot easter egg
- **Animations everywhere**: bobbing, shake, glow, flame flicker, marquee,
  shimmer, pulse, wobble — all CSS keyframes, lightweight
- **Reduced-motion aware** — animations disable for users who prefer it

## CRITICAL: Drop the mascot images before deploying

After unzipping, put these 4 PNGs in `public/mascot/`:

- `logo.png` — the smiley wasabi (your logo image)
- `sunglasses.png` — the cool wasabi
- `buff.png` — the flexing wasabi with cash
- `smoking.png` — the smoking wasabi

The site references `/mascot/<filename>.png` directly. Without these the page
will still load but mascot spots will be empty.

## Required env vars

Same as v2:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Neon Postgres connection string |
| `HELIUS_API_KEY` | from helius.dev |
| `WASABI_MINT` | `DSZeB6pCzZsM43gTz7jakiYeCafinsNMKcpeB1FApump` |
| `CRON_SECRET` | random ≥32 chars |
| `ADMIN_PASSWORD` | your admin login password |
| `SESSION_SECRET` | random ≥32 chars (different from CRON_SECRET) |
| `DEXSCREENER_PAIR` | `5fc4vroj4n4dqtznt936y81eer3tyft2shn37qrmcq22` |
| `NEXT_PUBLIC_DEXSCREENER_URL` | `https://dexscreener.com/solana/5fc4vroj4n4dqtznt936y81eer3tyft2shn37qrmcq22` |
| `NEXT_PUBLIC_TOKEN_SYMBOL` | `WASABI` |

## Tier rules (unchanged from v2)

| Tier | Holding % | Duration |
|------|-----------|----------|
| Platinum 🔥🔥🔥🔥 | ≥ 1.00% | 7 days continuous |
| Gold 🔥🔥🔥 | 0.70 – 0.99% | 7 days continuous |
| Silver 🔥🔥 | 0.50 – 0.69% | 7 days continuous |
| Bronze 🔥 | 0.35 – 0.49% | 7 days continuous |

Below 0.35% = not tracked. Sells below 0.35% reset the streak.

## Routes

- `/` — public dashboard with all the new fancy stuff
- `/admin/login` — admin login
- `/admin` — admin panel (goals, winners, exclusions)

## Backend (unchanged from v2)

All API endpoints, DB schema, and polling logic untouched. Cron-job.org keeps
hitting `/api/cron/poll` every 2 minutes, same auth header, same behavior.

## Deploy

Same as v2 — replace files in your GitHub repo, Vercel auto-deploys, env vars
already set, cron-job.org already configured. The only post-deploy step is
dropping the 4 mascot images into `public/mascot/`.
