"use client";

import { useEffect, useRef } from "react";

type CastPlayerProps = {
  src: string;
  className?: string;
  title?: string;
  description?: string[];
};

type AsciinemaPlayerInstance = {
  dispose: () => void;
};

type CastEvent = [number, string, string?];

type TextPart = {
  text: string;
  eventIndex: number;
};

type ParsedAnsiCell = {
  prefix: TextPart[];
  char: string;
  charEventIndex: number;
  foreground: string | null;
  background: string | null;
};

type ParsedAnsiLine = {
  cells: ParsedAnsiCell[];
  suffix: TextPart[];
  breakParts: TextPart[];
};

type OutputLineRef = {
  parsedLine: ParsedAnsiLine;
  blockCount: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isBlockArtChar(char: string) {
  return char === "▀" || char === "▄" || char === "█";
}

function liftExteriorBlackBlockPixels(data: string) {
  const rawLines = data.split("\n");
  if (rawLines.length <= 1) {
    return data;
  }

  const header = rawLines[0];
  const eventLines = rawLines.slice(1).filter(Boolean);
  const events = eventLines.map((line) => JSON.parse(line) as CastEvent);
  const outputEventIndexes: number[] = [];
  const outputChunks: string[] = [];

  events.forEach((event, eventIndex) => {
    if (event[1] !== "o" || typeof event[2] !== "string") {
      return;
    }

    outputEventIndexes.push(eventIndex);
    outputChunks.push(event[2]);
  });

  if (outputChunks.length === 0) {
    return data;
  }

  const stream = outputChunks.join("");
  const eventAtPosition = new Int32Array(stream.length);
  let streamOffset = 0;

  outputChunks.forEach((chunk, chunkIndex) => {
    eventAtPosition.fill(
      outputEventIndexes[chunkIndex],
      streamOffset,
      streamOffset + chunk.length,
    );
    streamOffset += chunk.length;
  });

  const sliceToParts = (start: number, end: number) => {
    const parts: TextPart[] = [];
    let index = start;

    while (index < end) {
      const eventIndex = eventAtPosition[index];
      let next = index + 1;

      while (next < end && eventAtPosition[next] === eventIndex) {
        next += 1;
      }

      parts.push({
        text: stream.slice(index, next),
        eventIndex,
      });
      index = next;
    }

    return parts;
  };

  const parsedLines: ParsedAnsiLine[] = [];
  let currentLine: ParsedAnsiLine = {
    cells: [],
    suffix: [],
    breakParts: [],
  };
  let pending: TextPart[] = [];
  let foreground: string | null = null;
  let background: string | null = null;
  let index = 0;

  while (index < stream.length) {
    if (stream[index] === "\r" && stream[index + 1] === "\n") {
      currentLine.suffix = pending;
      currentLine.breakParts = sliceToParts(index, index + 2);
      parsedLines.push(currentLine);
      currentLine = {
        cells: [],
        suffix: [],
        breakParts: [],
      };
      pending = [];
      index += 2;
      continue;
    }

    if (stream[index] === "\u001b" && stream[index + 1] === "[") {
      let end = index + 2;

      while (end < stream.length && !/[A-Za-z]/.test(stream[end])) {
        end += 1;
      }

      if (end >= stream.length) {
        pending = [...pending, ...sliceToParts(index, stream.length)];
        index = stream.length;
        break;
      }

      pending = [...pending, ...sliceToParts(index, end + 1)];

      if (stream[end] === "m") {
        const params = stream
          .slice(index + 2, end)
          .split(";")
          .filter(Boolean)
          .map(Number);

        if (params.length === 0) {
          foreground = null;
          background = null;
        }

        for (let paramIndex = 0; paramIndex < params.length; paramIndex += 1) {
          const param = params[paramIndex];

          if (param === 0) {
            foreground = null;
            background = null;
          } else if (param === 39) {
            foreground = null;
          } else if (param === 49) {
            background = null;
          } else if (param === 38 && params[paramIndex + 1] === 2) {
            foreground = `${params[paramIndex + 2]};${params[paramIndex + 3]};${params[paramIndex + 4]}`;
            paramIndex += 4;
          } else if (param === 48 && params[paramIndex + 1] === 2) {
            background = `${params[paramIndex + 2]};${params[paramIndex + 3]};${params[paramIndex + 4]}`;
            paramIndex += 4;
          }
        }
      }

      index = end + 1;
      continue;
    }

    currentLine.cells.push({
      prefix: pending,
      char: stream[index],
      charEventIndex: eventAtPosition[index],
      foreground,
      background,
    });
    pending = [];
    index += 1;
  }

  currentLine.suffix = pending;
  parsedLines.push(currentLine);

  const outputLines: OutputLineRef[] = parsedLines.map((parsedLine) => ({
    parsedLine,
    blockCount: parsedLine.cells.filter((cell) => isBlockArtChar(cell.char)).length,
  }));

  const clusters: OutputLineRef[][] = [];
  let currentCluster: OutputLineRef[] = [];

  for (const line of outputLines) {
    if (line.blockCount >= 20) {
      currentCluster.push(line);
      continue;
    }

    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
      currentCluster = [];
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const light = "247;251;255";

  for (const cluster of clusters) {
    const backgroundColumns = cluster.flatMap((line) =>
      line.parsedLine.cells.flatMap((cell, columnIndex) =>
        cell.background !== null || isBlockArtChar(cell.char) ? [columnIndex] : [],
      ),
    );

    if (backgroundColumns.length === 0) {
      continue;
    }

    const left = Math.min(...backgroundColumns);
    const right = Math.max(...backgroundColumns);
    const width = right - left + 1;
    const height = cluster.length * 2;
    const pixelColors = Array.from({ length: height }, () =>
      Array<string | null>(width).fill(null),
    );
    const pixelRefs = Array.from({ length: height }, () =>
      Array<{ cell: ParsedAnsiCell; part: "foreground" | "background" } | null>(width).fill(
        null,
      ),
    );

    cluster.forEach((line, lineIndex) => {
      for (let column = left; column <= right; column += 1) {
        const cell = line.parsedLine.cells[column];
        if (!cell) {
          continue;
        }

        const x = column - left;
        const top = lineIndex * 2;
        const bottom = top + 1;

        if (cell.char === "▀") {
          pixelColors[top][x] = cell.foreground;
          pixelRefs[top][x] = { cell, part: "foreground" };
          pixelColors[bottom][x] = cell.background;
          pixelRefs[bottom][x] = { cell, part: "background" };
        } else if (cell.char === "▄") {
          pixelColors[top][x] = cell.background;
          pixelRefs[top][x] = { cell, part: "background" };
          pixelColors[bottom][x] = cell.foreground;
          pixelRefs[bottom][x] = { cell, part: "foreground" };
        } else if (cell.char === "█") {
          pixelColors[top][x] = cell.foreground;
          pixelColors[bottom][x] = cell.foreground;
          pixelRefs[top][x] = { cell, part: "foreground" };
          pixelRefs[bottom][x] = { cell, part: "foreground" };
        } else {
          pixelColors[top][x] = cell.background;
          pixelColors[bottom][x] = cell.background;
          if (cell.background !== null) {
            pixelRefs[top][x] = { cell, part: "background" };
            pixelRefs[bottom][x] = { cell, part: "background" };
          }
        }
      }
    });

    const exteriorBlack = Array.from({ length: height }, () => Array(width).fill(false));
    const queue: Array<[number, number]> = [];
    let queueIndex = 0;

    const visit = (x: number, y: number) => {
      if (
        x < 0 ||
        x >= width ||
        y < 0 ||
        y >= height ||
        exteriorBlack[y][x] ||
        pixelColors[y][x] !== "0;0;0"
      ) {
        return;
      }

      exteriorBlack[y][x] = true;
      queue.push([x, y]);
    };

    for (let x = 0; x < width; x += 1) {
      visit(x, 0);
      visit(x, height - 1);
    }

    for (let y = 0; y < height; y += 1) {
      visit(0, y);
      visit(width - 1, y);
    }

    while (queueIndex < queue.length) {
      const [x, y] = queue[queueIndex];
      queueIndex += 1;
      visit(x + 1, y);
      visit(x - 1, y);
      visit(x, y + 1);
      visit(x, y - 1);
    }

    const overrides = new Map<ParsedAnsiCell, { foreground?: true; background?: true }>();

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!exteriorBlack[y][x]) {
          continue;
        }

        const ref = pixelRefs[y][x];
        if (!ref) {
          continue;
        }

        const existing = overrides.get(ref.cell) ?? {};
        existing[ref.part] = true;
        overrides.set(ref.cell, existing);
      }
    }

    for (const [cell, override] of overrides) {
      if (override.foreground && cell.foreground === "0;0;0") {
        cell.prefix.push({
          text: `\u001b[38;2;${light}m`,
          eventIndex: cell.charEventIndex,
        });
        cell.foreground = light;
      }

      if (override.background && cell.background === "0;0;0") {
        cell.prefix.push({
          text: `\u001b[48;2;${light}m`,
          eventIndex: cell.charEventIndex,
        });
        cell.background = light;
      }
    }
  }

  const rebuiltOutput = new Map<number, string[]>(
    outputEventIndexes.map((eventIndex) => [eventIndex, []]),
  );

  const pushParts = (parts: TextPart[]) => {
    for (const part of parts) {
      rebuiltOutput.get(part.eventIndex)?.push(part.text);
    }
  };

  for (const line of parsedLines) {
    for (const cell of line.cells) {
      pushParts(cell.prefix);
      rebuiltOutput.get(cell.charEventIndex)?.push(cell.char);
    }

    pushParts(line.suffix);
    pushParts(line.breakParts);
  }

  outputEventIndexes.forEach((eventIndex) => {
    events[eventIndex][2] = rebuiltOutput.get(eventIndex)?.join("") ?? "";
  });

  return [header, ...events.map((event) => JSON.stringify(event))].join("\n");
}

function lightThemeCast(data: string) {
  return liftExteriorBlackBlockPixels(data)
    .replaceAll(
      "\\u001b[38;2;229;231;235;48;2;26;28;32m",
      "\\u001b[38;2;78;93;112;48;2;233;240;247m",
    )
    .replaceAll("\\u001b[48;2;52;53;65m", "\\u001b[48;2;244;248;252m")
    .replaceAll("\\u001b[7m", "\\u001b[48;2;215;225;236m\\u001b[38;2;52;68;88m")
    .replaceAll("\\u001b[38;2;255;255;255m", "\\u001b[38;2;52;68;88m")
    .replaceAll("\\u001b[38;2;217;251;248m", "\\u001b[38;2;112;166;174m")
    .replaceAll("\\u001b[38;2;72;209;204m", "\\u001b[38;2;70;163;169m")
    .replaceAll("\\u001b[38;2;178;148;187m", "\\u001b[38;2;100;116;139m")
    .replaceAll("\\u001b[38;2;138;190;183m", "\\u001b[38;2;37;121;105m")
    .replaceAll("\\u001b[2;3;38;2;164;173;184m", "\\u001b[2;3;38;2;108;120;138m")
    .replaceAll("\\u001b[1;3;38;2;164;173;184m", "\\u001b[1;3;38;2;108;120;138m")
    .replaceAll("\\u001b[2;38;2;163;163;163m", "\\u001b[2;38;2;112;123;136m")
    .replaceAll("\\u001b[2;38;2;123;128;136m", "\\u001b[2;38;2;86;97;112m")
    .replaceAll("\\u001b[2;38;2;107;114;128m", "\\u001b[2;38;2;78;90;106m")
    .replaceAll("\\u001b[1;38;2;148;163;184m", "\\u001b[1;38;2;101;114;134m")
    .replaceAll("\\u001b[38;2;102;102;102m", "\\u001b[38;2;76;88;106m")
    .replaceAll("\\u001b[38;2;128;128;128m", "\\u001b[38;2;100;111;128m")
    .replaceAll("\\u001b[38;2;255;255;0m", "\\u001b[38;2;184;127;41m")
    .replaceAll("\\u001b[38;2;240;198;116m", "\\u001b[38;2;184;127;41m");
}

export default function CastPlayer({
  src,
  className,
  title = "perry — terminal",
  description,
}: CastPlayerProps) {
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
          speed: 2.5,
          idleTimeLimit: 0.9,
          theme: "perry-light",
          terminalFontFamily: "var(--font-geist-mono), monospace",
          terminalFontSize: "13px",
          terminalLineHeight: 1.2,
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
        <div className="cast-player-title">{title}</div>
      </div>
      <div ref={containerRef} className="cast-player-root h-full w-full" />

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
