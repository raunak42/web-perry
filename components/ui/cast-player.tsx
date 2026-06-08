"use client";

import { useEffect, useRef } from "react";

type CastPlayerProps = {
  src: string;
  className?: string;
};

type AsciinemaPlayerInstance = {
  dispose: () => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function lightThemeCast(data: string) {
  return data
    .replaceAll("\\u001b[48;2;52;53;65m", "\\u001b[48;2;241;245;249m")
    .replaceAll("\\u001b[7m", "\\u001b[48;2;203;213;225m\\u001b[38;2;15;23;42m")
    .replaceAll("\\u001b[38;2;178;148;187m", "\\u001b[38;2;100;116;139m")
    .replaceAll("\\u001b[38;2;138;190;183m", "\\u001b[38;2;5;150;105m")
    .replaceAll("\\u001b[38;2;102;102;102m", "\\u001b[38;2;71;85;105m")
    .replaceAll("\\u001b[38;2;128;128;128m", "\\u001b[38;2;100;116;139m")
    .replaceAll("\\u001b[38;2;255;255;0m", "\\u001b[38;2;180;83;9m")
    .replaceAll("\\u001b[38;2;240;198;116m", "\\u001b[38;2;180;83;9m");
}

export default function CastPlayer({ src, className }: CastPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let player: AsciinemaPlayerInstance | null = null;

    const mount = async () => {
      const [{ create }, response] = await Promise.all([
        import("asciinema-player"),
        fetch(src),
      ]);

      if (disposed || !containerRef.current) return;

      const rawCast = await response.text();
      if (disposed || !containerRef.current) return;

      containerRef.current.innerHTML = "";

      player = create(
        { data: lightThemeCast(rawCast) },
        containerRef.current,
        {
          autoPlay: true,
          preload: true,
          loop: true,
          controls: false,
          fit: "width",
          cols: 80,
          rows: 30,
          speed: 1,
          idleTimeLimit: 0.9,
          theme: "perry-light",
          terminalFontFamily: "var(--font-geist-mono), monospace",
          terminalFontSize: "13px",
        },
      ) as AsciinemaPlayerInstance;
    };

    mount().catch((error) => {
      console.error("Failed to mount cast player", error);
    });

    return () => {
      disposed = true;
      player?.dispose();
    };
  }, [src]);

  return (
    <div className={cn("cast-player-shell", className)}>
      <div className="cast-player-chrome" aria-hidden="true">
        <div className="cast-player-dots">
          <span className="cast-player-dot bg-rose-300" />
          <span className="cast-player-dot bg-amber-300" />
          <span className="cast-player-dot bg-emerald-300" />
        </div>
        <div className="cast-player-title">perry — terminal</div>
      </div>
      <div ref={containerRef} className="cast-player-root h-full w-full" />
    </div>
  );
}
