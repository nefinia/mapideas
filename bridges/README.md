# Bridges (mapideas.org/bridges)

Bridges is the game for the Epistemic Bridges study: players link two distant ideas, and the study compares how people and AI build those bridges. It lives at mapideas.org/bridges as a small test, not linked from the map yet.

## How it fits in this repo

- `src/worker.js` sends every path under `/bridges` to `bridges/worker.js`. The rest of the map is untouched.
- Its answers go to their own D1 database, `bridges` (binding `BRIDGES_DB`), never to the map's `starloom` database. Tables are already created; `bridges/schema.sql` is the reference.
- Voice is recorded in the browser and transcribed by Workers AI (binding `AI`) in this account. The audio is never stored.
- `public/sw.js` lets `/bridges` go straight to the network, so the offline copy of the map never stands in for it.

## Files

- `index.html`: the live page, built from `prototype/bridges.html` with `python3 bridges/build.py bridges/prototype/bridges.html bridges/index.html`. Edit the prototype, then rebuild.
- `ai-bridges.js`: one AI bridge per pair and direction in five languages, written by Claude Opus 5.5. The model name is saved with every answer that showed one.
- `privacy.html`: the privacy page at `/bridges/privacy`. Contact: sofiag.gallego@gmail.com. Retention with codes until 31 December 2027.

## Data and privacy

- Answers sit under a random player code only. Feedback has no code and keeps the day only; result emails are a separate list with no code and no date.
- Players can delete all their answers with their code from the game.
- Answers under the codes in `BRIDGES_TESTER_CODES` are tester data: left out of the balancing and of any analysis. An optional secret `BRIDGES_TESTER_KEY`, set in the Cloudflare dashboard, lets pilot testers open `/bridges?tester=KEY`.
- `/bridges?debug` shows what a visit records.

## Looking at the data

```
npx wrangler d1 execute bridges --remote --command "SELECT COUNT(*) FROM trials t JOIN players p USING(code) WHERE p.tester = 0"
npx wrangler d1 execute bridges --remote --command "SELECT pair, dir, COUNT(*) FROM trials WHERE skipped = 0 GROUP BY pair, dir"
```

After the results are sent, empty the `emails` table.
