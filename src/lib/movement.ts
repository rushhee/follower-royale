import type { CharacterState } from "@/types";

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

  const smoothing = nearest ? 0.6 : 0.15;
  const vx = char.vx + (targetVx - char.vx) * smoothing;
  const vy = char.vy + (targetVy - char.vy) * smoothing;

  return { vx, vy };
}

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
