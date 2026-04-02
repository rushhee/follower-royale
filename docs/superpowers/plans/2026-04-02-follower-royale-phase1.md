# Follower Royale Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional battle royale simulation web app where Instagram followers auto-fight in a PixiJS arena, with admin tools, leaderboards, and player profiles.

**Architecture:** Next.js App Router serves the website and API routes. SQLite (better-sqlite3) stores followers, battles, and results. The simulation engine is a pure-logic class (`SimulationEngine`) that manages state and emits events, completely decoupled from rendering. A PixiJS renderer (`Arena.tsx`) reads simulation state each frame and renders sprites, zone, overlays. This separation means game logic is testable without a browser.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, PixiJS v8, better-sqlite3, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/types/index.ts` | All shared TypeScript interfaces |
| `src/lib/db.ts` | SQLite connection, table creation, query helpers |
| `src/lib/instagram-parser.ts` | Parse Instagram JSON/CSV exports into username arrays |
| `src/lib/combat.ts` | Fight resolution: two characters collide, RNG picks winner |
| `src/lib/movement.ts` | Character AI: wander, seek enemies, flee zone edge |
| `src/lib/simulation.ts` | `SimulationEngine` class: manages all characters, zone, ticks, events, results |
| `src/components/Arena.tsx` | PixiJS Application wrapper: renders simulation state as sprites, handles camera, overlays |
| `src/components/KillFeed.tsx` | HTML overlay showing last 5 kills |
| `src/components/PlayerCount.tsx` | HTML overlay showing "X / Y alive" |
| `src/components/WinnerScreen.tsx` | HTML overlay for winner celebration |
| `src/components/LeaderboardTable.tsx` | Reusable sortable/searchable leaderboard table |
| `src/components/FollowerUpload.tsx` | File upload + parse component for admin |
| `src/app/page.tsx` | Landing page |
| `src/app/battle/page.tsx` | Full-screen simulation page |
| `src/app/admin/page.tsx` | Admin panel (sync, run battles, manage followers) |
| `src/app/leaderboard/page.tsx` | Public leaderboard |
| `src/app/player/[username]/page.tsx` | Player profile |
| `src/app/battles/page.tsx` | Battle history list |
| `src/app/battles/[id]/page.tsx` | Single battle detail |
| `src/app/api/followers/route.ts` | GET all followers, POST add one, DELETE remove one |
| `src/app/api/followers/sync/route.ts` | POST upload Instagram export |
| `src/app/api/battles/route.ts` | GET all battles, POST save battle results |
| `src/app/api/battles/[id]/route.ts` | GET single battle with full results |
| `src/app/api/leaderboard/route.ts` | GET leaderboard data |
| `src/app/api/admin/auth/route.ts` | POST verify admin password |
| `src/app/layout.tsx` | Root layout with Tailwind, dark theme |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack`

When prompted, accept defaults. This creates the full Next.js scaffold.

- [ ] **Step 2: Install dependencies**

Run `npm install pixi.js better-sqlite3` and `npm install -D @types/better-sqlite3 vitest`

- `pixi.js` — v8 WebGL renderer
- `better-sqlite3` — synchronous SQLite for Node
- `vitest` — test runner

- [ ] **Step 3: Configure Next.js for native modules**

Replace the contents of `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

This prevents webpack from bundling the native `better-sqlite3` module.

- [ ] **Step 4: Create environment file**

Create `.env.local`:

```
ADMIN_PASSWORD=changeme
```

- [ ] **Step 5: Add data directory to .gitignore**

Append to `.gitignore`:

```
# SQLite database
data/
```

- [ ] **Step 6: Create data directory**

Create the `data/` directory in the project root.

- [ ] **Step 7: Verify the app runs**

Start dev server, visit http://localhost:3000 — should see the default Next.js page.

- [ ] **Step 8: Commit scaffold**

Stage all files and commit with message: "chore: scaffold Next.js project with PixiJS, SQLite deps"

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create shared types**

Create `src/types/index.ts`:

```ts
// === Database Models ===

export interface Follower {
  id: number;
  username: string;
  avatar_color: string;
  created_at: string;
}

export interface Battle {
  id: number;
  participant_count: number;
  winner_id: number | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface BattleResult {
  id: number;
  battle_id: number;
  follower_id: number;
  placement: number;
  kills: number;
  killed_by: number | null;
  survived_seconds: number | null;
}

// === Leaderboard ===

export interface LeaderboardEntry {
  id: number;
  username: string;
  avatar_color: string;
  battles_played: number;
  wins: number;
  total_kills: number;
  avg_placement: number;
  win_rate: number;
}

// === Simulation ===

export interface CharacterState {
  id: number; // follower id
  username: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  power: number; // random 0.5-1.5, affects fight win probability
  alive: boolean;
  kills: number;
  killedBy: number | null; // follower id of killer
  deathTime: number | null; // elapsed seconds when killed
}

export interface KillEvent {
  killerName: string;
  killerId: number;
  victimName: string;
  victimId: number;
  timestamp: number; // elapsed seconds
}

export interface BattleConfig {
  participants: Follower[];
  arenaRadius: number;
  battleDurationTarget: number; // seconds, controls zone shrink pacing
}

export interface SimulationSnapshot {
  characters: CharacterState[];
  zoneRadius: number;
  zoneCenterX: number;
  zoneCenterY: number;
  elapsed: number;
  aliveCount: number;
  totalCount: number;
  killFeed: KillEvent[];
  isFinished: boolean;
  winner: CharacterState | null;
}

// === API Request/Response ===

export interface BattleSavePayload {
  participantIds: number[];
  winnerId: number;
  durationSeconds: number;
  results: {
    followerId: number;
    placement: number;
    kills: number;
    killedBy: number | null;
    survivedSeconds: number;
  }[];
}

export interface BattleDetail extends Battle {
  winner_username: string | null;
  results: (BattleResult & { username: string; avatar_color: string; killer_username: string | null })[];
}

export interface PlayerStats {
  follower: Follower;
  battles_played: number;
  wins: number;
  total_kills: number;
  avg_placement: number;
  win_rate: number;
  best_placement: number;
  current_streak: number;
  battleHistory: {
    battle_id: number;
    created_at: string;
    placement: number;
    kills: number;
    participant_count: number;
  }[];
}
```

- [ ] **Step 2: Commit types**

Stage and commit with message: "feat: add shared TypeScript types for DB models, simulation, and API"

---

### Task 3: Database Layer

**Files:**
- Create: `src/lib/db.ts`, `src/lib/__tests__/db.test.ts`

- [ ] **Step 1: Write database tests**

Create `src/lib/__tests__/db.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initializeDatabase, addFollower, getFollowers, getFollowerByUsername } from "../db";

describe("database", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeDatabase(db);
  });

  it("creates tables on initialization", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("followers");
    expect(names).toContain("battles");
    expect(names).toContain("battle_results");
  });

  it("adds a follower with auto-generated color", () => {
    const follower = addFollower(db, "testuser");
    expect(follower.username).toBe("testuser");
    expect(follower.avatar_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(follower.id).toBe(1);
  });

  it("rejects duplicate usernames", () => {
    addFollower(db, "testuser");
    expect(() => addFollower(db, "testuser")).toThrow();
  });

  it("lists all followers", () => {
    addFollower(db, "user1");
    addFollower(db, "user2");
    const all = getFollowers(db);
    expect(all).toHaveLength(2);
  });

  it("finds follower by username", () => {
    addFollower(db, "findme");
    const found = getFollowerByUsername(db, "findme");
    expect(found).not.toBeNull();
    expect(found!.username).toBe("findme");
  });

  it("returns null for missing username", () => {
    const found = getFollowerByUsername(db, "ghost");
    expect(found).toBeNull();
  });
});
```

- [ ] **Step 2: Configure Vitest**

Create `vitest.config.ts` in the project root:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add to `package.json` scripts: `"test": "vitest run"` and `"test:watch": "vitest"`

- [ ] **Step 3: Run tests to verify they fail**

Run `npx vitest run src/lib/__tests__/db.test.ts`. Expected: FAIL — module `../db` does not exist.

- [ ] **Step 4: Implement database layer**

Create `src/lib/db.ts`:

```ts
import Database from "better-sqlite3";
import path from "path";
import type { Follower, Battle, LeaderboardEntry, BattleDetail, PlayerStats } from "@/types";

const DB_PATH = path.join(process.cwd(), "data", "follower-royale.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initializeDatabase(_db);
  }
  return _db;
}

export function initializeDatabase(db: Database.Database): void {
  db.exec(`
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
  `);
}

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const sat = 60 + Math.floor(Math.random() * 30);
  const lit = 50 + Math.floor(Math.random() * 15);
  const h = hue / 360;
  const s = sat / 100;
  const l = lit / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function addFollower(db: Database.Database, username: string): Follower {
  const color = randomColor();
  const stmt = db.prepare("INSERT INTO followers (username, avatar_color) VALUES (?, ?)");
  const result = stmt.run(username, color);
  return {
    id: result.lastInsertRowid as number,
    username,
    avatar_color: color,
    created_at: new Date().toISOString(),
  };
}

export function addFollowersBulk(db: Database.Database, usernames: string[]): { added: number; skipped: number } {
  const insert = db.prepare("INSERT OR IGNORE INTO followers (username, avatar_color) VALUES (?, ?)");
  const transaction = db.transaction((names: string[]) => {
    let added = 0;
    for (const name of names) {
      const result = insert.run(name, randomColor());
      if (result.changes > 0) added++;
    }
    return { added, skipped: names.length - added };
  });
  return transaction(usernames);
}

export function getFollowers(db: Database.Database, search?: string): Follower[] {
  if (search) {
    return db
      .prepare("SELECT * FROM followers WHERE username LIKE ? ORDER BY username")
      .all(`%${search}%`) as Follower[];
  }
  return db.prepare("SELECT * FROM followers ORDER BY username").all() as Follower[];
}

export function getFollowerByUsername(db: Database.Database, username: string): Follower | null {
  return (db.prepare("SELECT * FROM followers WHERE username = ?").get(username) as Follower) ?? null;
}

export function getFollowerById(db: Database.Database, id: number): Follower | null {
  return (db.prepare("SELECT * FROM followers WHERE id = ?").get(id) as Follower) ?? null;
}

export function deleteFollower(db: Database.Database, id: number): boolean {
  const result = db.prepare("DELETE FROM followers WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getFollowerCount(db: Database.Database): number {
  return (db.prepare("SELECT COUNT(*) as count FROM followers").get() as { count: number }).count;
}

export function getRandomFollowers(db: Database.Database, limit: number): Follower[] {
  return db.prepare("SELECT * FROM followers ORDER BY RANDOM() LIMIT ?").all(limit) as Follower[];
}

export function saveBattleResults(
  db: Database.Database,
  payload: {
    participantIds: number[];
    winnerId: number;
    durationSeconds: number;
    results: {
      followerId: number;
      placement: number;
      kills: number;
      killedBy: number | null;
      survivedSeconds: number;
    }[];
  }
): number {
  const transaction = db.transaction(() => {
    const battle = db
      .prepare("INSERT INTO battles (participant_count, winner_id, duration_seconds) VALUES (?, ?, ?)")
      .run(payload.participantIds.length, payload.winnerId, payload.durationSeconds);

    const battleId = battle.lastInsertRowid as number;

    const insertResult = db.prepare(
      "INSERT INTO battle_results (battle_id, follower_id, placement, kills, killed_by, survived_seconds) VALUES (?, ?, ?, ?, ?, ?)"
    );

    for (const r of payload.results) {
      insertResult.run(battleId, r.followerId, r.placement, r.kills, r.killedBy, r.survivedSeconds);
    }

    return battleId;
  });

  return transaction();
}

export function getBattles(db: Database.Database): (Battle & { winner_username: string | null })[] {
  return db
    .prepare(
      `SELECT b.*, f.username as winner_username
       FROM battles b
       LEFT JOIN followers f ON f.id = b.winner_id
       ORDER BY b.created_at DESC`
    )
    .all() as (Battle & { winner_username: string | null })[];
}

export function getBattleDetail(db: Database.Database, battleId: number): BattleDetail | null {
  const battle = db
    .prepare(
      `SELECT b.*, f.username as winner_username
       FROM battles b
       LEFT JOIN followers f ON f.id = b.winner_id
       WHERE b.id = ?`
    )
    .get(battleId) as (Battle & { winner_username: string | null }) | undefined;

  if (!battle) return null;

  const results = db
    .prepare(
      `SELECT br.*, f.username, f.avatar_color, k.username as killer_username
       FROM battle_results br
       JOIN followers f ON f.id = br.follower_id
       LEFT JOIN followers k ON k.id = br.killed_by
       WHERE br.battle_id = ?
       ORDER BY br.placement ASC`
    )
    .all(battleId) as BattleDetail["results"];

  return { ...battle, results };
}

export function getLeaderboard(db: Database.Database): LeaderboardEntry[] {
  return db
    .prepare(
      `SELECT
        f.id, f.username, f.avatar_color,
        COUNT(br.id) AS battles_played,
        COUNT(CASE WHEN br.placement = 1 THEN 1 END) AS wins,
        COALESCE(SUM(br.kills), 0) AS total_kills,
        ROUND(AVG(br.placement), 1) AS avg_placement,
        ROUND(
          CAST(COUNT(CASE WHEN br.placement = 1 THEN 1 END) AS REAL)
          / MAX(COUNT(br.id), 1) * 100, 1
        ) AS win_rate
      FROM followers f
      LEFT JOIN battle_results br ON br.follower_id = f.id
      GROUP BY f.id, f.username, f.avatar_color
      HAVING battles_played > 0
      ORDER BY wins DESC, total_kills DESC`
    )
    .all() as LeaderboardEntry[];
}

export function getPlayerStats(db: Database.Database, username: string): PlayerStats | null {
  const follower = getFollowerByUsername(db, username);
  if (!follower) return null;

  const stats = db
    .prepare(
      `SELECT
        COUNT(br.id) AS battles_played,
        COUNT(CASE WHEN br.placement = 1 THEN 1 END) AS wins,
        COALESCE(SUM(br.kills), 0) AS total_kills,
        ROUND(AVG(br.placement), 1) AS avg_placement,
        ROUND(
          CAST(COUNT(CASE WHEN br.placement = 1 THEN 1 END) AS REAL)
          / MAX(COUNT(br.id), 1) * 100, 1
        ) AS win_rate,
        MIN(br.placement) AS best_placement
      FROM battle_results br
      WHERE br.follower_id = ?`
    )
    .get(follower.id) as {
    battles_played: number;
    wins: number;
    total_kills: number;
    avg_placement: number;
    win_rate: number;
    best_placement: number | null;
  };

  const recentBattles = db
    .prepare(
      `SELECT br.placement
       FROM battle_results br
       JOIN battles b ON b.id = br.battle_id
       WHERE br.follower_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(follower.id) as { placement: number }[];

  let currentStreak = 0;
  for (const b of recentBattles) {
    if (b.placement === 1) currentStreak++;
    else break;
  }

  const battleHistory = db
    .prepare(
      `SELECT br.battle_id, b.created_at, br.placement, br.kills, b.participant_count
       FROM battle_results br
       JOIN battles b ON b.id = br.battle_id
       WHERE br.follower_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(follower.id) as PlayerStats["battleHistory"];

  return {
    follower,
    battles_played: stats.battles_played,
    wins: stats.wins,
    total_kills: stats.total_kills,
    avg_placement: stats.avg_placement,
    win_rate: stats.win_rate,
    best_placement: stats.best_placement ?? 0,
    current_streak: currentStreak,
    battleHistory,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run `npx vitest run src/lib/__tests__/db.test.ts`. Expected: All 6 tests PASS.

- [ ] **Step 6: Commit database layer**

Stage and commit with message: "feat: add SQLite database layer with full CRUD operations"

---

### Task 4: Instagram Parser

**Files:**
- Create: `src/lib/instagram-parser.ts`, `src/lib/__tests__/instagram-parser.test.ts`

- [ ] **Step 1: Write parser tests**

Create `src/lib/__tests__/instagram-parser.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseInstagramExport } from "../instagram-parser";

describe("parseInstagramExport", () => {
  it("parses Instagram JSON format (relationships_followers)", () => {
    const json = JSON.stringify([
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          { href: "", value: "user_one", timestamp: 1700000000 },
        ],
      },
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          { href: "", value: "user_two", timestamp: 1700000001 },
        ],
      },
    ]);
    const result = parseInstagramExport(json, "json");
    expect(result).toEqual(["user_one", "user_two"]);
  });

  it("parses simple JSON array of usernames", () => {
    const json = JSON.stringify(["alice", "bob", "charlie"]);
    const result = parseInstagramExport(json, "json");
    expect(result).toEqual(["alice", "bob", "charlie"]);
  });

  it("parses CSV with header row", () => {
    const csv = "username\nalice\nbob\ncharlie";
    const result = parseInstagramExport(csv, "csv");
    expect(result).toEqual(["alice", "bob", "charlie"]);
  });

  it("parses CSV without header (plain list)", () => {
    const csv = "alice\nbob\ncharlie";
    const result = parseInstagramExport(csv, "csv");
    expect(result).toEqual(["alice", "bob", "charlie"]);
  });

  it("strips @ symbols and whitespace", () => {
    const json = JSON.stringify(["@alice", " bob ", "@charlie "]);
    const result = parseInstagramExport(json, "json");
    expect(result).toEqual(["alice", "bob", "charlie"]);
  });

  it("removes duplicates", () => {
    const json = JSON.stringify(["alice", "alice", "bob"]);
    const result = parseInstagramExport(json, "json");
    expect(result).toEqual(["alice", "bob"]);
  });

  it("filters out empty strings", () => {
    const csv = "alice\n\nbob\n\n";
    const result = parseInstagramExport(csv, "csv");
    expect(result).toEqual(["alice", "bob"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run `npx vitest run src/lib/__tests__/instagram-parser.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement parser**

Create `src/lib/instagram-parser.ts`:

```ts
type ExportFormat = "json" | "csv";

interface InstagramFollowerEntry {
  title?: string;
  media_list_data?: unknown[];
  string_list_data?: { href?: string; value: string; timestamp?: number }[];
}

function cleanUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").trim().toLowerCase();
}

function parseJsonExport(content: string): string[] {
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    throw new Error("Expected a JSON array");
  }

  // Check if it's Instagram's native format (array of objects with string_list_data)
  if (data.length > 0 && typeof data[0] === "object" && data[0] !== null && "string_list_data" in data[0]) {
    const entries = data as InstagramFollowerEntry[];
    return entries
      .flatMap((entry) => entry.string_list_data?.map((s) => s.value) ?? [])
      .map(cleanUsername)
      .filter(Boolean);
  }

  // Simple array of strings
  if (data.length > 0 && typeof data[0] === "string") {
    return data.map(cleanUsername).filter(Boolean);
  }

  throw new Error("Unrecognized JSON format");
}

function parseCsvExport(content: string): string[] {
  const lines = content.split(/\r?\n/);

  // Check if first line looks like a header
  const firstLine = lines[0]?.trim().toLowerCase();
  const startIndex = firstLine === "username" || firstLine === "usernames" ? 1 : 0;

  return lines
    .slice(startIndex)
    .map(cleanUsername)
    .filter(Boolean);
}

export function parseInstagramExport(content: string, format: ExportFormat): string[] {
  const usernames = format === "json" ? parseJsonExport(content) : parseCsvExport(content);

  // Deduplicate while preserving order
  return [...new Set(usernames)];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run `npx vitest run src/lib/__tests__/instagram-parser.test.ts`. Expected: All 7 tests PASS.

- [ ] **Step 5: Commit parser**

Stage and commit with message: "feat: add Instagram export parser for JSON and CSV formats"

---

### Task 5: Combat Logic

**Files:**
- Create: `src/lib/combat.ts`, `src/lib/__tests__/combat.test.ts`

- [ ] **Step 1: Write combat tests**

Create `src/lib/__tests__/combat.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveFight } from "../combat";
import type { CharacterState } from "@/types";

function makeChar(overrides: Partial<CharacterState> = {}): CharacterState {
  return {
    id: 1,
    username: "test",
    color: "#ff0000",
    x: 0, y: 0, vx: 0, vy: 0,
    power: 1.0,
    alive: true,
    kills: 0,
    killedBy: null,
    deathTime: null,
    ...overrides,
  };
}

describe("resolveFight", () => {
  it("returns a winner and a loser", () => {
    const a = makeChar({ id: 1, username: "alice", power: 1.0 });
    const b = makeChar({ id: 2, username: "bob", power: 1.0 });
    const result = resolveFight(a, b);
    expect([a.id, b.id]).toContain(result.winnerId);
    expect([a.id, b.id]).toContain(result.loserId);
    expect(result.winnerId).not.toBe(result.loserId);
  });

  it("higher power wins more often over many fights", () => {
    const strong = makeChar({ id: 1, power: 1.5 });
    const weak = makeChar({ id: 2, power: 0.5 });
    let strongWins = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const result = resolveFight(strong, weak);
      if (result.winnerId === strong.id) strongWins++;
    }
    expect(strongWins / trials).toBeGreaterThan(0.6);
    expect(strongWins / trials).toBeLessThan(0.9);
  });

  it("equal power results in roughly 50/50", () => {
    const a = makeChar({ id: 1, power: 1.0 });
    const b = makeChar({ id: 2, power: 1.0 });
    let aWins = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const result = resolveFight(a, b);
      if (result.winnerId === a.id) aWins++;
    }
    expect(aWins / trials).toBeGreaterThan(0.35);
    expect(aWins / trials).toBeLessThan(0.65);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run `npx vitest run src/lib/__tests__/combat.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement combat**

Create `src/lib/combat.ts`:

```ts
import type { CharacterState } from "@/types";

export interface FightResult {
  winnerId: number;
  loserId: number;
}

/**
 * Resolve a fight between two characters using weighted RNG.
 * Each character's probability of winning is proportional to their power stat.
 * power=1.5 vs power=0.5 -> 75% vs 25% chance.
 */
export function resolveFight(a: CharacterState, b: CharacterState): FightResult {
  const totalPower = a.power + b.power;
  const aChance = a.power / totalPower;
  const roll = Math.random();

  if (roll < aChance) {
    return { winnerId: a.id, loserId: b.id };
  } else {
    return { winnerId: b.id, loserId: a.id };
  }
}

/**
 * Check if two characters are within collision distance.
 */
export function isColliding(a: CharacterState, b: CharacterState, collisionRadius: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < collisionRadius * collisionRadius;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run `npx vitest run src/lib/__tests__/combat.test.ts`. Expected: All 3 tests PASS.

- [ ] **Step 5: Commit combat logic**

Stage and commit with message: "feat: add weighted RNG combat resolution"

---

### Task 6: Movement AI

**Files:**
- Create: `src/lib/movement.ts`, `src/lib/__tests__/movement.test.ts`

- [ ] **Step 1: Write movement tests**

Create `src/lib/__tests__/movement.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeVelocity, applyZonePush } from "../movement";
import type { CharacterState } from "@/types";

function makeChar(overrides: Partial<CharacterState> = {}): CharacterState {
  return {
    id: 1, username: "test", color: "#ff0000",
    x: 0, y: 0, vx: 0, vy: 0,
    power: 1.0, alive: true, kills: 0,
    killedBy: null, deathTime: null,
    ...overrides,
  };
}

describe("computeVelocity", () => {
  it("seeks toward nearest enemy within detection radius", () => {
    const char = makeChar({ x: 0, y: 0, vx: 0, vy: 0 });
    const enemies = [makeChar({ id: 2, x: 100, y: 0 })];
    const { vx, vy } = computeVelocity(char, enemies, 200, 150);
    expect(vx).toBeGreaterThan(0);
    expect(Math.abs(vy)).toBeLessThan(Math.abs(vx));
  });

  it("ignores enemies outside detection radius", () => {
    const char = makeChar({ x: 0, y: 0, vx: 1, vy: 0 });
    const enemies = [makeChar({ id: 2, x: 500, y: 0 })];
    const result = computeVelocity(char, enemies, 200, 150);
    expect(result.vx).toBeDefined();
    expect(result.vy).toBeDefined();
  });

  it("returns a velocity with magnitude close to speed", () => {
    const char = makeChar({ x: 0, y: 0 });
    const enemies = [makeChar({ id: 2, x: 50, y: 50 })];
    const speed = 150;
    const { vx, vy } = computeVelocity(char, enemies, speed, 200);
    const mag = Math.sqrt(vx * vx + vy * vy);
    expect(mag).toBeGreaterThan(speed * 0.5);
    expect(mag).toBeLessThanOrEqual(speed * 1.1);
  });
});

describe("applyZonePush", () => {
  it("pushes character toward center when outside zone", () => {
    const result = applyZonePush(400, 0, 300, 0, 0);
    expect(result.pushX).toBeLessThan(0);
    expect(Math.abs(result.pushY)).toBeLessThan(Math.abs(result.pushX));
  });

  it("does not push character inside zone", () => {
    const result = applyZonePush(100, 0, 300, 0, 0);
    expect(result.pushX).toBe(0);
    expect(result.pushY).toBe(0);
  });

  it("returns kill flag when far outside zone", () => {
    const result = applyZonePush(800, 0, 100, 0, 0);
    expect(result.kill).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run `npx vitest run src/lib/__tests__/movement.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement movement**

Create `src/lib/movement.ts`:

```ts
import type { CharacterState } from "@/types";

/**
 * Compute new velocity for a character based on AI behavior:
 * - If an enemy is within detectionRadius, seek toward it
 * - Otherwise, wander randomly (random direction changes)
 */
export function computeVelocity(
  char: CharacterState,
  enemies: CharacterState[],
  speed: number,
  detectionRadius: number
): { vx: number; vy: number } {
  let nearestDist = Infinity;
  let nearest: CharacterState | null = null;

  for (const enemy of enemies) {
    if (!enemy.alive || enemy.id === char.id) continue;
    const dx = enemy.x - char.x;
    const dy = enemy.y - char.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < detectionRadius && dist < nearestDist) {
      nearestDist = dist;
      nearest = enemy;
    }
  }

  let targetVx: number;
  let targetVy: number;

  if (nearest) {
    const dx = nearest.x - char.x;
    const dy = nearest.y - char.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    targetVx = (dx / dist) * speed;
    targetVy = (dy / dist) * speed;
  } else {
    const wanderStrength = speed * 0.3;
    const angle = Math.random() * Math.PI * 2;
    targetVx = char.vx + Math.cos(angle) * wanderStrength;
    targetVy = char.vy + Math.sin(angle) * wanderStrength;

    const mag = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
    if (mag > speed) {
      targetVx = (targetVx / mag) * speed;
      targetVy = (targetVy / mag) * speed;
    }
    if (mag < speed * 0.3) {
      const randomAngle = Math.random() * Math.PI * 2;
      targetVx = Math.cos(randomAngle) * speed * 0.5;
      targetVy = Math.sin(randomAngle) * speed * 0.5;
    }
  }

  const smoothing = 0.15;
  const vx = char.vx + (targetVx - char.vx) * smoothing;
  const vy = char.vy + (targetVy - char.vy) * smoothing;

  return { vx, vy };
}

/**
 * Calculate zone push force and death flag for a character outside the zone.
 */
export function applyZonePush(
  charX: number,
  charY: number,
  zoneRadius: number,
  zoneCenterX: number,
  zoneCenterY: number
): { pushX: number; pushY: number; kill: boolean } {
  const dx = charX - zoneCenterX;
  const dy = charY - zoneCenterY;
  const distFromCenter = Math.sqrt(dx * dx + dy * dy);

  if (distFromCenter <= zoneRadius) {
    return { pushX: 0, pushY: 0, kill: false };
  }

  const overshoot = distFromCenter - zoneRadius;
  const killThreshold = zoneRadius * 2;

  const pushStrength = Math.min(overshoot * 2, 500);
  const pushX = -(dx / distFromCenter) * pushStrength;
  const pushY = -(dy / distFromCenter) * pushStrength;

  return { pushX, pushY, kill: overshoot > killThreshold };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run `npx vitest run src/lib/__tests__/movement.test.ts`. Expected: All 6 tests PASS.

- [ ] **Step 5: Commit movement AI**

Stage and commit with message: "feat: add character movement AI with seek, wander, and zone push"

---

### Task 7: Simulation Engine

**Files:**
- Create: `src/lib/simulation.ts`, `src/lib/__tests__/simulation.test.ts`

- [ ] **Step 1: Write simulation tests**

Create `src/lib/__tests__/simulation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../simulation";
import type { Follower, BattleConfig } from "@/types";

function makeFollowers(count: number): Follower[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    username: `user${i + 1}`,
    avatar_color: `#${((i * 37) % 256).toString(16).padStart(2, "0")}0000`,
    created_at: new Date().toISOString(),
  }));
}

describe("SimulationEngine", () => {
  it("initializes with correct number of characters", () => {
    const config: BattleConfig = {
      participants: makeFollowers(10),
      arenaRadius: 400,
      battleDurationTarget: 60,
    };
    const engine = new SimulationEngine(config);
    const snap = engine.getSnapshot();
    expect(snap.characters).toHaveLength(10);
    expect(snap.aliveCount).toBe(10);
    expect(snap.totalCount).toBe(10);
    expect(snap.isFinished).toBe(false);
  });

  it("spawns characters around arena edge", () => {
    const config: BattleConfig = {
      participants: makeFollowers(5),
      arenaRadius: 400,
      battleDurationTarget: 60,
    };
    const engine = new SimulationEngine(config);
    const snap = engine.getSnapshot();
    for (const char of snap.characters) {
      const dist = Math.sqrt(char.x * char.x + char.y * char.y);
      expect(dist).toBeGreaterThan(config.arenaRadius * 0.5);
      expect(dist).toBeLessThanOrEqual(config.arenaRadius * 1.05);
    }
  });

  it("reduces alive count over many ticks", () => {
    const config: BattleConfig = {
      participants: makeFollowers(20),
      arenaRadius: 300,
      battleDurationTarget: 30,
    };
    const engine = new SimulationEngine(config);
    for (let i = 0; i < 5000; i++) {
      engine.tick(1 / 60);
      if (engine.getSnapshot().isFinished) break;
    }
    expect(engine.getSnapshot().aliveCount).toBeLessThan(20);
  });

  it("finishes when one character remains", () => {
    const config: BattleConfig = {
      participants: makeFollowers(3),
      arenaRadius: 100,
      battleDurationTarget: 10,
    };
    const engine = new SimulationEngine(config);
    for (let i = 0; i < 10000; i++) {
      engine.tick(1 / 60);
      if (engine.getSnapshot().isFinished) break;
    }
    const snap = engine.getSnapshot();
    expect(snap.isFinished).toBe(true);
    expect(snap.winner).not.toBeNull();
    expect(snap.aliveCount).toBe(1);
  });

  it("generates correct results for all participants", () => {
    const config: BattleConfig = {
      participants: makeFollowers(5),
      arenaRadius: 80,
      battleDurationTarget: 10,
    };
    const engine = new SimulationEngine(config);
    for (let i = 0; i < 10000; i++) {
      engine.tick(1 / 60);
      if (engine.getSnapshot().isFinished) break;
    }
    const results = engine.getResults();
    expect(results).toHaveLength(5);
    expect(results.find((r) => r.placement === 1)).toBeDefined();
    const placements = results.map((r) => r.placement).sort((a, b) => a - b);
    expect(placements).toEqual([1, 2, 3, 4, 5]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run `npx vitest run src/lib/__tests__/simulation.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement simulation engine**

Create `src/lib/simulation.ts`:

```ts
import type { CharacterState, KillEvent, BattleConfig, SimulationSnapshot } from "@/types";
import { resolveFight, isColliding } from "./combat";
import { computeVelocity, applyZonePush } from "./movement";

const CHARACTER_RADIUS = 12;
const COLLISION_DISTANCE = CHARACTER_RADIUS * 2.5;
const DETECTION_RADIUS = 150;
const BASE_SPEED = 120; // pixels per second
const FIGHT_COOLDOWN = 0.5; // seconds between fights for same character

export class SimulationEngine {
  characters: CharacterState[];
  zoneRadius: number;
  zoneCenterX: number = 0;
  zoneCenterY: number = 0;
  elapsed: number = 0;
  killFeed: KillEvent[] = [];
  isFinished: boolean = false;
  winner: CharacterState | null = null;

  private initialZoneRadius: number;
  private battleDurationTarget: number;
  private eliminationOrder: number[] = []; // follower IDs in order of death
  private fightCooldowns: Map<number, number> = new Map();

  constructor(config: BattleConfig) {
    this.initialZoneRadius = config.arenaRadius;
    this.zoneRadius = config.arenaRadius;
    this.battleDurationTarget = config.battleDurationTarget;

    this.characters = config.participants.map((p, i) => {
      const angle = (i / config.participants.length) * Math.PI * 2;
      const spawnRadius = config.arenaRadius * (0.75 + Math.random() * 0.2);
      return {
        id: p.id,
        username: p.username,
        color: p.avatar_color,
        x: Math.cos(angle) * spawnRadius,
        y: Math.sin(angle) * spawnRadius,
        vx: 0,
        vy: 0,
        power: 0.5 + Math.random(),
        alive: true,
        kills: 0,
        killedBy: null,
        deathTime: null,
      };
    });
  }

  tick(deltaSeconds: number): void {
    if (this.isFinished) return;
    this.elapsed += deltaSeconds;

    // Update fight cooldowns
    for (const [id, cd] of this.fightCooldowns) {
      const newCd = cd - deltaSeconds;
      if (newCd <= 0) this.fightCooldowns.delete(id);
      else this.fightCooldowns.set(id, newCd);
    }

    // Shrink zone: starts at 20% of duration, fully collapsed at 90%
    const shrinkStart = this.battleDurationTarget * 0.2;
    const shrinkEnd = this.battleDurationTarget * 0.9;
    if (this.elapsed > shrinkStart) {
      const shrinkProgress = Math.min((this.elapsed - shrinkStart) / (shrinkEnd - shrinkStart), 1);
      const minRadius = this.initialZoneRadius * 0.05;
      this.zoneRadius = this.initialZoneRadius - (this.initialZoneRadius - minRadius) * shrinkProgress;
    }

    const alive = this.characters.filter((c) => c.alive);

    // Update movement for each alive character
    for (const char of alive) {
      const { vx, vy } = computeVelocity(char, alive, BASE_SPEED, DETECTION_RADIUS);
      char.vx = vx;
      char.vy = vy;

      const zone = applyZonePush(char.x, char.y, this.zoneRadius, this.zoneCenterX, this.zoneCenterY);
      if (zone.kill) {
        this.killCharacter(char, null);
        continue;
      }
      char.vx += zone.pushX * deltaSeconds;
      char.vy += zone.pushY * deltaSeconds;

      char.x += char.vx * deltaSeconds;
      char.y += char.vy * deltaSeconds;
    }

    // Check collisions and resolve fights
    const stillAlive = this.characters.filter((c) => c.alive);
    for (let i = 0; i < stillAlive.length; i++) {
      for (let j = i + 1; j < stillAlive.length; j++) {
        const a = stillAlive[i];
        const b = stillAlive[j];
        if (!a.alive || !b.alive) continue;
        if (this.fightCooldowns.has(a.id) || this.fightCooldowns.has(b.id)) continue;

        if (isColliding(a, b, COLLISION_DISTANCE)) {
          const result = resolveFight(a, b);
          const winner = a.id === result.winnerId ? a : b;
          const loser = a.id === result.loserId ? a : b;

          winner.kills++;
          this.fightCooldowns.set(winner.id, FIGHT_COOLDOWN);
          this.killCharacter(loser, winner);
        }
      }
    }

    // Check win condition
    const aliveNow = this.characters.filter((c) => c.alive);
    if (aliveNow.length <= 1) {
      this.isFinished = true;
      this.winner = aliveNow[0] ?? null;
    }
  }

  private killCharacter(victim: CharacterState, killer: CharacterState | null): void {
    victim.alive = false;
    victim.killedBy = killer?.id ?? null;
    victim.deathTime = this.elapsed;
    this.eliminationOrder.push(victim.id);

    this.killFeed.push({
      killerName: killer?.username ?? "The Zone",
      killerId: killer?.id ?? -1,
      victimName: victim.username,
      victimId: victim.id,
      timestamp: this.elapsed,
    });
  }

  getAliveCount(): number {
    return this.characters.filter((c) => c.alive).length;
  }

  getSnapshot(): SimulationSnapshot {
    return {
      characters: this.characters,
      zoneRadius: this.zoneRadius,
      zoneCenterX: this.zoneCenterX,
      zoneCenterY: this.zoneCenterY,
      elapsed: this.elapsed,
      aliveCount: this.getAliveCount(),
      totalCount: this.characters.length,
      killFeed: this.killFeed,
      isFinished: this.isFinished,
      winner: this.winner,
    };
  }

  getResults(): {
    followerId: number;
    placement: number;
    kills: number;
    killedBy: number | null;
    survivedSeconds: number;
  }[] {
    const totalParticipants = this.characters.length;

    return this.characters.map((char) => {
      let placement: number;
      if (char.alive) {
        placement = 1;
      } else {
        const deathIndex = this.eliminationOrder.indexOf(char.id);
        placement = totalParticipants - deathIndex;
      }
      return {
        followerId: char.id,
        placement,
        kills: char.kills,
        killedBy: char.killedBy,
        survivedSeconds: char.deathTime ?? this.elapsed,
      };
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run `npx vitest run src/lib/__tests__/simulation.test.ts`. Expected: All 5 tests PASS.

- [ ] **Step 5: Commit simulation engine**

Stage and commit with message: "feat: add simulation engine with zone shrink, combat, and result generation"

---

### Task 8: API Routes - Followers

**Files:**
- Create: `src/app/api/followers/route.ts`, `src/app/api/followers/sync/route.ts`, `src/app/api/admin/auth/route.ts`

- [ ] **Step 1: Create admin auth API route**

Create `src/app/api/admin/auth/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correct = process.env.ADMIN_PASSWORD || "changeme";

  if (password === correct) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
}
```

- [ ] **Step 2: Create followers API route**

Create `src/app/api/followers/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, getFollowers, addFollower, deleteFollower, getFollowerCount } from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const followers = getFollowers(db, search);
  const total = getFollowerCount(db);
  return NextResponse.json({ followers, total });
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const { username } = await request.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const clean = username.trim().replace(/^@/, "").toLowerCase();
  if (!clean) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    const follower = addFollower(db, clean);
    return NextResponse.json({ follower }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();

  if (!id || typeof id !== "number") {
    return NextResponse.json({ error: "Follower ID is required" }, { status: 400 });
  }

  const deleted = deleteFollower(db, id);
  if (!deleted) {
    return NextResponse.json({ error: "Follower not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create follower sync API route**

Create `src/app/api/followers/sync/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, addFollowersBulk } from "@/lib/db";
import { parseInstagramExport } from "@/lib/instagram-parser";

export async function POST(request: NextRequest) {
  const db = getDb();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const content = await file.text();
  const format = file.name.endsWith(".csv") ? "csv" : "json";

  try {
    const usernames = parseInstagramExport(content, format);
    if (usernames.length === 0) {
      return NextResponse.json({ error: "No usernames found in file" }, { status: 400 });
    }

    const result = addFollowersBulk(db, usernames);
    return NextResponse.json({
      added: result.added,
      skipped: result.skipped,
      total: usernames.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

- [ ] **Step 4: Commit follower API routes**

Stage and commit with message: "feat: add API routes for followers CRUD and Instagram sync upload"

---

### Task 9: API Routes - Battles and Leaderboard

**Files:**
- Create: `src/app/api/battles/route.ts`, `src/app/api/battles/[id]/route.ts`, `src/app/api/leaderboard/route.ts`

- [ ] **Step 1: Create battles API route**

Create `src/app/api/battles/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, getBattles, saveBattleResults } from "@/lib/db";
import type { BattleSavePayload } from "@/types";

export async function GET() {
  const db = getDb();
  const battles = getBattles(db);
  return NextResponse.json({ battles });
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const payload: BattleSavePayload = await request.json();

  if (!payload.results || !Array.isArray(payload.results) || payload.results.length === 0) {
    return NextResponse.json({ error: "Results are required" }, { status: 400 });
  }

  try {
    const battleId = saveBattleResults(db, payload);
    return NextResponse.json({ battleId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save battle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create battle detail API route**

Create `src/app/api/battles/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, getBattleDetail } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const battle = getBattleDetail(db, parseInt(id, 10));

  if (!battle) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }

  return NextResponse.json({ battle });
}
```

- [ ] **Step 3: Create leaderboard API route**

Create `src/app/api/leaderboard/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getDb, getLeaderboard } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const leaderboard = getLeaderboard(db);
  return NextResponse.json({ leaderboard });
}
```

- [ ] **Step 4: Commit battle and leaderboard API routes**

Stage and commit with message: "feat: add API routes for battles CRUD and leaderboard"

---

### Task 10: Arena Component + Battle Page (Core Simulation Renderer)

This is the most important task. The simulation must look good on a screen recording.

**Files:**
- Create: `src/components/Arena.tsx`, `src/components/KillFeed.tsx`, `src/components/PlayerCount.tsx`, `src/components/WinnerScreen.tsx`, `src/app/battle/page.tsx`

- [ ] **Step 1: Create KillFeed component**

Create `src/components/KillFeed.tsx`:

```tsx
"use client";

import type { KillEvent } from "@/types";

export default function KillFeed({ events }: { events: KillEvent[] }) {
  const recent = events.slice(-5).reverse();

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-1 z-10 pointer-events-none">
      {recent.map((event, i) => (
        <div
          key={`${event.victimId}-${event.timestamp}`}
          className="text-sm font-mono bg-black/70 text-white px-3 py-1 rounded-lg backdrop-blur-sm whitespace-nowrap"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <span className="text-red-400 font-bold">{event.killerName}</span>
          <span className="text-gray-400 mx-2">eliminated</span>
          <span className="text-gray-300">{event.victimName}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create PlayerCount component**

Create `src/components/PlayerCount.tsx`:

```tsx
"use client";

export default function PlayerCount({ alive, total }: { alive: number; total: number }) {
  return (
    <div className="absolute top-4 left-4 z-10 pointer-events-none">
      <div className="bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm font-mono">
        <span className="text-2xl font-bold">{alive}</span>
        <span className="text-gray-400 text-lg"> / {total}</span>
        <span className="text-gray-500 text-sm ml-2">alive</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create WinnerScreen component**

Create `src/components/WinnerScreen.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

export default function WinnerScreen({
  username,
  color,
  onComplete,
}: {
  username: string;
  color: string;
  onComplete?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 200);
    const t2 = setTimeout(() => setShowConfetti(true), 600);
    const t3 = setTimeout(() => onComplete?.(), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-1000"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        className="relative flex flex-col items-center gap-4 transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.5)",
        }}
      >
        <div className="text-xl font-mono tracking-[0.3em] text-yellow-400/80 uppercase">
          Follower Royale Champion
        </div>
        <div className="text-2xl mb-2">&#128081;</div>
        <div
          className="text-6xl md:text-8xl font-black tracking-tight"
          style={{
            color,
            textShadow: `0 0 40px ${color}80, 0 0 80px ${color}40`,
          }}
        >
          {username}
        </div>
        <div className="text-lg text-gray-400 font-mono mt-2">Last one standing</div>
      </div>

      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
                animation: `confetti-fall ${2 + Math.random() * 3}s linear ${Math.random() * 0.5}s forwards`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add confetti keyframes to global CSS**

Append to `src/app/globals.css`:

```css
@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}
```

- [ ] **Step 5: Create the Arena component (PixiJS renderer)**

Create `src/components/Arena.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { SimulationEngine } from "@/lib/simulation";
import type { Follower, KillEvent, SimulationSnapshot } from "@/types";
import KillFeed from "./KillFeed";
import PlayerCount from "./PlayerCount";
import WinnerScreen from "./WinnerScreen";

interface ArenaProps {
  participants: Follower[];
  onBattleEnd?: (results: ReturnType<SimulationEngine["getResults"]>, winnerId: number, duration: number) => void;
}

const CHARACTER_RADIUS = 10;
const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffffff,
  align: "center",
  dropShadow: {
    color: 0x000000,
    blur: 2,
    distance: 1,
  },
});

export default function Arena({ participants, onBattleEnd }: ArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);

  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [killFeed, setKillFeed] = useState<KillEvent[]>([]);
  const [showWinner, setShowWinner] = useState(false);
  const battleEndedRef = useRef(false);

  const handleBattleEnd = useCallback(
    (engine: SimulationEngine) => {
      if (battleEndedRef.current) return;
      battleEndedRef.current = true;
      const snap = engine.getSnapshot();
      if (snap.winner && onBattleEnd) {
        onBattleEnd(engine.getResults(), snap.winner.id, snap.elapsed);
      }
      setShowWinner(true);
    },
    [onBattleEnd]
  );

  useEffect(() => {
    if (!containerRef.current || participants.length < 2) return;

    let destroyed = false;
    const el = containerRef.current;

    const setup = async () => {
      const app = new Application();
      await app.init({
        background: 0x0a0a0f,
        resizeTo: el,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      el.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const width = app.screen.width;
      const height = app.screen.height;
      const arenaRadius = Math.min(width, height) * 0.42;

      const world = new Container();
      world.x = width / 2;
      world.y = height / 2;
      app.stage.addChild(world);

      const zoneGraphics = new Graphics();
      world.addChild(zoneGraphics);

      const engine = new SimulationEngine({
        participants,
        arenaRadius,
        battleDurationTarget: 75,
      });
      engineRef.current = engine;

      const sprites = new Map<number, { container: Container; circle: Graphics; label: Text }>();
      for (const char of engine.characters) {
        const charContainer = new Container();

        const circle = new Graphics();
        circle.circle(0, 0, CHARACTER_RADIUS);
        circle.fill(char.color);
        circle.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
        charContainer.addChild(circle);

        const label = new Text({ text: char.username, style: LABEL_STYLE });
        label.anchor.set(0.5, 0);
        label.y = CHARACTER_RADIUS + 4;
        charContainer.addChild(label);

        charContainer.x = char.x;
        charContainer.y = char.y;
        world.addChild(charContainer);
        sprites.set(char.id, { container: charContainer, circle, label });
      }

      let prevKillCount = 0;

      app.ticker.add((ticker) => {
        if (destroyed) return;

        const delta = ticker.deltaTime / 60;
        engine.tick(delta);
        const snap = engine.getSnapshot();

        // Update zone visual
        zoneGraphics.clear();
        zoneGraphics.circle(snap.zoneCenterX, snap.zoneCenterY, snap.zoneRadius);
        zoneGraphics.stroke({ width: 3, color: 0xff3333, alpha: 0.5 });
        zoneGraphics.circle(snap.zoneCenterX, snap.zoneCenterY, snap.zoneRadius + 2000);
        zoneGraphics.circle(snap.zoneCenterX, snap.zoneCenterY, snap.zoneRadius);
        zoneGraphics.fill({ color: 0xff0000, alpha: 0.08 });

        // Update character sprites
        for (const char of snap.characters) {
          const sprite = sprites.get(char.id);
          if (!sprite) continue;

          if (!char.alive) {
            if (sprite.container.alpha > 0) {
              sprite.container.alpha -= delta * 3;
              sprite.container.scale.set(
                Math.max(sprite.container.scale.x - delta * 3, 0)
              );
              if (sprite.container.alpha <= 0) {
                sprite.container.visible = false;
              }
            }
            continue;
          }

          sprite.container.x = char.x;
          sprite.container.y = char.y;
        }

        // Camera: zoom in on final 2
        if (snap.aliveCount === 2 && !snap.isFinished) {
          const alive = snap.characters.filter((c) => c.alive);
          const midX = (alive[0].x + alive[1].x) / 2;
          const midY = (alive[0].y + alive[1].y) / 2;
          const dist = Math.sqrt(
            (alive[0].x - alive[1].x) ** 2 + (alive[0].y - alive[1].y) ** 2
          );
          const targetScale = Math.min(Math.max(arenaRadius / (dist + 100), 1), 2.5);

          world.scale.set(world.scale.x + (targetScale - world.scale.x) * 0.03);
          world.x += (width / 2 - midX * world.scale.x - world.x) * 0.03;
          world.y += (height / 2 - midY * world.scale.y - world.y) * 0.03;
        }

        // Update kill feed
        if (snap.killFeed.length > prevKillCount) {
          prevKillCount = snap.killFeed.length;
          setKillFeed([...snap.killFeed]);
        }

        setSnapshot({ ...snap });

        if (snap.isFinished) {
          handleBattleEnd(engine);
        }
      });
    };

    setup();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [participants, handleBattleEnd]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0f]">
      <div ref={containerRef} className="w-full h-full" />
      {snapshot && (
        <>
          <PlayerCount alive={snapshot.aliveCount} total={snapshot.totalCount} />
          <KillFeed events={killFeed} />
        </>
      )}
      {showWinner && snapshot?.winner && (
        <WinnerScreen username={snapshot.winner.username} color={snapshot.winner.color} />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create the Battle page**

Create `src/app/battle/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Follower, BattleSavePayload } from "@/types";
import type { SimulationEngine } from "@/lib/simulation";

const Arena = dynamic(() => import("@/components/Arena"), { ssr: false });

export default function BattlePage() {
  const [participants, setParticipants] = useState<Follower[] | null>(null);
  const [battleStarted, setBattleStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("battleParticipants");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Follower[];
        setParticipants(parsed);
        setBattleStarted(true);
      } catch {
        console.error("Failed to parse battle participants");
      }
    }
  }, []);

  const handleBattleEnd = async (
    results: ReturnType<SimulationEngine["getResults"]>,
    winnerId: number,
    duration: number
  ) => {
    if (saved || !participants) return;
    setSaved(true);

    const payload: BattleSavePayload = {
      participantIds: participants.map((p) => p.id),
      winnerId,
      durationSeconds: Math.round(duration * 10) / 10,
      results,
    };

    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("Battle saved:", data.battleId);
      sessionStorage.removeItem("battleParticipants");
    } catch (err) {
      console.error("Failed to save battle:", err);
    }
  };

  if (!battleStarted || !participants) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f] text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">No Battle Loaded</h1>
          <p className="text-gray-400 mb-6">Start a battle from the admin panel.</p>
          <a href="/admin" className="text-blue-400 hover:underline">Go to Admin</a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <Arena participants={participants} onBattleEnd={handleBattleEnd} />
    </div>
  );
}
```

- [ ] **Step 7: Verify the battle page loads**

Start dev server, visit http://localhost:3000/battle — should show "No Battle Loaded" message.

- [ ] **Step 8: Commit arena and battle page**

Stage and commit with message: "feat: add PixiJS arena renderer with kill feed, player count, winner screen"

---

### Task 11: Admin Panel

**Files:**
- Create: `src/components/FollowerUpload.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: Create FollowerUpload component**

Create `src/components/FollowerUpload.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";

interface UploadResult {
  added: number;
  skipped: number;
  total: number;
}

export default function FollowerUpload({ onSync }: { onSync: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/followers/sync", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
      } else {
        setResult(data);
        onSync();
      }
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-bold mb-4">Sync Followers</h2>
      <p className="text-gray-400 text-sm mb-4">
        Upload your Instagram data export (JSON or CSV) to sync followers.
      </p>
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv"
          className="text-sm text-gray-400 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-500"
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload & Sync"}
        </button>
      </div>
      {result && (
        <div className="mt-3 text-sm text-green-400">
          {result.added} new followers added, {result.skipped} already existed ({result.total} in file)
        </div>
      )}
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create admin page**

Create `src/app/admin/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FollowerUpload from "@/components/FollowerUpload";
import type { Follower, Battle } from "@/types";

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followerSearch, setFollowerSearch] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const [battles, setBattles] = useState<(Battle & { winner_username: string | null })[]>([]);
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [useAll, setUseAll] = useState(true);

  const loadFollowers = useCallback(async () => {
    const params = followerSearch ? `?search=${encodeURIComponent(followerSearch)}` : "";
    const res = await fetch(`/api/followers${params}`);
    const data = await res.json();
    setFollowers(data.followers);
    setFollowerCount(data.total);
  }, [followerSearch]);

  const loadBattles = useCallback(async () => {
    const res = await fetch("/api/battles");
    const data = await res.json();
    setBattles(data.battles);
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadFollowers();
      loadBattles();
    }
  }, [authenticated, loadFollowers, loadBattles]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Invalid password");
    }
  };

  const addFollower = async () => {
    if (!newUsername.trim()) return;
    const res = await fetch("/api/followers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername }),
    });
    if (res.ok) {
      setNewUsername("");
      loadFollowers();
    }
  };

  const removeFollower = async (id: number) => {
    await fetch("/api/followers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadFollowers();
  };

  const runBattle = async () => {
    let selected: Follower[];
    if (useAll) {
      const res = await fetch("/api/followers");
      const data = await res.json();
      selected = data.followers;
    } else {
      const res = await fetch("/api/followers");
      const data = await res.json();
      const all: Follower[] = data.followers;
      const shuffled = all.sort(() => Math.random() - 0.5);
      selected = shuffled.slice(0, maxParticipants);
    }

    if (selected.length < 2) {
      alert("Need at least 2 followers to run a battle.");
      return;
    }

    sessionStorage.setItem("battleParticipants", JSON.stringify(selected));
    router.push("/battle");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <form onSubmit={handleAuth} className="bg-gray-900 p-8 rounded-xl border border-gray-800 w-80">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 mb-4 focus:outline-none focus:border-blue-500"
          />
          {authError && <p className="text-red-400 text-sm mb-3">{authError}</p>}
          <button type="submit" className="w-full py-2 bg-blue-600 rounded-lg hover:bg-blue-500 font-medium">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      <FollowerUpload onSync={loadFollowers} />

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mt-6">
        <h2 className="text-lg font-bold mb-4">Run Battle</h2>
        <p className="text-gray-400 text-sm mb-4">{followerCount} total followers available</p>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useAll} onChange={(e) => setUseAll(e.target.checked)} className="rounded" />
            <span className="text-sm">Use all followers</span>
          </label>
          {!useAll && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Max:</span>
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 50)}
                min={2}
                max={500}
                className="w-20 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm"
              />
            </div>
          )}
        </div>
        <button onClick={runBattle} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 font-bold text-lg">
          Run Battle
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mt-6">
        <h2 className="text-lg font-bold mb-4">Followers ({followerCount})</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={followerSearch}
            onChange={(e) => setFollowerSearch(e.target.value)}
            placeholder="Search followers..."
            className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Add username"
            className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === "Enter" && addFollower()}
          />
          <button onClick={addFollower} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 text-sm">
            Add
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {followers.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-800 rounded">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: f.avatar_color }} />
                <span className="font-mono text-sm">{f.username}</span>
              </div>
              <button onClick={() => removeFollower(f.id)} className="text-red-400 hover:text-red-300 text-sm">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mt-6">
        <h2 className="text-lg font-bold mb-4">Past Battles</h2>
        {battles.length === 0 ? (
          <p className="text-gray-500 text-sm">No battles yet.</p>
        ) : (
          <div className="space-y-2">
            {battles.map((b) => (
              <a
                key={b.id}
                href={`/battles/${b.id}`}
                className="flex items-center justify-between py-3 px-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
              >
                <div>
                  <span className="font-bold">Battle #{b.id}</span>
                  <span className="text-gray-400 text-sm ml-3">{b.participant_count} fighters</span>
                </div>
                <div className="text-right">
                  <span className="text-yellow-400 font-bold">{b.winner_username ?? "Unknown"}</span>
                  <span className="text-gray-500 text-sm ml-3">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify admin panel loads**

Start dev server, visit http://localhost:3000/admin — should show password prompt.

- [ ] **Step 4: Commit admin panel**

Stage and commit with message: "feat: add admin panel with follower sync, battle controls, and management"

---

### Task 12: Leaderboard Page

**Files:**
- Create: `src/components/LeaderboardTable.tsx`, `src/app/leaderboard/page.tsx`

- [ ] **Step 1: Create LeaderboardTable component**

Create `src/components/LeaderboardTable.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import type { LeaderboardEntry } from "@/types";

type SortKey = "wins" | "total_kills" | "battles_played" | "win_rate" | "avg_placement";

export default function LeaderboardTable({
  entries,
  linkToProfile = true,
}: {
  entries: LeaderboardEntry[];
  linkToProfile?: boolean;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("wins");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => {
    let filtered = entries;
    if (search) {
      const q = search.toLowerCase();
      filtered = entries.filter((e) => e.username.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
      return sortAsc ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
    });
  }, [entries, sortBy, sortAsc, search]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors select-none"
    >
      {label} {sortBy === field ? (sortAsc ? "\u25B2" : "\u25BC") : ""}
    </th>
  );

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by username..."
        className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 mb-4 focus:outline-none focus:border-blue-500 text-white"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400 border-b border-gray-800">
            <tr>
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Player</th>
              <SortHeader label="Wins" field="wins" />
              <SortHeader label="Kills" field="total_kills" />
              <SortHeader label="Battles" field="battles_played" />
              <SortHeader label="Win %" field="win_rate" />
              <SortHeader label="Avg Place" field="avg_placement" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => (
              <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-gray-500 font-mono">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.avatar_color }} />
                    {linkToProfile ? (
                      <a href={`/player/${entry.username}`} className="font-mono hover:text-blue-400 transition-colors">
                        {entry.username}
                      </a>
                    ) : (
                      <span className="font-mono">{entry.username}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-yellow-400">{entry.wins}</td>
                <td className="px-4 py-3 text-right font-mono">{entry.total_kills}</td>
                <td className="px-4 py-3 text-right font-mono">{entry.battles_played}</td>
                <td className="px-4 py-3 text-right font-mono">{entry.win_rate}%</td>
                <td className="px-4 py-3 text-right font-mono">{entry.avg_placement}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {search ? "No players match your search" : "No battles played yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create leaderboard page**

Create `src/app/leaderboard/page.tsx`:

```tsx
import LeaderboardTable from "@/components/LeaderboardTable";
import { getDb, getLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const db = getDb();
  const entries = getLeaderboard(db);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/" className="text-gray-500 hover:text-gray-300 text-sm">&larr; Home</a>
        </div>
        <h1 className="text-4xl font-black mb-2">Leaderboard</h1>
        <p className="text-gray-400 mb-8">{entries.length} fighters ranked by wins</p>
        <LeaderboardTable entries={entries} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit leaderboard page**

Stage and commit with message: "feat: add leaderboard page with sortable, searchable table"

---

### Task 13: Player Profile Page

**Files:**
- Create: `src/app/player/[username]/page.tsx`

- [ ] **Step 1: Create player profile page**

Create `src/app/player/[username]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getDb, getPlayerStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = getDb();
  const stats = getPlayerStats(db, decodeURIComponent(username));

  if (!stats) return notFound();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/leaderboard" className="text-gray-500 hover:text-gray-300 text-sm">&larr; Leaderboard</a>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full" style={{ backgroundColor: stats.follower.avatar_color }} />
          <div>
            <h1 className="text-3xl font-black">{stats.follower.username}</h1>
            <p className="text-gray-400 text-sm">Joined {new Date(stats.follower.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Wins", value: stats.wins, color: "text-yellow-400" },
            { label: "Total Kills", value: stats.total_kills, color: "text-red-400" },
            { label: "Battles", value: stats.battles_played, color: "text-blue-400" },
            { label: "Win Rate", value: `${stats.win_rate}%`, color: "text-green-400" },
            { label: "Best Place", value: stats.best_placement || "-", color: "text-purple-400" },
            { label: "Avg Place", value: stats.avg_placement || "-", color: "text-orange-400" },
            { label: "Win Streak", value: stats.current_streak, color: "text-pink-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4">Battle History</h2>
        {stats.battleHistory.length === 0 ? (
          <p className="text-gray-500">No battles yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.battleHistory.map((b) => (
              <a
                key={b.battle_id}
                href={`/battles/${b.battle_id}`}
                className="flex items-center justify-between py-3 px-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold ${b.placement === 1 ? "text-yellow-400" : b.placement <= 3 ? "text-blue-400" : "text-gray-400"}`}>
                    #{b.placement}
                  </span>
                  <span className="text-gray-500 text-sm">of {b.participant_count}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-red-400 font-mono text-sm">{b.kills} kills</span>
                  <span className="text-gray-600 text-sm">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit player profile page**

Stage and commit with message: "feat: add player profile page with stats and battle history"

---

### Task 14: Battle History and Detail Pages

**Files:**
- Create: `src/app/battles/page.tsx`, `src/app/battles/[id]/page.tsx`

- [ ] **Step 1: Create battle history list page**

Create `src/app/battles/page.tsx`:

```tsx
import { getDb, getBattles } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function BattlesPage() {
  const db = getDb();
  const battles = getBattles(db);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/" className="text-gray-500 hover:text-gray-300 text-sm">&larr; Home</a>
        </div>
        <h1 className="text-4xl font-black mb-2">Battle History</h1>
        <p className="text-gray-400 mb-8">{battles.length} battles fought</p>

        {battles.length === 0 ? (
          <p className="text-gray-500">No battles yet.</p>
        ) : (
          <div className="space-y-3">
            {battles.map((b) => (
              <a
                key={b.id}
                href={`/battles/${b.id}`}
                className="block bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold">Battle #{b.id}</span>
                    <span className="text-gray-500 text-sm ml-3">{b.participant_count} fighters</span>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">{b.winner_username ?? "Unknown"}</div>
                    <div className="text-gray-600 text-sm">
                      {new Date(b.created_at).toLocaleDateString()} &middot;{" "}
                      {b.duration_seconds ? `${Math.round(b.duration_seconds)}s` : "-"}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create battle detail page**

Create `src/app/battles/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getDb, getBattleDetail } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BattleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const battle = getBattleDetail(db, parseInt(id, 10));

  if (!battle) return notFound();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/battles" className="text-gray-500 hover:text-gray-300 text-sm">&larr; All Battles</a>
        </div>

        <h1 className="text-4xl font-black mb-2">Battle #{battle.id}</h1>
        <div className="text-gray-400 mb-2">
          {battle.participant_count} fighters &middot;{" "}
          {battle.duration_seconds ? `${Math.round(battle.duration_seconds)}s` : ""} &middot;{" "}
          {new Date(battle.created_at).toLocaleString()}
        </div>

        {battle.winner_username && (
          <div className="bg-gray-900 rounded-xl p-6 border border-yellow-400/30 mb-8 text-center">
            <div className="text-sm text-yellow-400/60 uppercase tracking-widest mb-1">Champion</div>
            <a href={`/player/${battle.winner_username}`} className="text-3xl font-black text-yellow-400 hover:underline">
              {battle.winner_username}
            </a>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">Results</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left w-16">Place</th>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-right">Kills</th>
                <th className="px-4 py-3 text-right">Killed By</th>
                <th className="px-4 py-3 text-right">Survived</th>
              </tr>
            </thead>
            <tbody>
              {battle.results.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <span className={`font-bold ${r.placement === 1 ? "text-yellow-400" : r.placement <= 3 ? "text-blue-400" : "text-gray-500"}`}>
                      #{r.placement}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.avatar_color }} />
                      <a href={`/player/${r.username}`} className="font-mono hover:text-blue-400">{r.username}</a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-400">{r.kills}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">
                    {r.killer_username ?? (r.placement === 1 ? "-" : "Zone")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">
                    {r.survived_seconds ? `${Math.round(r.survived_seconds)}s` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit battle pages**

Stage and commit with message: "feat: add battle history list and detail pages"

---

### Task 15: Landing Page

**Files:**
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`

- [ ] **Step 1: Build the landing page**

Replace `src/app/page.tsx` with:

```tsx
import { getDb, getBattles, getLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const db = getDb();
  const battles = getBattles(db);
  const leaderboard = getLeaderboard(db).slice(0, 10);
  const latestBattle = battles[0] ?? null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight">
          Every follower fights.<br />
          <span className="text-red-500">One wins.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-lg mb-8">
          Follow on Instagram to join the daily battle royale. Watch the Reel to see if you survived.
        </p>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          Follow to Enter
        </a>
      </section>

      {latestBattle && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Latest Battle</h2>
          <a
            href={`/battles/${latestBattle.id}`}
            className="block bg-gray-900 rounded-xl p-8 border border-gray-800 hover:border-gray-700 transition-colors text-center"
          >
            <div className="text-sm text-gray-500 mb-2">
              Battle #{latestBattle.id} &middot; {latestBattle.participant_count} fighters
            </div>
            <div className="text-4xl font-black text-yellow-400 mb-1">
              {latestBattle.winner_username ?? "Unknown"}
            </div>
            <div className="text-gray-500 text-sm">
              {new Date(latestBattle.created_at).toLocaleDateString()}
            </div>
          </a>
        </section>
      )}

      {leaderboard.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm uppercase tracking-widest text-gray-500">Top Fighters</h2>
            <a href="/leaderboard" className="text-blue-400 hover:underline text-sm">View All &rarr;</a>
          </div>
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <a
                key={entry.id}
                href={`/player/${entry.username}`}
                className="flex items-center justify-between py-3 px-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`font-bold w-8 text-center ${i < 3 ? "text-yellow-400" : "text-gray-500"}`}>
                    {i + 1}
                  </span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.avatar_color }} />
                  <span className="font-mono">{entry.username}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 font-bold">{entry.wins}W</span>
                  <span className="text-gray-500 text-sm">{entry.total_kills} kills</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <footer className="max-w-3xl mx-auto px-6 py-12 flex gap-6 text-sm text-gray-600">
        <a href="/leaderboard" className="hover:text-gray-400">Leaderboard</a>
        <a href="/battles" className="hover:text-gray-400">Battle History</a>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Update root layout for dark theme**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Follower Royale",
  description: "Every follower fights. One wins.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${mono.variable} antialiased bg-[#0a0a0f] text-white`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the landing page**

Start dev server, visit http://localhost:3000 — should show the hero section.

- [ ] **Step 4: Commit landing page**

Stage and commit with message: "feat: add landing page with hero, latest battle, and top 10 preview"

---

### Task 16: Integration Test - Full Battle Flow

**Files:** None new — this is a manual integration test through the UI.

- [ ] **Step 1: Start the dev server**

- [ ] **Step 2: Add test followers via admin**

Go to http://localhost:3000/admin, enter password "changeme", manually add 10-15 test followers using the "Add username" field (e.g., test_user_1 through test_user_15).

- [ ] **Step 3: Run a battle**

On the admin panel, check "Use all followers", click "Run Battle". Verify:
- Characters spawn around the arena edge with visible usernames
- Characters move toward each other and fight
- Kill feed shows eliminations in the top-right
- Player count decreases in the top-left
- Zone circle shrinks over time (red border visible)
- Final 2 get camera zoom-in
- Winner screen shows with confetti and champion text
- Check browser console for "Battle saved: [id]"

- [ ] **Step 4: Verify data pages**

1. Go to http://localhost:3000 — landing page should show latest battle winner
2. Go to http://localhost:3000/leaderboard — winner should appear with 1 win
3. Click the winner's name — player profile should show battle history
4. Go to http://localhost:3000/battles — battle should be listed
5. Click the battle — full results with placements, kills, etc.

- [ ] **Step 5: Run all unit tests**

Run `npx vitest run`. Expected: All tests pass.

- [ ] **Step 6: Commit any fixes**

If any issues were found and fixed during integration testing, stage and commit with message: "fix: integration test fixes for full battle flow"
