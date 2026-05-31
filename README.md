# Blog CMS Frontend

Vite React SPA for the Blog CMS.

## Local Setup

```powershell
Copy-Item .env.example .env
pnpm install
pnpm dev
```

Set `VITE_API_URL` to the backend API origin.

## Vercel

Set the Vercel project root to this frontend folder and configure:

```env
VITE_API_URL=https://your-backend.vercel.app
```

`vercel.json` rewrites all SPA routes to `index.html`, so `/admin`, `/editor`, and `/login` work on refresh.

## Checks

```powershell
pnpm lint
pnpm build
```
