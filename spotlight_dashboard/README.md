# Spotlight — web app

One Vite + React app with three areas, picked by URL path in [`src/main.tsx`](src/main.tsx):

| Path | Area | Code |
|---|---|---|
| `/student` | Student web app (PWA) | `src/student/` |
| `/admin` | Admin console | `src/app/AdminConsole.tsx` |
| everything else | Club dashboard | `src/app/` (pages in `src/app/dashboard/`) |

Shared colours and type live in `src/styles/tokens.css`; the student area has its own `src/student/student.css`.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static output in dist/
```

Set `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` in `.env` (see `.env.production.example`). See the [root README](../README.md) for the full project overview.
