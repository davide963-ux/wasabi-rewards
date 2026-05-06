'use client';

import { useEffect, useState } from 'react';

const PARTICLES = ['🧀', '🌶️', '🔥', '🟢', '💸', '🧀', '🌶️', '✨'];

interface Particle {
  id: number;
  emoji: string;
  left: string;
  delay: string;
  duration: string;
  size: string;
}

export function BackgroundFX() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Spawn 24 floating particles with random positions/timings
    const list: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      emoji: PARTICLES[i % PARTICLES.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 18}s`,
      duration: `${14 + Math.random() * 12}s`,
      size: `${20 + Math.random() * 24}px`,
    }));
    setParticles(list);
  }, []);

  return (
    <>
      <div className="bg-wash" aria-hidden="true" />
      <div className="bg-particles" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className="bg-particle"
            style={{
              left: p.left,
              top: '110%',
              animationDelay: p.delay,
              animationDuration: p.duration,
              fontSize: p.size,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </>
  );
}
