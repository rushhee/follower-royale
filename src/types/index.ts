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
  id: number;
  username: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  power: number;
  alive: boolean;
  kills: number;
  killedBy: number | null;
  deathTime: number | null;
}

export interface KillEvent {
  killerName: string;
  killerId: number;
  victimName: string;
  victimId: number;
  timestamp: number;
}

export interface BattleConfig {
  participants: Follower[];
  arenaRadius: number;
  battleDurationTarget: number;
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
