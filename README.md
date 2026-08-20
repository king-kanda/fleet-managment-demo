# FleetPulse — Fleet Management Demo

A self-contained **fleet management** demo with live map tracking and **WhatsApp**
dispatch. Everything runs in the browser — no backend, no accounts, no API keys
required. State persists to `localStorage`, and a built-in simulation keeps the
fleet moving in real time.

![Dashboard](docs/dashboard.png)

## Features

- **Live fleet dashboard** — active vehicles, trips in progress, fuel levels, and open alerts at a glance.
- **Real-time map** — vehicles move along routes with animated markers, status colours, and per-vehicle detail. Renders on a built-in demo map by default; drop in a **Mapbox** token for real street/satellite tiles.
- **WhatsApp dispatch** — a WhatsApp-style two-way inbox for every driver, with delivery/read ticks and an **auto-reply bot** that answers driver keywords (`STATUS`, `ETA`, `FUEL`, `ARRIVED`, `MENU`).
- **Trip management** — create trips, **dispatch** them to a vehicle (the driver is auto-notified over WhatsApp), and track progress/ETA to completion.
- **Drivers** — roster with status, ratings, and one-click messaging.
- **Live simulation** — vehicles drive their routes, fuel drains, ETAs update, and drivers send messages and trigger alerts. Pause/resume any time.

## Getting started

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). To build for production:

```bash
npm run build && npm run preview
```

## How the demo works

Because this is a **demo running fully in demo mode**, there is no server:

- **State** lives in `localStorage` (`fleetpulse.state.v1`) via a tiny observable store (`src/lib/store.ts`). Reset it any time from **Settings → Reset demo data**.
- **Simulation** (`src/lib/simulation.ts`) ticks once per second, advancing vehicle positions along their routes, updating trips, and injecting driver chatter and alerts.
- **Map** (`src/components/FleetMap.tsx`) uses a hand-drawn SVG projection by default and lazy-loads Mapbox GL only when a token is present.

### Mapbox integration

Optional. Get a free token at [account.mapbox.com](https://account.mapbox.com),
then paste it into **Settings → Mapbox Integration**. The token is stored locally
and the map upgrades to live Mapbox tiles. Mapbox GL is code-split, so it is only
downloaded when a token is set.

### WhatsApp integration

In demo mode all conversations are simulated in the browser. The production wiring
for the **WhatsApp Business Cloud API** is documented and stubbed in
`src/lib/whatsapp.ts`, which shows exactly where outbound sends and the inbound
webhook would connect. To go live you would:

1. Move the access token to a server and have the app call your backend (never ship WhatsApp secrets to the browser).
2. Point `sendWhatsApp()` at that backend.
3. Add a webhook endpoint that maps inbound WhatsApp messages to `receiveMessage(driverId, body)`.

## Tech stack

- **React 18** + **TypeScript** + **Vite**
- No UI framework — a small hand-written CSS design system (`src/index.css`)
- **mapbox-gl** (optional, lazy-loaded)

## Project structure

```
src/
  components/    FleetMap, Sidebar, Icon
  pages/         Dashboard, MapView, Trips, Drivers, WhatsApp, Settings
  lib/           types, store, actions, simulation, geo, whatsapp, format
  hooks/         useStore
  data/          seed (Nairobi-based demo fleet)
```

> This is a demonstration app. It uses seeded, fictional data around Nairobi, Kenya.
