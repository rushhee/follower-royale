"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Container, Graphics, Text, TextStyle, Assets, Sprite } from "pixi.js";
import { SimulationEngine } from "@/lib/simulation";
import type { Follower, KillEvent, SimulationSnapshot } from "@/types";
import KillFeed from "./KillFeed";
import PlayerCount from "./PlayerCount";
import WinnerScreen from "./WinnerScreen";

interface ArenaProps {
  participants: Follower[];
  onBattleEnd?: (results: ReturnType<SimulationEngine["getResults"]>, winnerId: number, duration: number) => void;
}

const CHARACTER_RADIUS = 10;
const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffffff,
  align: "center",
  dropShadow: {
    color: 0x000000,
    blur: 2,
    distance: 1,
  },
});

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  graphics: Graphics;
}

interface DamageText {
  text: Text;
  life: number;
  vy: number;
}

export default function Arena({ participants, onBattleEnd }: ArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);

  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [killFeed, setKillFeed] = useState<KillEvent[]>([]);
  const [showWinner, setShowWinner] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const battleEndedRef = useRef(false);
  const simulationStarted = useRef(false);

  const handleBattleEnd = useCallback(
    (engine: SimulationEngine) => {
      if (battleEndedRef.current) return;
      battleEndedRef.current = true;
      const snap = engine.getSnapshot();
      if (snap.winner && onBattleEnd) {
        onBattleEnd(engine.getResults(), snap.winner.id, snap.elapsed);
      }
      setShowWinner(true);
    },
    [onBattleEnd]
  );

  useEffect(() => {
    if (!containerRef.current || participants.length < 2) return;

    let destroyed = false;
    const el = containerRef.current;

    const setup = async () => {
      const app = new Application();
      await app.init({
        background: 0x0a0a0f,
        resizeTo: el,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      el.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const width = app.screen.width;
      const height = app.screen.height;
      const arenaRadius = Math.min(width, height) * 0.42;

      const world = new Container();
      world.x = width / 2;
      world.y = height / 2;
      app.stage.addChild(world);

      const zoneGraphics = new Graphics();
      world.addChild(zoneGraphics);

      const engine = new SimulationEngine({
        participants,
        arenaRadius,
        battleDurationTarget: 75,
      });
      engineRef.current = engine;

      // Preload avatar images
      const avatarTextures = new Map<number, any>();
      const loadPromises = engine.characters.map(async (char) => {
        try {
          const participant = participants.find(p => p.id === char.id);
          const url = participant?.avatar_url;
          if (!url) return;
          const texture = await Assets.load({ src: url, loadParser: 'loadTextures' });
          avatarTextures.set(char.id, texture);
        } catch {
          // Will fall back to colored circle
        }
      });
      await Promise.allSettled(loadPromises);

      const sprites = new Map<number, { container: Container; circle: Graphics | null; label: Text; hpBar: Graphics }>();
      for (const char of engine.characters) {
        const charContainer = new Container();

        const avatarTexture = avatarTextures.get(char.id);
        let circle: Graphics | null = null;
        if (avatarTexture) {
          const avatar = new Sprite(avatarTexture);
          avatar.width = CHARACTER_RADIUS * 2;
          avatar.height = CHARACTER_RADIUS * 2;
          avatar.anchor.set(0.5);

          const mask = new Graphics();
          mask.circle(0, 0, CHARACTER_RADIUS);
          mask.fill(0xffffff);
          charContainer.addChild(mask);
          avatar.mask = mask;
          charContainer.addChild(avatar);
        } else {
          circle = new Graphics();
          circle.circle(0, 0, CHARACTER_RADIUS);
          circle.fill(char.color);
          circle.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
          charContainer.addChild(circle);
        }

        // Health bar background
        const hpBg = new Graphics();
        hpBg.rect(-15, -CHARACTER_RADIUS - 8, 30, 4);
        hpBg.fill({ color: 0x333333, alpha: 0.8 });
        charContainer.addChild(hpBg);

        // Health bar fill
        const hpBar = new Graphics();
        hpBar.rect(-15, -CHARACTER_RADIUS - 8, 30, 4);
        hpBar.fill(0x00ff00);
        charContainer.addChild(hpBar);

        const label = new Text({ text: char.username, style: LABEL_STYLE });
        label.anchor.set(0.5, 0);
        label.y = CHARACTER_RADIUS + 4;
        charContainer.addChild(label);

        charContainer.x = char.x;
        charContainer.y = char.y;
        world.addChild(charContainer);
        sprites.set(char.id, { container: charContainer, circle, label, hpBar });
      }

      let prevKillCount = 0;
      let lastProcessedHitIndex = 0;
      const particles: Particle[] = [];
      const damageTexts: DamageText[] = [];
      let shakeIntensity = 0;

      // Countdown before starting
      setCountdown(3);
      await new Promise(r => setTimeout(r, 1000));
      if (destroyed) return;
      setCountdown(2);
      await new Promise(r => setTimeout(r, 1000));
      if (destroyed) return;
      setCountdown(1);
      await new Promise(r => setTimeout(r, 1000));
      if (destroyed) return;
      setCountdown("GO!");
      await new Promise(r => setTimeout(r, 600));
      if (destroyed) return;
      setCountdown(null);
      simulationStarted.current = true;

      app.ticker.add((ticker) => {
        if (destroyed || !simulationStarted.current) return;

        const delta = ticker.deltaTime / 60;
        engine.tick(delta);
        const snap = engine.getSnapshot();

        // Update zone visual with pulsing border
        zoneGraphics.clear();
        const zonePulse = 0.3 + Math.sin(snap.elapsed * 3) * 0.2;
        zoneGraphics.circle(snap.zoneCenterX, snap.zoneCenterY, snap.zoneRadius);
        zoneGraphics.stroke({ width: 3 + Math.sin(snap.elapsed * 2) * 1, color: 0xff3333, alpha: zonePulse + 0.2 });
        zoneGraphics.circle(snap.zoneCenterX, snap.zoneCenterY, snap.zoneRadius + 2000);
        zoneGraphics.circle(snap.zoneCenterX, snap.zoneCenterY, snap.zoneRadius);
        zoneGraphics.fill({ color: 0xff0000, alpha: 0.08 });

        // Process new hits for particles and damage numbers
        const newHits = snap.hitFeed.slice(lastProcessedHitIndex);
        lastProcessedHitIndex = snap.hitFeed.length;

        for (const hit of newHits) {
          // Spawn impact sparks
          const count = hit.killed ? 20 : 8;
          for (let p = 0; p < count; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * (hit.killed ? 200 : 100);
            const life = 0.3 + Math.random() * 0.4;
            const particle: Particle = {
              x: hit.defenderX,
              y: hit.defenderY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life,
              maxLife: life,
              color: hit.killed ? 0xff4444 : 0xffaa00,
              graphics: new Graphics(),
            };
            particle.graphics.circle(0, 0, hit.killed ? 3 : 2);
            particle.graphics.fill(particle.color);
            world.addChild(particle.graphics);
            particles.push(particle);
          }

          // Spawn damage number
          const dmgText = new Text({
            text: `-${hit.damage}`,
            style: new TextStyle({
              fontSize: hit.killed ? 16 : 12,
              fill: hit.killed ? 0xff4444 : 0xffcc00,
              fontFamily: "monospace",
              fontWeight: "bold",
              dropShadow: { color: 0x000000, blur: 2, distance: 1 },
            }),
          });
          dmgText.x = hit.defenderX;
          dmgText.y = hit.defenderY - 20;
          dmgText.anchor.set(0.5);
          world.addChild(dmgText);
          damageTexts.push({ text: dmgText, life: 0.8, vy: -60 });

          // Screen shake on kills
          if (hit.killed) {
            shakeIntensity = 8;
          }
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life -= delta;
          if (p.life <= 0) {
            world.removeChild(p.graphics);
            p.graphics.destroy();
            particles.splice(i, 1);
            continue;
          }
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.graphics.x = p.x;
          p.graphics.y = p.y;
          p.graphics.alpha = p.life / p.maxLife;
        }

        // Update damage texts
        for (let i = damageTexts.length - 1; i >= 0; i--) {
          const dt = damageTexts[i];
          dt.life -= delta;
          if (dt.life <= 0) {
            world.removeChild(dt.text);
            dt.text.destroy();
            damageTexts.splice(i, 1);
            continue;
          }
          dt.text.y += dt.vy * delta;
          dt.text.alpha = dt.life / 0.8;
        }

        // Update character sprites
        for (const char of snap.characters) {
          const sprite = sprites.get(char.id);
          if (!sprite) continue;

          if (!char.alive) {
            if (sprite.container.alpha > 0) {
              sprite.container.alpha -= delta * 3;
              sprite.container.scale.set(
                Math.max(sprite.container.scale.x - delta * 3, 0)
              );
              if (sprite.container.alpha <= 0) {
                sprite.container.visible = false;
              }
            }
            continue;
          }

          sprite.container.x = char.x;
          sprite.container.y = char.y;

          // Hit flash effect
          if (char.lastHitTime && snap.elapsed - char.lastHitTime < 0.15) {
            sprite.container.alpha = 0.5 + Math.sin(snap.elapsed * 40) * 0.5;
          } else if (char.alive) {
            sprite.container.alpha = 1;
          }

          // Update health bar
          const hpPercent = char.hp / char.maxHp;
          sprite.hpBar.clear();
          sprite.hpBar.rect(-15, -CHARACTER_RADIUS - 8, 30 * hpPercent, 4);
          const hpColor = hpPercent > 0.6 ? 0x00ff00 : hpPercent > 0.3 ? 0xffaa00 : 0xff0000;
          sprite.hpBar.fill(hpColor);

          // Kill growth
          const growthScale = 1 + char.kills * 0.08;
          sprite.container.scale.set(Math.min(growthScale, 1.5));
        }

        // Camera: zoom in on final 2
        if (snap.aliveCount === 2 && !snap.isFinished) {
          const alive = snap.characters.filter((c) => c.alive);
          const midX = (alive[0].x + alive[1].x) / 2;
          const midY = (alive[0].y + alive[1].y) / 2;
          const dist = Math.sqrt(
            (alive[0].x - alive[1].x) ** 2 + (alive[0].y - alive[1].y) ** 2
          );
          const targetScale = Math.min(Math.max(arenaRadius / (dist + 100), 1), 2.5);

          world.scale.set(world.scale.x + (targetScale - world.scale.x) * 0.03);
          world.x += (width / 2 - midX * world.scale.x - world.x) * 0.03;
          world.y += (height / 2 - midY * world.scale.y - world.y) * 0.03;
        }

        // Apply screen shake
        if (shakeIntensity > 0) {
          world.x += (Math.random() - 0.5) * shakeIntensity;
          world.y += (Math.random() - 0.5) * shakeIntensity;
          shakeIntensity *= 0.9;
          if (shakeIntensity < 0.5) shakeIntensity = 0;
        }

        // Update kill feed
        if (snap.killFeed.length > prevKillCount) {
          prevKillCount = snap.killFeed.length;
          setKillFeed([...snap.killFeed]);
        }

        setSnapshot({ ...snap });

        if (snap.isFinished) {
          simulationStarted.current = false;
          handleBattleEnd(engine);
        }
      });
    };

    setup();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [participants, handleBattleEnd]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0f]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative text-8xl md:text-9xl font-black text-white"
            style={{
              textShadow: "0 0 60px rgba(255,255,255,0.5)",
              animation: "countdown-pulse 0.8s ease-out",
            }}
            key={String(countdown)}
          >
            {countdown}
          </div>
        </div>
      )}

      {snapshot && !countdown && (
        <>
          <PlayerCount alive={snapshot.aliveCount} total={snapshot.totalCount} />
          <KillFeed events={killFeed} />
        </>
      )}
      {showWinner && snapshot?.winner && (
        <WinnerScreen
          username={snapshot.winner.username}
          color={snapshot.winner.color}
          onNewBattle={() => window.location.href = "/admin"}
        />
      )}
    </div>
  );
}
