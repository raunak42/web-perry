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
  imageStyle: CSSProperties;
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

const FINAL_TILE_SCALE = 0.97;

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
    const backgroundSize = `${columns * 100}% ${rows * 100}%`;
    const clampedInitialVisibleFraction = Math.min(
      Math.max(initialVisibleFraction, 0),
      1,
    );

    return Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const xPercent = columns === 1 ? 0 : (column / (columns - 1)) * 100;
      const yPercent = rows === 1 ? 0 : (row / (rows - 1)) * 100;
      const delayMs = Math.round(random() * maxDelayMs);
      const startsVisible = random() < clampedInitialVisibleFraction;

      return {
        id: index,
        startsVisible,
        imageStyle: {
          backgroundImage: `url(${src})`,
          backgroundRepeat: "no-repeat",
          backgroundSize,
          backgroundPosition: `${xPercent}% ${yPercent}%`,
          transitionDelay: `${delayMs}ms`,
          transitionDuration: `${tileDurationMs}ms`,
        },
      };
    });
  }, [columns, initialVisibleFraction, maxDelayMs, rows, src, tileDurationMs]);

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

  return (
    <div
      ref={wrapperRef}
      className="relative aspect-square w-full"
      role="img"
      aria-label={alt}
    >
      {prefersReducedMotion ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 grid" style={gridStyle}>
          {tiles.map((tile) => {
            const isVisible = hasStarted || tile.startsVisible;

            return (
              <span key={tile.id} className="relative overflow-hidden">
                <span
                  className="absolute inset-0 bg-no-repeat transition-[opacity,transform] ease-out"
                  style={{
                    ...tile.imageStyle,
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible
                      ? `scale(${FINAL_TILE_SCALE})`
                      : "scale(0.72)",
                  }}
                />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
