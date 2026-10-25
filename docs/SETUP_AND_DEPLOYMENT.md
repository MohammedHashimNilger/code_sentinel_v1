# CodeSentinel — Setup & Deployment Guide

A complete walkthrough from zero to a running local instance, then to a live deployment. Follow the sections in order the first time through.

---

## Part 1: Local setup

### Prerequisites

- Node.js 18 or later (`node -v` to check — the backend uses native `fetch`, which needs Node 18+)
- npm
- A GitHub account
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) account
- A Google account for a free [Gemini API key](https://aistudio.google.com/apikey)
- [ngrok](https://ngrok.com/download) (free tier is fine) — only needed if you want to test GitHub webhooks locally

### Step 1 — Clone and install

```bash
git clone <your-repo-url>
cd codesentinel

cd backend
npm install

cd ../frontend
npm install
```

### Step 2 — MongoDB Atlas

1. Sign in at [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a new **free (M0) cluster**. Any cloud provider/region is fine.
2. Once the cluster is created, go to **Database Access** (left sidebar) → **Add New Database User**. Choose a username/password (autogenerate is fine) — save these, you'll need them in the connection string.
3. Go to **Network Access** → **Add IP Address**. For local development, either add your current IP or click **Allow Access from Anywhere** (`0.0.0.0/0`) to avoid re-adding your IP every time it changes.
4. Go to **Database** → **Connect** on your cluster → **Drivers**. Copy the connection string — it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<username>` and `<password>` with the values from step 2, and add a database name before the `?`, e.g. `.../codesentinel?retryWrites=true...`. This full string is your `MONGO_URI`.

### Step 3 — GitHub OAuth App

1. Go to **GitHub → Settings (your profile menu, top right) → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name:** `CodeSentinel (local)` — anything descriptive works
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:5000/api/auth/github/callback`
3. Click **Register application**.
4. Copy the **Client ID** shown on the resulting page.
5. Click **Generate a new client secret** and copy it immediately — GitHub only shows it once.

### Step 4 — Gemini API key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in, and click **Create API key**.
2. Copy the key.

### Step 5 — Generate your own secrets

`JWT_SECRET`, `ENCRYPTION_KEY`, and `GITHUB_WEBHOOK_SECRET` are values *you* generate — they're not obtained from any service. Run this once per secret (or once and reuse the output pattern):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it three times (or once per secret) to get three different values.

### Step 6 — Configure the backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Value |
|---|---|
| `PORT` | `5000` (leave as-is) |
| `NODE_ENV` | `development` |
| `CLIENT_URL` | `http://localhost:5173` |
| `BACKEND_URL` | See Step 7 (ngrok) below |
| `MONGO_URI` | From Step 2 |
| `ENCRYPTION_KEY` | From Step 5 |
| `JWT_SECRET` | From Step 5 |
| `GITHUB_CLIENT_ID` | From Step 3 |
| `GITHUB_CLIENT_SECRET` | From Step 3 |
| `GITHUB_CALLBACK_URL` | `http://localhost:5000/api/auth/github/callback` |
| `GITHUB_WEBHOOK_SECRET` | From Step 5 |
| `GEMINI_API_KEY` | From Step 4 |

### Step 7 — Webhooks in local dev (ngrok)

GitHub can't deliver a webhook to `localhost` — it needs a public URL. In a separate terminal:

```bash
ngrok http 5000
```

ngrok prints a forwarding URL like `https://a1b2-xx-xx-xx-xx.ngrok-free.app`. Set `BACKEND_URL` in `backend/.env` to that URL (no trailing slash). You'll need to restart the backend after changing it, and update it again if you restart ngrok later (the free tier gives you a new URL each time).

If you don't care about testing live webhooks right now, you can skip ngrok and just leave `BACKEND_URL=http://localhost:5000` — everything except "push a commit and watch a scan start automatically" will still work (you can still use the **Scan now** button, which doesn't need a webhook).

### Step 8 — Configure the frontend

```bash
cd frontend
cp .env.example .env
```

Leave `VITE_API_URL=http://localhost:5000` as-is.

### Step 9 — Run it

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Open `http://localhost:5173`.

### Step 10 — Verify it works

1. Click **Sign in with GitHub** → authorize the app → you should land on `/dashboard`.
2. Click **Connect repository** → pick a repo you own (a small one is easiest for a first test).
3. Click **Scan now** on the repo's detail page. Wait a few seconds, then refresh — you should see a health score and an issue list appear.
4. If you set up ngrok, push a small commit to the connected repo and confirm a new scan appears automatically within a few seconds.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Stuck on login / redirected back to `/` immediately | `GITHUB_CALLBACK_URL` doesn't exactly match what's registered on the GitHub OAuth App (check for trailing slashes, http vs https) |
| `CORS error` in the browser console | `CLIENT_URL` on the backend doesn't match the frontend's actual origin |
| Login works but `/api/auth/me` returns 401 right after | Cookie isn't being sent — check `VITE_API_URL` is correct and that you're not mixing `http://localhost` and `http://127.0.0.1` (browsers treat these as different origins) |
| Webhook never triggers a scan | `BACKEND_URL` was wrong *at the time you clicked Connect* (the webhook URL is set once, at connect time) — disconnect and reconnect after fixing it |
| `npm audit failed` logged in the backend console | Normal if the scanned repo has no `package-lock.json` — the scan still completes with ESLint results, just without npm audit findings |
| AI buttons return an error | Check `GEMINI_API_KEY` is set and valid |

---

## Part 2: Deployment

### MongoDB Atlas (production)

Go back to **Network Access** in Atlas and confirm `0.0.0.0/0` is allowed (Render's free tier doesn't have a fixed outbound IP, so you can't whitelist a specific one without a paid Render plan).

### Backend → Render

1. Push this repo to GitHub (if you haven't already).
2. In the [Render dashboard](https://dashboard.render.com), click **New → Blueprint**, and connect your GitHub repo. Render will detect `backend/render.yaml` automatically.
3. Render prompts for every environment variable marked `sync: false` in the blueprint. Enter the same values from your local `.env`, with these changes:
   - `NODE_ENV` is already set to `production` by the blueprint
   - `CLIENT_URL` → your Vercel URL (you may not have this yet — see the note below)
   - `BACKEND_URL` → your Render service's own URL, e.g. `https://codesentinel-backend.onrender.com`
   - `GITHUB_CALLBACK_URL` → `https://<your-render-url>/api/auth/github/callback` (you'll also need to update this on GitHub's side — see the final step)
4. Deploy. Render will build and start the service.

> You likely won't know your Vercel URL until after you deploy the frontend. That's fine — deploy the backend first with a placeholder `CLIENT_URL`, then come back and update it once Vercel gives you a real URL (Part 2's final step covers this).

### Frontend → Vercel

1. Import the repo in [Vercel](https://vercel.com/new), and set the **Root Directory** to `frontend` during import.
2. Set the environment variable `VITE_API_URL` to your Render backend URL (e.g. `https://codesentinel-backend.onrender.com`).
3. Deploy. `vercel.json` is already set up to handle client-side routing (so `/repos/<id>` works on a direct page load, not just client-side navigation).

### Final step — reconcile the URLs

Once both are live, three places need to agree with each other:

1. **GitHub OAuth App settings** (`github.com/settings/developers`): update the **Authorization callback URL** to `https://<your-render-url>/api/auth/github/callback`.
2. **Render env vars**: update `GITHUB_CALLBACK_URL` to match, and update `CLIENT_URL` to your actual Vercel URL. Render redeploys automatically when you change an env var.
3. **Any already-connected repos** from testing: their webhooks were registered against whatever `BACKEND_URL` was at connect time. If that was a now-dead ngrok URL, disconnect and reconnect those repos once the backend is live on Render, so the webhook points at the right place.

### Post-deploy verification

Repeat Step 10 from Part 1 against your live URLs — sign in, connect a repo, trigger a scan, and (optionally) push a commit to confirm the webhook fires against the real Render URL.

---

## Known limitations

- Render's free tier spins down after inactivity; the first request after idling can take 30–60 seconds, which can occasionally cause a GitHub webhook delivery to time out. GitHub retries automatically, so this self-resolves but can delay the first scan after a period of inactivity.
- OSV.dev's API and large binary downloads (the GitHub tarball fetch) could not be live-verified during development due to a sandboxed dev environment's network restrictions. Both were tested as thoroughly as possible with local equivalents — verify them yourself on first real deploy.
- The AI semantic review pass caps at 15 files (smallest-first, 30KB max each) per run, for cost and context-window reasons. A large repo gets partial coverage per run, not exhaustive coverage.
- The dashboard doesn't poll for scan completion — refresh the page to see results once a triggered scan finishes.
