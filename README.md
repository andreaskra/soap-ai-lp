# soap-ai.com landing page

Marketing site for SOAP — AI operations for construction businesses doing $2M–$10M.

Live at **https://soap-ai.com**.

---

## Run locally

You need Docker Desktop (or compatible).

```bash
git clone https://github.com/andreaskra/soap-ai-lp.git
cd soap-ai-lp
docker compose up
```

Open **http://localhost:8080**.

Edits to `index.html` / `styles.css` / `assets/` show up on browser refresh — no rebuild needed (the source dir is bind-mounted into the container).

To stop: `Ctrl+C`, or `docker compose down` from another terminal.

To test the production build (no live-reload, mirrors what runs on the VPS):
```bash
# Comment out the `volumes:` block in docker-compose.yml, then:
docker compose up --build
```

---

## Deploy to production

**Just push to `main`.** No manual deploy step.

```bash
git add .
git commit -m "Tweak hero copy"
git push
```

The flow:

1. Push to `main` triggers [`.github/workflows/trigger-deploy.yml`](.github/workflows/trigger-deploy.yml).
2. That workflow fires a `repository_dispatch` event at the main infrastructure repo.
3. The main repo's deploy workflow SSHes into the production VPS, pulls the latest from this repo, and rebuilds the stack.
4. Other landing pages on the same VPS go through a brief restart (a few seconds) as the whole stack comes back up.

End-to-end deploy time is usually under 90 seconds. You can watch progress in the **Actions** tab of this repo (first step) and then in the main repo (second step — ask Andreas for visibility if needed).

To manually re-trigger a deploy without a code change: **Actions → Trigger production deploy → Run workflow**.

---

## Project structure

```
.
├── index.html              ← the page
├── styles.css              ← all styling
├── assets/logo/            ← brand assets (favicon, apple-touch-icon)
├── Dockerfile              ← production build (used by the main repo's deploy)
├── docker-compose.yml      ← local dev only
└── .github/workflows/
    └── trigger-deploy.yml  ← fires the cross-repo deploy
```

---

## What you can change here

- All HTML / CSS / assets in this directory
- Add JS, new sections, new pages, new images, etc.

## What lives elsewhere (ask Andreas if you need it changed)

- Nginx proxy config (headers, redirects, paths)
- SSL certificate
- DNS records
- Any infrastructure outside the container itself
