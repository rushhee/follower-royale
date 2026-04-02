"use client";

import type { KillEvent } from "@/types";

export default function KillFeed({ events }: { events: KillEvent[] }) {
  const recent = events.slice(-5).reverse();

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-1 z-10 pointer-events-none">
      {recent.map((event, i) => (
        <div
          key={`${event.victimId}-${event.timestamp}`}
          className="text-sm font-mono bg-black/70 text-white px-3 py-1 rounded-lg backdrop-blur-sm whitespace-nowrap"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <span className="text-red-400 font-bold">{event.killerName}</span>
          <span className="text-gray-400 mx-2">eliminated</span>
          <span className="text-gray-300">{event.victimName}</span>
        </div>
      ))}
    </div>
  );
}
