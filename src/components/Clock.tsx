'use client';

import { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return <div className="h-[80px]" />;

  return (
    <div className="flex flex-col">
      <span className="text-7xl font-bold tracking-tighter text-foreground tabular-nums leading-none">
        {time.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <span className="text-accent/60 text-sm font-medium tracking-[0.2em] uppercase mt-2">
        {time.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
      </span>
    </div>
  );
}
