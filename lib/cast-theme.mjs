function isBlockArtChar(char) {
  return char === "▀" || char === "▄" || char === "█";
}

function liftExteriorBlackBlockPixels(data) {
  const rawLines = data.split("\n");
  if (rawLines.length <= 1) {
    return data;
  }

  const header = rawLines[0];
  const eventLines = rawLines.slice(1).filter(Boolean);
  const events = eventLines.map((line) => JSON.parse(line));
  const outputEventIndexes = [];
  const outputChunks = [];

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

  const sliceToParts = (start, end) => {
    const parts = [];
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

  const parsedLines = [];
  let currentLine = {
    cells: [],
    suffix: [],
    breakParts: [],
  };
  let pending = [];
  let foreground = null;
  let background = null;
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

  const outputLines = parsedLines.map((parsedLine) => ({
    parsedLine,
    blockCount: parsedLine.cells.filter((cell) => isBlockArtChar(cell.char)).length,
  }));

  const clusters = [];
  let currentCluster = [];

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
  const darkBackgrounds = new Set([
    "0;0;0",
    "32;49;38",
    "23;20;39",
    "23;19;38",
    "31;26;16",
    "31;31;31",
    "26;28;32",
  ]);
  const blockArtLines = new Set();

  for (const cluster of clusters) {
    cluster.forEach((line) => blockArtLines.add(line.parsedLine));

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
      Array(width).fill(null),
    );
    const pixelRefs = Array.from({ length: height }, () =>
      Array(width).fill(null),
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
    const queue = [];
    let queueIndex = 0;

    const visit = (x, y) => {
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

    const overrides = new Map();

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

  for (const line of parsedLines) {
    if (blockArtLines.has(line)) {
      continue;
    }

    for (const cell of line.cells) {
      if (cell.background && darkBackgrounds.has(cell.background)) {
        cell.prefix.push({
          text: `\u001b[48;2;${light}m`,
          eventIndex: cell.charEventIndex,
        });
        cell.background = light;
      }
    }
  }

  const rebuiltOutput = new Map(
    outputEventIndexes.map((eventIndex) => [eventIndex, []]),
  );

  const pushParts = (parts) => {
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

function normalizeDarkPanelColors(data) {
  return data
    .replaceAll("[48;2;32;49;38m", "[48;2;247;251;255m")
    .replaceAll(";48;2;32;49;38m", ";48;2;247;251;255m")
    .replaceAll("[48;2;23;20;39m", "[48;2;247;251;255m")
    .replaceAll(";48;2;23;20;39m", ";48;2;247;251;255m")
    .replaceAll("[48;2;23;19;38m", "[48;2;247;251;255m")
    .replaceAll(";48;2;23;19;38m", ";48;2;247;251;255m")
    .replaceAll("[48;2;31;26;16m", "[48;2;247;251;255m")
    .replaceAll(";48;2;31;26;16m", ";48;2;247;251;255m")
    .replaceAll("[48;2;31;31;31m", "[48;2;247;251;255m")
    .replaceAll(";48;2;31;31;31m", ";48;2;247;251;255m")
    .replaceAll("[48;2;26;28;32m", "[48;2;247;251;255m")
    .replaceAll(";48;2;26;28;32m", ";48;2;247;251;255m");
}

export function lightThemeCast(data) {
  return liftExteriorBlackBlockPixels(normalizeDarkPanelColors(data))
    .replaceAll(
      "\\u001b[38;2;229;231;235;48;2;26;28;32m",
      "\\u001b[38;2;78;93;112;48;2;233;240;247m",
    )
    .replaceAll("\\u001b[48;2;52;53;65m", "\\u001b[48;2;244;248;252m")
    .replaceAll("[48;2;32;49;38m", "[48;2;247;251;255m")
    .replaceAll(";48;2;32;49;38m", ";48;2;247;251;255m")
    .replaceAll("[48;2;23;20;39m", "[48;2;247;251;255m")
    .replaceAll(";48;2;23;20;39m", ";48;2;247;251;255m")
    .replaceAll("[48;2;23;19;38m", "[48;2;247;251;255m")
    .replaceAll(";48;2;23;19;38m", ";48;2;247;251;255m")
    .replaceAll("[48;2;31;26;16m", "[48;2;247;251;255m")
    .replaceAll(";48;2;31;26;16m", ";48;2;247;251;255m")
    .replaceAll("[48;2;31;31;31m", "[48;2;247;251;255m")
    .replaceAll(";48;2;31;31;31m", ";48;2;247;251;255m")
    .replaceAll("[48;2;26;28;32m", "[48;2;247;251;255m")
    .replaceAll(";48;2;26;28;32m", ";48;2;247;251;255m")
    .replaceAll(
      "\\u001b[38;2;230;242;232;48;2;32;49;38m",
      "\\u001b[38;2;91;111;96;48;2;247;251;255m",
    )
    .replaceAll(
      "\\u001b[38;2;230;242;232;48;2;42;23;23m",
      "\\u001b[38;2;91;111;96;48;2;247;251;255m",
    )
    .replaceAll(
      "\\u001b[38;2;195;217;119;48;2;32;49;38m",
      "\\u001b[38;2;112;128;55;48;2;247;251;255m",
    )
    .replaceAll(
      "\\u001b[38;2;248;113;113;48;2;32;49;38m",
      "\\u001b[38;2;188;65;65;48;2;247;251;255m",
    )
    .replaceAll(
      "\\u001b[38;2;252;165;165;48;2;42;23;23m",
      "\\u001b[38;2;178;70;70;48;2;247;251;255m",
    )
    .replaceAll(
      "\\u001b[38;2;167;173;180;48;2;32;49;38m",
      "\\u001b[38;2;95;108;126;48;2;247;251;255m",
    )
    .replaceAll(
      "\\u001b[2;38;2;143;150;157;48;2;32;49;38m",
      "\\u001b[2;38;2;95;106;120;48;2;247;251;255m",
    )
    .replaceAll(
      "\\u001b[38;2;143;150;157;48;2;32;49;38m",
      "\\u001b[38;2;95;106;120;48;2;247;251;255m",
    )
    .replaceAll("\\u001b[7m", "\\u001b[48;2;215;225;236m\\u001b[38;2;52;68;88m")
    .replaceAll("\\u001b[38;2;255;255;255m", "\\u001b[38;2;52;68;88m")
    .replaceAll("\\u001b[38;2;217;251;248m", "\\u001b[38;2;112;166;174m")
    .replaceAll("\\u001b[38;2;72;209;204m", "\\u001b[38;2;70;163;169m")
    .replaceAll("\\u001b[38;2;178;148;187m", "\\u001b[38;2;100;116;139m")
    .replaceAll("\\u001b[38;2;138;190;183m", "\\u001b[38;2;37;121;105m")
    .replaceAll("38;2;230;242;232", "38;2;91;111;96")
    .replaceAll("38;2;228;221;255", "38;2;104;88;176")
    .replaceAll("38;2;197;180;255", "38;2;112;91;190")
    .replaceAll("38;2;238;233;255", "38;2;108;96;176")
    .replaceAll("38;2;255;247;214", "38;2;132;105;50")
    .replaceAll("38;2;253;230;138", "38;2;166;122;38")
    .replaceAll("38;2;195;217;119", "38;2;112;128;55")
    .replaceAll("38;2;248;113;113", "38;2;188;65;65")
    .replaceAll("38;2;252;165;165", "38;2;178;70;70")
    .replaceAll("38;2;167;173;180", "38;2;95;108;126")
    .replaceAll("38;2;143;150;157", "38;2;95;106;120")
    .replaceAll("38;2;196;181;253", "38;2;111;91;190")
    .replaceAll("38;2;255;255;255", "38;2;66;82;102")
    .replaceAll("38;2;229;231;235", "38;2;78;93;112")
    .replaceAll("\\u001b[1;38;2;245;245;245m", "\\u001b[1;38;2;66;82;102m")
    .replaceAll("\\u001b[38;2;245;245;245m", "\\u001b[38;2;70;84;100m")
    .replaceAll("\\u001b[38;2;147;197;253m", "\\u001b[38;2;69;128;205m")
    .replaceAll("\\u001b[1;38;2;147;197;253m", "\\u001b[1;38;2;59;115;194m")
    .replaceAll("\\u001b[4;38;2;147;197;253m", "\\u001b[4;38;2;59;115;194m")
    .replaceAll("\\u001b[38;2;134;239;172m", "\\u001b[38;2;46;130;85m")
    .replaceAll("\\u001b[1;38;2;196;181;253m", "\\u001b[1;38;2;111;91;190m")
    .replaceAll("\\u001b[38;2;143;202;195m", "\\u001b[38;2;49;126;120m")
    .replaceAll("\\u001b[38;2;251;191;36m", "\\u001b[38;2;174;116;28m")
    .replaceAll("\\u001b[38;2;245;245;0m", "\\u001b[38;2;159;126;21m")
    .replaceAll("\\u001b[38;2;212;212;212m", "\\u001b[38;2;93;105;121m")
    .replaceAll("\\u001b[38;2;103;232;249m", "\\u001b[38;2;27;130;150m")
    .replaceAll("\\u001b[2;38;2;159;184;220m", "\\u001b[2;38;2;93;115;148m")
    .replaceAll("\\u001b[2;38;2;143;150;157m", "\\u001b[2;38;2;95;106;120m")
    .replaceAll("\\u001b[38;2;143;150;157m", "\\u001b[38;2;95;106;120m")
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
