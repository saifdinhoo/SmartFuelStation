# Smart Automotive Service Platform — Web

React + TypeScript + Vite dashboard for the Customer, Provider, and Admin roles. See the [root README](../README.md) for the full-project setup (database, backend, mobile).

## Setup

```powershell
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL` in `.env` must point at the backend's `/api` base (`http://localhost:5000/api` for local development). The dev server runs on `http://localhost:5173`.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — type-check (`tsc -b`) then production build
- `npm run lint` — ESLint
- `npm test` / `npm run test:watch` — Vitest
- `npm run format` / `npm run format:check` — Prettier

## Structure

- `src/features/<role>/<area>/` — one folder per feature area (e.g. `features/customer/vehicles`), each typically holding its API client, TanStack Query hooks, and page/component files together.
- `src/components/ui/` — shared, role-agnostic UI primitives (Button, Card, Modal, etc.).
- `src/app/providers/` — app-wide context (auth, theme, direction/locale, toast, socket).
- `src/routes/AppRoutes.tsx` — the route table; role gating goes through `RoleRoute`.
