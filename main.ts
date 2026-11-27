// DealScope — Black Friday deal finder, hand-in program.
//
// Node 22, standard library only. The site is plain static files under
// app/ (ES modules + CSS, no build step, nothing loaded over the network).
// This program copies app/ and screenshots/ next to this file into the
// output directory and writes output/dossier.json with the vendored
// make.fun dossier library, exactly as the gate rebuilds it.
// vendor/makefun-frontend.ts is the kit's copy and is left unchanged.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const dossierOptions = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });
  const shotsOut = join(outputDir, "screenshots");
  mkdirSync(shotsOut, { recursive: true });
  const shotsIn = join(repoRoot, "screenshots");
  if (existsSync(shotsIn)) {
    cpSync(shotsIn, shotsOut, { recursive: true });
  }
  const dossier = buildDossier(outputDir, dossierOptions);
  writeFileSync(join(outputDir, "dossier.json"), dossier);
}

handIn();
