# Gridiron Draft — Weekly Fantasy Football Lineup Game

A lightweight React + TypeScript SPA built with Vite that challenges players to draft an 8-player starting fantasy football lineup (`1 QB`, `2 RB`, `2 WR`, `1 TE`, `1 FLX`, `1 K`) that scores the maximum Full PPR points for the most recently completed NFL week using live Sleeper API data.

## Features

- **Live Sleeper Public API Integration**:
  - Resolves the current NFL season and most recently completed week via `GET https://api.sleeper.app/v1/state/nfl`.
  - Draws random active NFL players in unfilled positions via `GET https://api.sleeper.app/v1/players/nfl?position=<position>&active=true`.
  - Fetches each player's weekly Full PPR score (`pts_ppr`) via `GET https://api.sleeper.com/stats/nfl/player/{player_id}?season_type=regular&season=2026&grouping=week`.
  - Displays player headshots from Sleeper CDN (`https://sleepercdn.com/content/nfl/players/{player_id}.jpg`) with automatic fallback badges.
- **Strategic Roster & Flex Slot Placement**:
  - When keeping an `RB`, `WR`, or `TE`, choose whether to place them into a primary position slot (`RB 1`, `RB 2`, `WR 1`, `WR 2`, `TE`) or the `FLX` spot.
- **5-Skip Tracker**:
  - Track remaining skips (`5 / 5`) per run. Once all 5 skips are used, the Skip button is disabled and remaining players must be manually accepted into open slots.
- **Session Cookie Persistence**:
  - Stores the active run state (`ff_active_run`), high score (`ff_high_score`), and 5 most recent completed rosters and scores (`ff_history`) in session cookies so refreshing the browser never resets your progress or history.

## Getting Started

```bash
npm install
npm run dev
```

## Running Tests & Production Build

```bash
npm test
npm run build
```
