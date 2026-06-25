"use client";

import { useMemo } from "react";

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.8,
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
        color: ["#bd5c3a", "#b08a4f", "#3f6b53", "#f4e7df", "#1d1a16"][i % 5],
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: "-5vh",
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate}deg)`,
            animation: `fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
