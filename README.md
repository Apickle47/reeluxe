# reeluxe.vip

A free casino manager game set at **The Gilded Ace**, paired with a reproducible Dashboard Royale investigation. Ace uses Google Gemini to propose and test ideas before you spend fictional money.

## Play and investigate

- Website: https://reeluxe.vip
- **Play Casino Manager:** build your floor; use **Test tonight with Ace** to compare 24 variations of a fictional night.
- **Our Casino Findings:** examine the organizer’s historical synthetic data, the ten low earners, and the priced July recommendation.
- Gameplay outcomes are not historical predictions. The entrance animation always lands on 777. No real wagers, payments or prizes.

## Run and test

Requires Node.js 24+. `npm test` runs the application checks. `npm run build` creates static output in `public/`. For full local API support, use `npx vercel dev` with your own server environment variables.

## Deploy on Vercel Hobby

Import this repository, framework **Other**, build command `npm run build`, output directory `public`. The `/api/ace` function runs Gemini on the server.

Set `GEMINI_API_KEY` as a server secret and `GEMINI_MODEL=gemini-3.5-flash-lite`. Never commit a key. The adapter accepts the configured production domains and Vercel’s own deployment URL. Free-tier Gemini quotas may produce a clearly labeled local fallback. Vercel Hobby limits and Google API quotas are separate; do not enable paid billing for this demo.

## Reproducibility and credits

The analytical source is in `analysis/`; generated evidence and methods are in `dist/evidence/`. Obtain organizer data from https://github.com/tamu-datathon-org/dashboard-royale. See `dist/evidence/CLAIMS_AND_EVIDENCE.md` and the source archive for transformation instructions and AI disclosure.

The original holdout is January–April training / May–June testing; do not call it untouched after tuning on it. Placement findings are observational. Net plan outcomes depend on disclosed assumptions.

Virtual Slot Machine, Three.js, and the adapted 2048 local-save component retain their license notices in `dist/vendor/`. Artwork is AI-generated; analytics and game implementation were AI-assisted. See the in-app About panel for attribution and privacy details.
