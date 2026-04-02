import { describe, it, expect } from "vitest";
import { resolveFight } from "../combat";
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
