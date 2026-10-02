# MiniGames

A small collection of two-player games built with Angular:

- **Tic Tac Toe**: get three in a row on a 3×3 grid.
- **Connect Four**: drop discs and connect four in a row.

Players sign up or sign in with just a username (no password, names are unique)
before choosing a game. Global stats for each game are shown on the game picker.

**Play online:** https://kind-coast-0a127e80f.6.azurestaticapps.net/

## How it works

The app runs on **Azure Static Web Apps**. A small API in `api/` (Azure Functions)
stores data in **Azure Cosmos DB** (database `minigames`). The API creates the
database and containers automatically on first use (see `api/src/cosmos.ts`):

| Container | Partition key | Documents |
| --- | --- | --- |
| `stats` | `/id` | One per game (`tic-tac-toe`, `connect-four`) with play counts and results, plus one per user (`user:<lowercased username>`) |

Everything shares one container on purpose: the Cosmos DB free tier covers
1000 RU/s for the whole account, and `stats` already uses all of it.

API endpoints:

- `GET /api/stats`: how often each game was played and its results.
- `POST /api/stats` with `{ "game": "tic-tac-toe", "result": "X" }`: records a finished game.
- `POST /api/users/signup` with `{ "username": "anna" }`: creates a user (409 if taken).
- `POST /api/users/signin` with `{ "username": "anna" }`: signs in (404 if unknown).

The API reads the Cosmos DB connection string from the `COSMOS_CONNECTION_STRING` setting.

## Run locally

The login needs the API, so run the site and API together (needs
`brew install azure-functions-core-tools@4` and your connection string in
`api/local.settings.json`):

```bash
npm install
cd api && npm install && npm run build && cd ..
npm start   # in one terminal
npx @azure/static-web-apps-cli start http://localhost:4200 --api-location api   # in another
```

Then open http://localhost:4280/.

## Deployment

Every push to `main` builds the site and API and deploys them to Azure via
`.github/workflows/azure-static-web-apps-kind-coast-0a127e80f.yml`.
