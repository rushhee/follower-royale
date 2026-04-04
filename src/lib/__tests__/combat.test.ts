import { describe, it, expect } from "vitest";
import { resolveDamage } from "../combat";
import type { CharacterState } from "@/types";

function makeChar(overrides: Partial<CharacterState> = {}): CharacterState {
  return {
    id: 1, username: "test", color: "#ff0000",
    x: 0, y: 0, vx: 0, vy: 0,
    power: 1.0, alive: true, kills: 0,
    killedBy: null, deathTime: null,
    hp: 100, maxHp: 100, lastHitTime: null,
    ...overrides,
  };
}

describe("resolveDamage", () => {
  it("returns damage greater than zero", () => {
    const a = makeChar({ id: 1, username: "alice", power: 1.0 });
    const b = makeChar({ id: 2, username: "bob", power: 1.0 });
    const result = resolveDamage(a, b);
    expect(result.damage).toBeGreaterThan(0);
    expect([a.id, b.id]).toContain(result.attackerId);
    expect([a.id, b.id]).toContain(result.defenderId);
    expect(result.attackerId).not.toBe(result.defenderId);
  });

  it("damage is in expected range", () => {
    const a = makeChar({ id: 1, power: 1.0 });
    const b = makeChar({ id: 2, power: 1.0 });
    for (let i = 0; i < 100; i++) {
      const result = resolveDamage(a, b);
      // Base 25 + random(0-15) + power(0.5-1.5)*10 = min ~30, max ~55
      expect(result.damage).toBeGreaterThanOrEqual(25);
      expect(result.damage).toBeLessThanOrEqual(55);
    }
  });

  it("higher power tends to be the attacker more often", () => {
    const strong = makeChar({ id: 1, power: 1.5 });
    const weak = makeChar({ id: 2, power: 0.5 });
    let strongAttacks = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const result = resolveDamage(strong, weak);
      if (result.attackerId === strong.id) strongAttacks++;
    }
    expect(strongAttacks / trials).toBeGreaterThan(0.6);
  });

  it("equal power results in roughly balanced attacker selection", () => {
    const a = makeChar({ id: 1, power: 1.0 });
    const b = makeChar({ id: 2, power: 1.0 });
    let aAttacks = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const result = resolveDamage(a, b);
      if (result.attackerId === a.id) aAttacks++;
    }
    expect(aAttacks / trials).toBeGreaterThan(0.35);
    expect(aAttacks / trials).toBeLessThan(0.85);
  });
});
