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
  return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0");
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
      .all("%" + search + "%") as Follower[];
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
