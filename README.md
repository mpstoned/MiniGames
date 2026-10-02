# MiniGames

A small collection of two-player games built with Angular:

- **Tic Tac Toe**: get three in a row on a 3×3 grid.
- **Connect Four**: drop discs and connect four in a row.

**Play online:** https://mpstoned.github.io/MiniGames/

## Run locally

```bash
npm install
npm start
```

Then open http://localhost:4200/.

## Deployment

Every push to `main` builds the app and deploys it to GitHub Pages via
`.github/workflows/deploy.yml`.

## Azure hosting and stats

The app can also run on **Azure Static Web Apps** with a small API (`api/`,
Azure Functions) that stores global game stats in **Azure Cosmos DB**.

- `GET /api/stats` returns how often each game was played and its results.
- `POST /api/stats` with `{ "game": "tic-tac-toe", "result": "X" }` records a finished game.
- The API reads the Cosmos DB connection string from the `COSMOS_CONNECTION_STRING`
  setting (database `minigames`, container `stats`, partition key `/id`).

Run the site and API together locally (needs
`brew install azure-functions-core-tools@4` and your connection string in
`api/local.settings.json`):

```bash
cd api && npm install && npm run build && cd ..
npm start   # in one terminal
npx @azure/static-web-apps-cli start http://localhost:4200 --api-location api   # in another
```

Then open http://localhost:4280/.
