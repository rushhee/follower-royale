"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Follower, BattleSavePayload } from "@/types";
import type { SimulationEngine } from "@/lib/simulation";

const Arena = dynamic(() => import("@/components/Arena"), { ssr: false });

export default function BattlePage() {
  const [participants, setParticipants] = useState<Follower[] | null>(null);
  const [battleStarted, setBattleStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("battleParticipants");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Follower[];
        setParticipants(parsed);
        setBattleStarted(true);
      } catch {
        console.error("Failed to parse battle participants");
      }
    }
  }, []);

  const handleBattleEnd = async (
    results: ReturnType<SimulationEngine["getResults"]>,
    winnerId: number,
    duration: number
  ) => {
    if (saved || !participants) return;
    setSaved(true);

    const payload: BattleSavePayload = {
      participantIds: participants.map((p) => p.id),
      winnerId,
      durationSeconds: Math.round(duration * 10) / 10,
      results,
    };

    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("Battle saved:", data.battleId);
      sessionStorage.removeItem("battleParticipants");
    } catch (err) {
      console.error("Failed to save battle:", err);
    }
  };

  if (!battleStarted || !participants) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f] text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">No Battle Loaded</h1>
          <p className="text-gray-400 mb-6">Start a battle from the admin panel.</p>
          <a href="/admin" className="text-blue-400 hover:underline">Go to Admin</a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <Arena participants={participants} onBattleEnd={handleBattleEnd} />
    </div>
  );
}
