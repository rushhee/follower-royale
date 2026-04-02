# Follower Royale - Design Spec

## Concept

Every person who follows you on Instagram becomes a fighter in a daily battle royale simulation. You run the sim, screen record it, post it as a Reel. Followers watch to see if they survived. A companion website shows leaderboards, stats, and battle history.

The growth loop: **Follow on Instagram -> you're automatically in tomorrow's battle -> watch the Reel to see if you won -> tell your friends to follow so they're in it too**.

---

## Daily Workflow

1. Open admin panel
2. "Sync Followers" - pulls latest Instagram follower list (manual CSV/JSON upload for MVP)
3. "Run Today's Battle" - simulation kicks off with all followers (or random draft)
4. Screen record the battle, add music/commentary
5. Post as an Instagram Reel
6. Stats on the website auto-update after battle ends

---

## Tech Stack

- **Rendering**: PixiJS (WebGL-accelerated 2D)
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Database**: SQLite via better-sqlite3
- **Hosting**: Vercel
- **Follower Sync (MVP)**: Manual CSV/JSON upload from Instagram data export

---

## Phase 1 - MVP Scope

### 1.1 Simulation Page (`/battle`)
- Full-screen PixiJS application rendering circular arena
- Followers spawn as colored circle sprites with username text labels at arena edges
- Movement AI: wander randomly, accelerate toward nearest enemy within detection radius
- Collision = fight -> RNG winner (weighted by random "power" stat assigned at spawn)
- Losers shrink + fade out with death animation
- Kill feed overlay in top-right (last 5 kills)
- Player count top-left: "X / Y alive"
- Shrinking circle zone forces survivors toward center over time
- Final 2: camera zoom-in, dramatic moment
- Winner: big name reveal, confetti burst, "FOLLOWER ROYALE CHAMPION" text
- Auto-saves results to DB via API call when battle ends
- Target duration: ~60-90 seconds

### 1.2 Admin Panel (`/admin`) - password protected
- **Follower Sync**: File upload for Instagram data export (JSON/CSV), parses usernames, adds new to DB, skips duplicates
- **Battle Controls**: "Run Battle" button with option for all followers or random subset (max N)
- **Past Battles**: List of previous battles with results
- **Follower Management**: View all, search, manually add/remove

### 1.3 Leaderboard (`/leaderboard`)
- Table: rank, username, wins, total kills, battles played, win rate
- Sortable columns, search bar
- Click username -> player profile

### 1.4 Player Profile (`/player/[username]`)
- Stats card: wins, kills, battles, win rate, best placement, current streak
- Battle history: date, placement, kills per round
- CTA to follow on Instagram

### 1.5 Landing Page (`/`)
- Hero: "Every follower fights. One wins. Follow @[you] on Instagram to enter."
- Latest battle winner spotlight
- Top 10 leaderboard preview
- Link to full leaderboard

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS followers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_count INTEGER NOT NULL,
  winner_id INTEGER REFERENCES followers(id),
  duration_seconds REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS battle_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id INTEGER REFERENCES battles(id) ON DELETE CASCADE,
  follower_id INTEGER REFERENCES followers(id),
  placement INTEGER NOT NULL,
  kills INTEGER DEFAULT 0,
  killed_by INTEGER REFERENCES followers(id),
  survived_seconds REAL,
  UNIQUE(battle_id, follower_id)
);
```

---

## File Structure

```
follower-royale/
├── data/
│   └── follower-royale.db
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── battle/page.tsx             # Simulation canvas
│   │   ├── leaderboard/page.tsx        # Leaderboard
│   │   ├── player/[username]/page.tsx  # Player profile
│   │   ├── battles/page.tsx            # Battle history
│   │   ├── battles/[id]/page.tsx       # Battle detail
│   │   ├── admin/page.tsx              # Admin panel
│   │   └── api/
│   │       ├── followers/route.ts
│   │       ├── followers/sync/route.ts
│   │       ├── battles/route.ts
│   │       ├── battles/[id]/route.ts
│   │       └── leaderboard/route.ts
│   ├── components/
│   │   ├── Arena.tsx
│   │   ├── Character.ts
│   │   ├── KillFeed.tsx
│   │   ├── PlayerCount.tsx
│   │   ├── WinnerScreen.tsx
│   │   ├── LeaderboardTable.tsx
│   │   └── FollowerUpload.tsx
│   ├── lib/
│   │   ├── simulation.ts
│   │   ├── combat.ts
│   │   ├── movement.ts
│   │   ├── db.ts
│   │   └── instagram-parser.ts
│   └── types/index.ts
├── public/sounds/
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Key Design Decisions

1. **Following = joining** - No registration. Follow on Instagram, you're in.
2. **Names must be readable** - Clean font, good contrast. Random draft subset if too many.
3. **New power stats every battle** - No persistent combat advantages. Fresh random power each round.
4. **The video is the product, the site is the funnel** - Reel -> site -> follow -> next battle.
5. **Keep it random** - RNG combat is the point. Randomness drives engagement.
6. **Record manually at first** - Screen record for control over framing/pacing/music.

---

## Priority

The simulation looking good on a screen recording matters more than anything else. That's the content. Everything else supports it.
