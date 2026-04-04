import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../simulation";
import type { Follower, BattleConfig } from "@/types";

function makeFollowers(count: number): Follower[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    username: `user${i + 1}`,
    avatar_color: `#${((i * 37) % 256).toString(16).padStart(2, "0")}0000`,
    avatar_url: null,
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

  it("initializes characters with health", () => {
    const config: BattleConfig = {
      participants: makeFollowers(5),
      arenaRadius: 400,
      battleDurationTarget: 60,
    };
    const engine = new SimulationEngine(config);
    const snap = engine.getSnapshot();
    for (const char of snap.characters) {
      expect(char.hp).toBe(100);
      expect(char.maxHp).toBe(100);
      expect(char.lastHitTime).toBeNull();
    }
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

  it("populates hitFeed during simulation", () => {
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
    const snap = engine.getSnapshot();
    expect(snap.hitFeed.length).toBeGreaterThan(0);
    for (const hit of snap.hitFeed) {
      expect(hit.damage).toBeGreaterThan(0);
      expect(hit.attackerId).not.toBe(hit.defenderId);
    }
  });
});
