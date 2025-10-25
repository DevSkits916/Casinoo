# Casinoo

Casinoo is a prototype browser-playable casino arcade built with Node.js, Express, and vanilla HTML/CSS/JS. Players wager shared credits that persist between sessions, and an admin dashboard exposes user management tools. All state is stored locally in `balances.json`, making the project easy to run without external dependencies.

## Features

- 🎰 **Lobby and Mini-Games** – Slots, High/Low, and Coin Flip games that charge and payout credits via REST APIs.
- 👤 **Persistent Profiles** – Player balances and transaction histories automatically created and saved to `balances.json`.
- 🛠️ **Admin Dashboard** – View all users, inspect history, adjust balances, or delete users without authentication (prototype behavior).
- 🔐 **Server-Side Validation** – Express routes enforce non-negative balances, consistent history logging, and standardized JSON responses.

## Getting Started

### Prerequisites
- Node.js 18+ (or any modern LTS release)

### Installation
```bash
npm install
```

> No third-party packages are required beyond the built-in dependencies declared in `package.json`.

### Running the Server
```bash
node server.js
```

The server listens on **http://localhost:3000** and automatically serves static assets from the `public/` directory.

## Project Structure

```
.
├── balances.json        # Persistent player data (created/updated automatically)
├── public/
│   ├── admin.html       # Admin dashboard for managing players
│   ├── coinflip.html    # Coin flip game UI
│   ├── highlow.html     # High/Low card game UI
│   ├── lobby.html       # Entry point for loading profiles and navigating games
│   └── slots.html       # Slot machine game UI
└── server.js            # Express server and REST API implementation
```

## API Overview

All endpoints return JSON and include `ok: true` for success or `ok: false` with an error code/message on failure.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/profile?username=<name>` | Fetch (or auto-create) a player profile.
| `POST` | `/api/profile/save` | Manually persist a session balance snapshot.
| `POST` | `/api/game/charge` | Deduct credits for a wager; rejects if funds are insufficient.
| `POST` | `/api/game/payout` | Credit winnings after successful play.
| `GET` | `/api/admin/users` | List all players with balances.
| `GET` | `/api/admin/user-detail?username=<name>` | Retrieve full balance and history for one player.
| `POST` | `/api/admin/set-balance` | Force-set a player balance with an audit note.
| `POST` | `/api/admin/delete-user` | Remove a player profile entirely.

## Development Notes

- The helper `getUsernameFromQuery()` is available on every page to parse the `?u=<username>` parameter.
- Player histories append a timestamped record for every balance change, including manual saves and admin adjustments.
- Deleting `balances.json` will reset the arcade; the file is recreated automatically when needed.
- The frontend uses standard Fetch API calls—no frameworks or build steps are involved.

## Testing

There is no automated test suite included. You can manually verify flows by running the server and interacting with the HTML pages in a browser.

## License

This project is provided as a prototype and does not include an explicit license.
