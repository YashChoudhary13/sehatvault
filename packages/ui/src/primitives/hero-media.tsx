"use client";

import { useEffect, useRef, useState } from "react";
import { shouldPlayMedia } from "./should-play-media";

interface HeroMediaProps {
  poster: string;
  src: string;       // mp4
  srcWebm?: string;  // optional webm (preferred)
  className?: string;
  alt: string;
}

export function HeroMedia({ poster, src, srcWebm, className, alt }: HeroMediaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // navigator.connection is non-standard; read defensively.
    const conn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    if (!shouldPlayMedia({ reducedMotion: reduced, effectiveType: conn?.effectiveType, saveData: conn?.saveData })) {
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setPlay(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {play ? (
        <video autoPlay muted loop playsInline poster={poster} aria-label={alt} className="h-full w-full object-cover">
          {srcWebm ? <source src={srcWebm} type="video/webm" /> : null}
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <img src={poster} alt={alt} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
