"use client";

import { useState, useEffect } from "react";

export default function WinnerScreen({
  username,
  color,
  onComplete,
}: {
  username: string;
  color: string;
  onComplete?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 200);
    const t2 = setTimeout(() => setShowConfetti(true), 600);
    const t3 = setTimeout(() => onComplete?.(), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-1000"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        className="relative flex flex-col items-center gap-4 transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.5)",
        }}
      >
        <div className="text-xl font-mono tracking-[0.3em] text-yellow-400/80 uppercase">
          Follower Royale Champion
        </div>
        <div className="text-2xl mb-2">&#128081;</div>
        <div
          className="text-6xl md:text-8xl font-black tracking-tight"
          style={{
            color,
            textShadow: `0 0 40px ${color}80, 0 0 80px ${color}40`,
          }}
        >
          {username}
        </div>
        <div className="text-lg text-gray-400 font-mono mt-2">Last one standing</div>
      </div>

      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
                animation: `confetti-fall ${2 + Math.random() * 3}s linear ${Math.random() * 0.5}s forwards`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
