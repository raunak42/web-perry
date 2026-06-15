"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lightThemeCast } from "@/lib/cast-theme.mjs";

type CastPlayerProps = {
  src: string;
  className?: string;
  title?: string;
  description?: string[];
  preloadSources?: string[];
  sourceStartTimes?: Record<string, number>;
};

type AsciinemaPlayerInstance = {
  dispose: () => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (position: number) => Promise<unknown>;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type CastTextResult = {
  text: string;
  preThemed: boolean;
};

function preThemedCastSrc(src: string) {
  return src.replace(/\.cast$/, ".light.cast.gz");
}

async function readGzipText(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;

  const contentEncoding = response.headers.get("content-encoding");
  if (contentEncoding?.includes("gzip")) {
    return response.text();
  }

  if (response.body && "DecompressionStream" in globalThis) {
    const decompressedStream = response.body.pipeThrough(
      new DecompressionStream("gzip"),
    );

    return new Response(decompressedStream).text();
  }

  return null;
}

async function loadCastText(src: string): Promise<CastTextResult> {
  try {
    const preThemedText = await readGzipText(preThemedCastSrc(src));
    if (preThemedText !== null) {
      return { text: preThemedText, preThemed: true };
    }
  } catch (error) {
    console.warn("Failed to read pre-themed cast; falling back", error);
  }

  try {
    const compressedText = await readGzipText(`${src}.gz`);
    if (compressedText !== null) {
      return { text: compressedText, preThemed: false };
    }
  } catch (error) {
    console.warn("Failed to read compressed cast; falling back", error);
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to fetch cast: ${src}`);
  }

  return { text: await response.text(), preThemed: false };
}

async function fetchCastText(src: string) {
  return loadCastText(src);
}

function playerOptions(startAt: number) {
  return {
    autoPlay: false,
    preload: true,
    loop: true,
    controls: false,
    fit: "width",
    cols: 80,
    rows: 30,
    speed: 2.5,
    idleTimeLimit: 0.9,
    startAt,
    theme: "perry-light",
    terminalFontFamily: "var(--font-geist-mono), monospace",
    terminalFontSize: "13px",
    terminalLineHeight: 1.2,
  };
}

function CastLayer({
  source,
  active,
  startAt,
  onMeasure,
}: {
  source: string;
  active: boolean;
  startAt: number;
  onMeasure: () => void;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<AsciinemaPlayerInstance | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;

    const player = playerRef.current;
    if (!player) return;

    if (active) {
      void player
        .seek(startAt)
        .then(() => player.play())
        .catch((error) => {
          console.warn(`Failed to start cast: ${source}`, error);
        });
    } else {
      void player
        .pause()
        .then(() => player.seek(startAt))
        .catch((error) => {
          console.warn(`Failed to pause cast: ${source}`, error);
        });
    }
  }, [active, source, startAt]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    let disposed = false;
    let player: AsciinemaPlayerInstance | null = null;

    const mount = async () => {
      const [{ create }, castResult] = await Promise.all([
        import("asciinema-player"),
        fetchCastText(source),
      ]);

      if (disposed || !layerRef.current) return;

      const castData = castResult.preThemed
        ? castResult.text
        : lightThemeCast(castResult.text);

      layerRef.current.innerHTML = "";
      player = create(
        { data: castData },
        layerRef.current,
        playerOptions(startAt),
      ) as AsciinemaPlayerInstance;
      playerRef.current = player;

      window.requestAnimationFrame(onMeasure);

      if (activeRef.current) {
        void player
          .seek(startAt)
          .then(() => player?.play())
          .catch((error) => {
            console.warn(`Failed to start cast: ${source}`, error);
          });
      } else {
        void player
          .pause()
          .then(() => player?.seek(startAt))
          .catch((error) => {
            console.warn(`Failed to pause cast: ${source}`, error);
          });
      }
    };

    mount().catch((error) => {
      console.error(`Failed to mount cast player: ${source}`, error);
    });

    return () => {
      disposed = true;
      playerRef.current = null;
      player?.dispose();
    };
  }, [onMeasure, source, startAt]);

  return (
    <div
      ref={layerRef}
      className="cast-player-layer"
      data-active={active ? "true" : "false"}
      aria-hidden={active ? undefined : "true"}
    />
  );
}

export default function CastPlayer({
  src,
  className,
  title = "perry — terminal",
  description,
  preloadSources,
  sourceStartTimes,
}: CastPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousSrcRef = useRef(src);
  const [swapPulse, setSwapPulse] = useState(0);
  const sources = useMemo(() => {
    return Array.from(new Set([...(preloadSources ?? []), src]));
  }, [preloadSources, src]);

  const lockContainerHeight = useCallback(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    const height = currentContainer.getBoundingClientRect().height;
    if (height > 0) {
      currentContainer.style.minHeight = `${Math.ceil(height)}px`;
    }
  }, []);

  useEffect(() => {
    if (previousSrcRef.current !== src) {
      previousSrcRef.current = src;
      setSwapPulse((current) => current + 1);
    }
  }, [src]);

  useEffect(() => {
    lockContainerHeight();
    const frame = window.requestAnimationFrame(lockContainerHeight);

    return () => window.cancelAnimationFrame(frame);
  }, [lockContainerHeight, src]);

  return (
    <div className={cn("cast-player-shell", className)}>
      <div className="cast-player-chrome" aria-hidden="true">
        <div className="cast-player-dots">
          <span className="cast-player-dot bg-rose-300" />
          <span className="cast-player-dot bg-amber-300" />
          <span className="cast-player-dot bg-emerald-300" />
        </div>
        <div className="cast-player-title">{title}</div>
      </div>
      <div ref={containerRef} className="cast-player-root h-full w-full">
        {sources.map((source) => (
          <CastLayer
            key={source}
            source={source}
            active={source === src}
            startAt={sourceStartTimes?.[source] ?? 0}
            onMeasure={lockContainerHeight}
          />
        ))}
        {swapPulse > 0 ? (
          <div key={swapPulse} className="cast-player-swap-veil" aria-hidden />
        ) : null}
      </div>

      {description?.length ? (
        <div className="cast-player-description">
          {description.slice(0, 2).map((line) => (
            <div key={line} className="cast-player-description-line">
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
