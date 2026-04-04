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
          if (!url) return; // Skip if no avatar URL stored
          const texture = await Assets.load({ src: url, loadParser: 'loadTextures' });
          avatarTextures.set(char.id, texture);
        } catch {
          // Will fall back to colored circle
        }
      });
      await Promise.allSettled(loadPromises);

      const sprites = new Map<number, { container: Container; circle: Graphics | null; label: Text }>();
      for (const char of engine.characters) {
        const charContainer = new Container();

        const avatarTexture = avatarTextures.get(char.id);
        let circle: Graphics | null = null;
        if (avatarTexture) {
          // Create circular avatar sprite
          const avatar = new Sprite(avatarTexture);
          avatar.width = CHARACTER_RADIUS * 2;
          avatar.height = CHARACTER_RADIUS * 2;
          avatar.anchor.set(0.5);

          // Circle mask
          const mask = new Graphics();
          mask.circle(0, 0, CHARACTER_RADIUS);
          mask.fill(0xffffff);
          charContainer.addChild(mask);
          avatar.mask = mask;
          charContainer.addChild(avatar);
        } else {
          // Fallback: colored circle
          circle = new Graphics();
          circle.circle(0, 0, CHARACTER_RADIUS);
          circle.fill(char.color);
          circle.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
          charContainer.addChild(circle);
        }

        const label = new Text({ text: char.username, style: LABEL_STYLE });
        label.anchor.set(0.5, 0);
        label.y = CHARACTER_RADIUS + 4;
        charContainer.addChild(label);

        charContainer.x = char.x;
        charContainer.y = char.y;
        world.addChild(charContainer);
        sprites.set(char.id, { container: charContainer, circle, label });
      }

      let prevKillCount = 0;

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

        // Update zone visual
        zoneGraphics.clear();
        zoneGraphics.circle(snap.zoneCenterX, snap.zoneCenterY, snap.zoneRadius);
        zoneGraphics.stroke({ width: 3, color: 0xff3333, alpha: 0.5 });
        zoneGraphics.circle(snap.zoneCenterX, snap.zoneCenterY, snap.zoneRadius + 2000);
        zoneGraphics.circle(snap.zoneCenterX, snap.zoneCenterY, snap.zoneRadius);
        zoneGraphics.fill({ color: 0xff0000, alpha: 0.08 });

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

        // Update kill feed
        if (snap.killFeed.length > prevKillCount) {
          prevKillCount = snap.killFeed.length;
          setKillFeed([...snap.killFeed]);
        }

        setSnapshot({ ...snap });

        if (snap.isFinished) {
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
