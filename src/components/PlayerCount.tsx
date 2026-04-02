"use client";

export default function PlayerCount({ alive, total }: { alive: number; total: number }) {
  return (
    <div className="absolute top-4 left-4 z-10 pointer-events-none">
      <div className="bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm font-mono">
        <span className="text-2xl font-bold">{alive}</span>
        <span className="text-gray-400 text-lg"> / {total}</span>
        <span className="text-gray-500 text-sm ml-2">alive</span>
      </div>
    </div>
  );
}
