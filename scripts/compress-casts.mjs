import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { lightThemeCast } from "../lib/cast-theme.mjs";

const publicDir = join(process.cwd(), "public");
const files = readdirSync(publicDir);
const castFiles = Array.from(
  new Set(
    files
      .flatMap((file) => {
        if (file.endsWith(".light.cast.gz")) return [];
        if (file.endsWith(".cast")) return [file];
        if (file.endsWith(".cast.gz")) return [file.replace(/\.gz$/, "")];
        return [];
      })
      .sort(),
  ),
);

function readCastSource(castFile) {
  const rawPath = join(publicDir, castFile);
  const gzipPath = `${rawPath}.gz`;

  if (existsSync(rawPath)) {
    return {
      raw: readFileSync(rawPath),
      sourceLabel: castFile,
    };
  }

  if (existsSync(gzipPath)) {
    return {
      raw: gunzipSync(readFileSync(gzipPath)),
      sourceLabel: `${castFile}.gz`,
    };
  }

  throw new Error(`Missing cast source for ${castFile}`);
}

function writeCompressed(label, source, outputPath) {
  const compressed = gzipSync(source, { level: 9 });
  writeFileSync(outputPath, compressed);

  const ratio = ((1 - compressed.length / source.length) * 100).toFixed(1);
  console.log(
    `${label}: ${source.length.toLocaleString()} bytes -> ${compressed.length.toLocaleString()} bytes (${ratio}% smaller)`,
  );

  return compressed.length;
}

for (const file of castFiles) {
  const sourcePath = join(publicDir, file);
  const { raw, sourceLabel } = readCastSource(file);
  const rawOutputPath = `${sourcePath}.gz`;
  const themedOutputPath = sourcePath.replace(/\.cast$/, ".light.cast.gz");

  const rawSize = writeCompressed(file, raw, rawOutputPath);

  const themed = Buffer.from(lightThemeCast(raw.toString("utf8")));
  const themedSize = writeCompressed(
    file.replace(/\.cast$/, ".light.cast"),
    themed,
    themedOutputPath,
  );

  console.log(
    `  wrote ${rawSize.toLocaleString()} byte raw gzip and ${themedSize.toLocaleString()} byte pre-themed gzip from ${raw.length.toLocaleString()} byte source (${sourceLabel})`,
  );
}
