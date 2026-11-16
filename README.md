# The Map of Ideas

The code behind [mapideas.org](https://mapideas.org): a public, non-linear map where ideas grow and relate, with readings in both directions, answers, open questions and sources. It also serves the Bridges game at [mapideas.org/bridges](https://mapideas.org/bridges).

A shared constellation of ideas, starting from Gödel. One Cloudflare Worker serves the site and the API; data lives in D1.

## Set up (once)
1. Put this folder in a GitHub repo. In Cloudflare go to Workers and Pages > Create > Import a repository, choose the repo, keep the defaults (deploy command `npx wrangler deploy`). Every push to `main` then redeploys the site. The database tables already exist (`schema.sql`), and the Gödel map fills itself in the first time the site is opened.
2. Secrets: in Cloudflare open the Worker "themap" > Settings > Variables and Secrets, and add (type Secret):
   - `SESSION_SECRET`: any long random text
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google Cloud Console > APIs and Services > Credentials > Create credentials > OAuth client ID > Web application. Add the redirect URI `https://<your address>/auth/callback`, and on the consent screen choose "In production" so anyone can sign in.
   - `ANTHROPIC_API_KEY`: the assistant. In the Anthropic console, give that key its own monthly limit as a second safety. The Worker also stops by itself at `AI_BUDGET_USD` in `wrangler.toml` (default 5 per month) and allows 40 questions per person per day.

## Day to day
- Change the site: edit `public/index.html` or `src/worker.js`, then `npx wrangler deploy` (or push to GitHub and connect the repo in Cloudflare > Workers > themap > Settings > Builds).
- Curators: emails in `ADMIN_EMAILS` (wrangler.toml) become admins at their next sign-in. Admins can remove any star or link.
- Block someone: `npx wrangler d1 execute starloom --remote --command "UPDATE users SET role='blocked' WHERE email='x@y.com'"`
- A custom domain: Cloudflare > Workers > themap > Settings > Domains.

## How it works
- Anyone can read. Signed-in people can add stars and links, edit any public star, and keep stars private until they share them.
- Every change is saved with the name of who made it (a star's history), and any earlier version can be restored.
- `build/` and `seed.mjs` hold the scripts that assembled the page and `public/seed.json`. You do not need them to run the site.

## Local test
`.dev.vars` has `DEV_LOGIN=1` for a fake sign-in. Run `npx wrangler d1 execute starloom --local --file=schema.sql`, then `npx wrangler dev`.
