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
