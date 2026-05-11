/**
 * Windows: set console code page to UTF-8 before starting tsx so Hebrew and
 * punctuation (em dash, emoji) print correctly in pino-pretty output.
 * Unix: spawn tsx directly (already UTF-8).
 */
import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function forwardExit(child) {
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

if (process.platform === "win32") {
  const child = spawn(process.env.ComSpec ?? "cmd.exe", [
    "/d",
    "/s",
    "/c",
    "chcp 65001 >nul && npx tsx watch src/index.ts",
  ], {
    cwd: pkgRoot,
    stdio: "inherit",
    env: process.env,
    windowsHide: false,
  });
  forwardExit(child);
} else {
  const child = spawn("npx", ["tsx", "watch", "src/index.ts"], {
    cwd: pkgRoot,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  forwardExit(child);
}
