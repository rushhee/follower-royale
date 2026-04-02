import type { CharacterState } from "@/types";

export interface FightResult {
  winnerId: number;
  loserId: number;
}

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

export function isColliding(a: CharacterState, b: CharacterState, collisionRadius: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < collisionRadius * collisionRadius;
}
