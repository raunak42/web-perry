"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type PixelRevealImageProps = {
  src: string;
  alt: string;
  columns?: number;
  rows?: number;
  maxDelayMs?: number;
  tileDurationMs?: number;
  initialVisibleFraction?: number;
  sizes?: string;
};

type TileDefinition = {
  id: number;
  startsVisible: boolean;
  transitionStyle: CSSProperties;
};

function hashString(value: string) {
  let hash = 1779033703 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return (hash >>> 0) || 1;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const COVER_TILE_COLOR = "#ffffff";

export default function PixelRevealImage({
  src,
  alt,
  columns = 20,
  rows = 20,
  maxDelayMs = 2400,
  tileDurationMs = 420,
  initialVisibleFraction = 0,
  sizes = "(max-width: 1023px) 24rem, 30rem",
}: PixelRevealImageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const gridStyle = useMemo<CSSProperties>(
    () => ({
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    }),
    [columns, rows],
  );

  const tiles = useMemo<TileDefinition[]>(() => {
    const random = mulberry32(hashString(`${src}:${columns}:${rows}`));
    const clampedInitialVisibleFraction = Math.min(
      Math.max(initialVisibleFraction, 0),
      1,
    );

    return Array.from({ length: columns * rows }, (_, index) => {
      const delayMs = Math.round(random() * maxDelayMs);
      const startsVisible = random() < clampedInitialVisibleFraction;

      return {
        id: index,
        startsVisible,
        transitionStyle: {
          transitionDelay: `${delayMs}ms`,
          transitionDuration: `${tileDurationMs}ms`,
        },
      };
    });
  }, [columns, initialVisibleFraction, maxDelayMs, rows, src, tileDurationMs]);

  const gridOverlayStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage:
        "linear-gradient(to right, rgba(255,255,255,0.36) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.36) 1px, transparent 1px)",
      backgroundSize: `${100 / columns}% ${100 / rows}%`,
    }),
    [columns, rows],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const node = wrapperRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setHasStarted(true);
        observer.disconnect();
      },
      {
        threshold: 0.32,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!hasStarted || prefersReducedMotion) return;

    const timeout = window.setTimeout(() => {
      setHasFinished(true);
    }, maxDelayMs + tileDurationMs + 160);

    return () => window.clearTimeout(timeout);
  }, [hasStarted, maxDelayMs, prefersReducedMotion, tileDurationMs]);

  return (
    <div ref={wrapperRef} className="relative aspect-square w-full overflow-hidden">
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />

      {!prefersReducedMotion && !hasFinished ? (
        <div aria-hidden="true" className="absolute inset-0 grid" style={gridStyle}>
          {tiles.map((tile) => {
            const isVisible = hasStarted || tile.startsVisible;

            return (
              <span key={tile.id} className="relative overflow-hidden">
                <span
                  className="absolute inset-0 transition-[opacity,transform] ease-out"
                  style={{
                    ...tile.transitionStyle,
                    backgroundColor: COVER_TILE_COLOR,
                    opacity: isVisible ? 0 : 1,
                    transform: isVisible ? "scale(0.72)" : "scale(1)",
                  }}
                />
              </span>
            );
          })}
        </div>
      ) : null}

      {!prefersReducedMotion ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={gridOverlayStyle}
        />
      ) : null}
    </div>
  );
}
