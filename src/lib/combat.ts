import type { CharacterState } from "@/types";

export interface DamageResult {
  attackerId: number;
  defenderId: number;
  damage: number;
}

/**
 * When two characters collide, the one with higher power attacks.
 * Small random chance the weaker one attacks instead (30%).
 * Damage is based on attacker's power stat.
 */
export function resolveDamage(a: CharacterState, b: CharacterState): DamageResult {
  // Higher power usually attacks, but 30% chance the underdog strikes
  const aAttacks = Math.random() < (a.power / (a.power + b.power) + 0.1);
  const attacker = aAttacks ? a : b;
  const defender = aAttacks ? b : a;

  const baseDamage = 25 + Math.random() * 15;
  const powerBonus = attacker.power * 10;
  const damage = Math.round(baseDamage + powerBonus);

  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    damage,
  };
}

export function isColliding(a: CharacterState, b: CharacterState, collisionRadius: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < collisionRadius * collisionRadius;
}
