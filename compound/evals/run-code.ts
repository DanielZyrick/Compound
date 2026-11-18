import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import type { BlockRun, RunnableBlock } from "../lib/lessons/evals";

// Runs one code example the AI wrote, to see what it really prints.
//
// The code is not trusted, so it runs in a separate Node process with the
// permission model on: it can't read or write files, open network
// connections, or start other programs. It also gets none of this process's
// environment (so no API key or database URL), little memory, and five
// seconds. The code is passed on stdin and never written to disk.

const TIMEOUT_MS = 5000;

/** Errors that mean "this example needs something the sandbox doesn't have", not "the example is wrong". */
const NEEDS_MORE = /ERR_ACCESS_DENIED|\b(document|window|navigator|localStorage|require|module|__dirname|alert|prompt) is not defined|Cannot find (module|package)/;

/** The permission model only blocks the network from Node 25 on. */
export const SANDBOXED =Number(process.versions.node.split(".")[0]) >= 25;

export function runBlock(block: RunnableBlock): BlockRun {
  // Without the full sandbox, untrusted code isn't run at all.
  if (!SANDBOXED) return { block, printed: null, problem: "running examples needs Node 25 or newer" };
  const result = spawnSync(
    process.execPath,
    ["--permission", "--no-warnings", "--max-old-space-size=128", `--input-type=${block.inputType}`, "-"],
    {
      input: block.code,
      encoding: "utf8",
      timeout: TIMEOUT_MS,
      maxBuffer: 200_000,
      cwd: tmpdir(),
      // Windows needs SystemRoot to start a process; nothing else is passed on.
      env: { SystemRoot: process.env.SystemRoot ?? "", NO_COLOR: "1" } as unknown as NodeJS.ProcessEnv,
      windowsHide: true,
    },
  );

  if (result.error) {
    const timedOut = (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT";
    return { block, printed: null, problem: timedOut ? "took longer than 5 seconds" : result.error.message };
  }
  if (result.status === 0) return { block, printed: result.stdout };

  const stderr = result.stderr ?? "";
  // The line that names the error, e.g. "TypeError: x is not a function".
  const reason = stderr.split("\n").find((line) => /^\w*Error\b/.test(line.trim()))?.trim() ?? `exit code ${result.status}`;
  if (NEEDS_MORE.test(stderr)) return { block, printed: null, problem: reason };
  // It crashed on its own: the lesson promised output this code doesn't give.
  return { block, printed: `${result.stdout}[crashed: ${reason}]` };
}
