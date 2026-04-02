import type { CharacterState, KillEvent, BattleConfig, SimulationSnapshot } from "@/types";
import { resolveFight, isColliding } from "./combat";
import { computeVelocity, applyZonePush } from "./movement";

const CHARACTER_RADIUS = 12;
const COLLISION_DISTANCE = CHARACTER_RADIUS * 2.5;
const DETECTION_RADIUS = 150;
const BASE_SPEED = 120;
const FIGHT_COOLDOWN = 0.5;

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
  private eliminationOrder: number[] = [];
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

    for (const [id, cd] of this.fightCooldowns) {
      const newCd = cd - deltaSeconds;
      if (newCd <= 0) this.fightCooldowns.delete(id);
      else this.fightCooldowns.set(id, newCd);
    }

    const shrinkStart = this.battleDurationTarget * 0.2;
    const shrinkEnd = this.battleDurationTarget * 0.9;
    if (this.elapsed > shrinkStart) {
      const shrinkProgress = Math.min((this.elapsed - shrinkStart) / (shrinkEnd - shrinkStart), 1);
      const minRadius = this.initialZoneRadius * 0.05;
      this.zoneRadius = this.initialZoneRadius - (this.initialZoneRadius - minRadius) * shrinkProgress;
    }

    const alive = this.characters.filter((c) => c.alive);

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
